from __future__ import annotations

import csv
import json
import random
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "Datos_extraido_1" / "Synthetic_Data_Corrected"
OUTPUT_DIR = ROOT / "Datos_extraido_1" / "Synthetic_Data_Balanced"
SEED = 20260522


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]], columns: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def money(value: float) -> str:
    return f"{max(value, 0):.2f}"


def as_float(value: str, fallback: float = 0) -> float:
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return fallback


def profile_for_index(index: int) -> str:
    if index < 190:
        return "bajo_preventivo"
    if index < 330:
        return "medio_preventivo"
    if index < 440:
        return "alto_preventivo"
    return "mora_actual"


def client_id(row: dict[str, str]) -> str:
    return str(row.get("nro_socio") or row.get("nro_cliente") or row.get("v_ah_cliente") or "").replace(".0", "")


def days_since(value: str) -> int:
    if not value:
        return 999
    try:
        parsed = date.fromisoformat(str(value)[:10])
    except ValueError:
        return 999
    return max(0, (date.today() - parsed).days)


def movement_stats(transactions: list[dict[str, str]]) -> dict[str, float]:
    sorted_rows = sorted(transactions, key=lambda row: row.get("fecha_trn", ""), reverse=True)
    amounts = [abs(as_float(row.get("valor_trn", "0"))) for row in sorted_rows]
    total = sum(amounts)
    midpoint = (len(sorted_rows) + 1) // 2
    recent_amount = sum(amounts[:midpoint])
    previous_amount = sum(amounts[midpoint:])
    credit_count = sum(1 for row in sorted_rows if "C" in row.get("signo_nc_nd", "").upper())
    debit_count = sum(1 for row in sorted_rows if "D" in row.get("signo_nc_nd", "").upper())
    latest = sorted_rows[0] if sorted_rows else {}
    previous = sorted_rows[1] if len(sorted_rows) > 1 else latest

    return {
        "count": len(sorted_rows),
        "total": total,
        "average": total / len(sorted_rows) if sorted_rows else 0,
        "current_balance": as_float(latest.get("saldo_disponible") or latest.get("saldo_contable")),
        "previous_balance": as_float(previous.get("saldo_disponible") or previous.get("saldo_contable") or latest.get("saldo_disponible")),
        "movement_variation": (credit_count - debit_count) / len(sorted_rows) if sorted_rows else 0,
        "amount_variation": (recent_amount - previous_amount) / previous_amount if previous_amount else recent_amount,
    }


def build_model_features(
    operation: dict[str, str],
    client: dict[str, str],
    saving: dict[str, str],
    transactions: list[dict[str, str]],
) -> dict[str, float | str]:
    movement = movement_stats(transactions)
    monto_credito = as_float(operation.get("monto_credito"))
    saldo_capital = as_float(operation.get("saldo_capital"))
    plazo = as_float(operation.get("plazo") or operation.get("nro_cuotas"), 1)
    nro_cuotas = as_float(operation.get("nro_cuotas"), plazo or 1)
    cuotas_atrasadas = as_float(operation.get("nro_cuotas_atra"))
    dias_mora = as_float(operation.get("dias_mora") or operation.get("mora"))
    saldo_actual = movement["current_balance"] or as_float(saving.get("saldo_disponible"))
    saldo_anterior = movement["previous_balance"] or saldo_actual

    return {
        "monto_credito": monto_credito,
        "saldo_pendiente": saldo_capital,
        "plazo": plazo,
        "dias_atraso_actual": dias_mora,
        "numero_cuotas_pendientes": max(0, nro_cuotas - cuotas_atrasadas),
        "numero_cuotas_atrasadas": cuotas_atrasadas,
        "promedio_dias_atraso": dias_mora,
        "max_dias_atraso": dias_mora,
        "numero_pagos_tarde": 1 if dias_mora > 0 else 0,
        "porcentaje_pagos_tarde": min(1, cuotas_atrasadas / nro_cuotas) if nro_cuotas else 0,
        "ultimo_pago_tarde": 1 if dias_mora > 0 else 0,
        "dias_desde_ultimo_pago": days_since(operation.get("fecha_ult_pag", "")),
        "saldo_actual": saldo_actual,
        "saldo_anterior": saldo_anterior,
        "variacion_saldo_limpia": saldo_actual - saldo_anterior,
        "numero_transacciones": movement["count"],
        "monto_total_movido": movement["total"],
        "monto_promedio_transaccion": movement["average"],
        "variacion_movimientos": movement["movement_variation"],
        "variacion_monto_movido": movement["amount_variation"],
        "nro_cargas_fam": as_float(client.get("nro_carga_fam") or client.get("nro_cargas_fam")),
        "estado_civil": client.get("estado_civil") or saving.get("estado_civil") or "NO REGISTRADO",
        "nivel_educa": client.get("nivel_educa") or "NO REGISTRADO",
        "estado_op": operation.get("estado_op") or "NO REGISTRADO",
    }


def tune_medium_rows_with_model(
    rng: random.Random,
    clients: list[dict[str, str]],
    credits: list[dict[str, str]],
    savings_by_client: dict[str, dict[str, str]],
    transactions_by_client: dict[str, list[dict[str, str]]],
) -> dict[str, int | str]:
    try:
        import joblib
        import pandas as pd
    except ImportError:
        return {"status": "skipped", "medium_rows": 0}

    model_path = ROOT / "backend" / "models" / "modelo_mora_v6_umbral_0782.pkl"
    if not model_path.exists():
        return {"status": "model_missing", "medium_rows": 0}

    model = joblib.load(model_path)["modelo"]
    medium_rows = 0

    for index in range(190, 330):
        client = clients[index]
        credit = credits[index]
        saving = savings_by_client[client["nro_socio"]]
        transactions = transactions_by_client.setdefault(client["nro_socio"], [])
        best_probability = -1.0
        best_state: tuple[dict[str, str], dict[str, str], dict[str, str], list[dict[str, str]]] | None = None

        for _ in range(80):
            candidate_client = dict(client)
            candidate_credit = dict(credit)
            candidate_saving = dict(saving)
            candidate_transactions: list[dict[str, str]] = []

            amount = rng.uniform(8000, 34000)
            balance = amount * rng.uniform(0.28, 0.82)
            available = rng.choice([
                rng.uniform(25, 850),
                rng.uniform(1800, 5600),
                rng.uniform(12000, 23500),
            ])
            plazo = rng.choice([12, 24, 36, 48, 60])
            nro_cuotas = rng.choice([12, 18, 24, 36, 48, 60])
            tx_count = rng.choice([0, 2, 4, 6, 8])
            latest_balance = available
            previous_balance = max(0, latest_balance + rng.uniform(-650, 650))

            candidate_client["estado_civil"] = rng.choice(["S", "C", "V", "U", "D"])
            candidate_client["nivel_educa"] = rng.choice(["P", "S", "T", "U"])
            candidate_client["nro_carga_fam"] = str(rng.randint(1, 5))
            candidate_client["ingresos_socio"] = money(rng.uniform(900, 3600))
            candidate_client["egresos_socio"] = money(as_float(candidate_client["ingresos_socio"]) * rng.uniform(0.48, 0.82))

            candidate_credit["monto_credito"] = money(amount)
            candidate_credit["saldo_capital"] = money(balance)
            candidate_credit["saldo_por_vencer"] = money(balance)
            candidate_credit["saldo_vencido"] = "0.00"
            candidate_credit["dias_mora"] = "0"
            candidate_credit["nro_cuotas_atra"] = "0"
            candidate_credit["val_capd"] = "0.00"
            candidate_credit["val_morad"] = "0.00"
            candidate_credit["int_mora"] = "0.00"
            candidate_credit["estado_op"] = "VIGENTE"
            candidate_credit["calificacion"] = rng.choice(["A2", "B1", "B2"])
            candidate_credit["plazo"] = str(plazo)
            candidate_credit["nro_cuotas"] = str(nro_cuotas)
            candidate_credit["fecha_ult_pag"] = (date.today() - timedelta(days=rng.choice([30, 90, 180, 365, 999]))).isoformat()

            candidate_saving["saldo_disponible"] = money(available)
            candidate_saving["val_de_creditos"] = money(available * rng.uniform(0.15, 0.85))
            candidate_saving["val_de_debitos"] = money(available * rng.uniform(0.25, 1.25))
            candidate_saving["monto_bloq"] = money(available * rng.uniform(0.02, 0.18))

            for tx_index in range(tx_count):
                is_latest = tx_index == 0
                balance_for_tx = latest_balance if is_latest else previous_balance if tx_index == 1 else max(0, latest_balance + rng.uniform(-900, 900))
                candidate_transactions.append(
                    {
                        "fecha_trn": (date.today() - timedelta(days=tx_index * 5 + 1)).isoformat(),
                        "nro_socio": client["nro_socio"],
                        "cuenta": saving["v_ah_cuenta"],
                        "signo_nc_nd": rng.choice(["C", "D"]),
                        "valor_trn": money(rng.uniform(80, 900)),
                        "causal_trn": str(rng.choice([1, 2, 8, 33])),
                        "correccion": "N",
                        "saldo_contable": money(balance_for_tx),
                        "saldo_disponible": money(max(0, balance_for_tx - rng.uniform(0, 35))),
                    }
                )

            features = build_model_features(candidate_credit, candidate_client, candidate_saving, candidate_transactions)
            probability = float(model.predict_proba(pd.DataFrame([features]))[0][1])
            distance = abs(probability - 0.5)
            if best_state is None or distance < abs(best_probability - 0.5):
                best_probability = probability
                best_state = (candidate_client, candidate_credit, candidate_saving, candidate_transactions)
            if 0.4 <= probability < 0.6:
                break

        if best_state is None:
            continue

        tuned_client, tuned_credit, tuned_saving, tuned_transactions = best_state
        client.update(tuned_client)
        credit.update(tuned_credit)
        saving.update(tuned_saving)
        transactions_by_client[client["nro_socio"]] = tuned_transactions
        if 0.4 <= best_probability < 0.6:
            medium_rows += 1

    return {"status": "ok", "medium_rows": medium_rows}


def tune_rows() -> dict[str, object]:
    rng = random.Random(SEED)
    clients = read_csv(SOURCE_DIR / "synthetic_clientes_500.csv")
    credits = read_csv(SOURCE_DIR / "synthetic_creditos_500.csv")
    savings = read_csv(SOURCE_DIR / "synthetic_ahorro_500.csv")
    transactions = read_csv(SOURCE_DIR / "synthetic_transacciones_500.csv")

    savings_by_client = {row["nro_socio"]: row for row in savings}
    transactions_by_client: dict[str, list[dict[str, str]]] = {}
    for row in transactions:
        transactions_by_client.setdefault(row["nro_socio"], []).append(row)

    profile_counts: dict[str, int] = {}

    for index, (client, credit) in enumerate(zip(clients, credits)):
        profile = profile_for_index(index)
        profile_counts[profile] = profile_counts.get(profile, 0) + 1
        client_id = client["nro_socio"]
        saving = savings_by_client[client_id]
        amount = as_float(credit["monto_credito"], rng.uniform(1000, 30000))

        if profile == "bajo_preventivo":
            income = rng.uniform(2200, 6200)
            expense_ratio = rng.uniform(0.22, 0.48)
            balance_ratio = rng.uniform(0.12, 0.42)
            available = rng.uniform(2500, 22000)
            overdue_days = 0
            overdue_balance = 0
            cuotas_atrasadas = 0
            calificacion = rng.choice(["A1", "A2"])
            day_pay = rng.randint(12, 28)
            status = "VIGENTE"
        elif profile == "medio_preventivo":
            amount = rng.uniform(8500, 32000)
            income = rng.uniform(950, 3300)
            expense_ratio = rng.uniform(0.46, 0.78)
            balance_ratio = rng.uniform(0.30, 0.78)
            available = rng.choice([
                rng.uniform(30, 750),
                rng.uniform(2500, 5200),
                rng.uniform(14000, 23000),
            ])
            overdue_days = 0
            overdue_balance = 0
            cuotas_atrasadas = 0
            calificacion = rng.choice(["A2", "B1", "B2"])
            day_pay = rng.randint(5, 18)
            status = "VIGENTE"
            client["estado_civil"] = rng.choice(["S", "C", "V", "U"])
            client["nivel_educa"] = rng.choice(["P", "S", "T", "U"])
            credit["plazo"] = str(rng.choice([24, 36, 48, 60]))
            credit["nro_cuotas"] = str(rng.choice([18, 24, 36, 48, 60]))
        elif profile == "alto_preventivo":
            income = rng.uniform(430, 1800)
            expense_ratio = rng.uniform(0.72, 0.96)
            balance_ratio = rng.uniform(0.70, 0.96)
            available = rng.uniform(0, 650)
            overdue_days = 0
            overdue_balance = 0
            cuotas_atrasadas = 0
            calificacion = rng.choice(["B1", "C1", "D"])
            day_pay = rng.randint(1, 9)
            status = "VIGENTE"
        else:
            income = rng.uniform(500, 2600)
            expense_ratio = rng.uniform(0.62, 0.98)
            balance_ratio = rng.uniform(0.45, 0.94)
            available = rng.uniform(0, 2200)
            overdue_days = rng.randint(5, 95)
            overdue_balance = amount * balance_ratio * rng.uniform(0.08, 0.32)
            cuotas_atrasadas = max(1, min(5, overdue_days // 20))
            calificacion = rng.choice(["C1", "D", "E"])
            day_pay = rng.randint(1, 28)
            status = rng.choice(["VIGENTE", "VENCIDO"])

        expenses = income * expense_ratio
        balance = amount * balance_ratio

        credit["monto_credito"] = money(amount)
        client["ingresos_socio"] = money(income)
        client["egresos_socio"] = money(expenses)
        client["nro_carga_fam"] = str(rng.randint(0, 5))

        credit["estado_op"] = status
        credit["saldo_capital"] = money(balance)
        credit["saldo_por_vencer"] = money(balance - overdue_balance)
        credit["saldo_vencido"] = money(overdue_balance)
        credit["dias_mora"] = str(overdue_days)
        credit["nro_cuotas_atra"] = str(cuotas_atrasadas)
        credit["calificacion"] = calificacion
        credit["dia_pago"] = str(day_pay)
        credit["val_capd"] = money(overdue_balance)
        credit["val_morad"] = money(overdue_balance * 0.02 if overdue_days else 0)
        credit["int_mora"] = money(overdue_balance * 0.02 if overdue_days else 0)

        saving["saldo_disponible"] = money(available)
        saving["val_de_creditos"] = money(available * rng.uniform(0.15, 0.9))
        saving["val_de_debitos"] = money(available * rng.uniform(0.18, 1.15))
        saving["monto_bloq"] = money(available * (0.02 if profile == "bajo_preventivo" else rng.uniform(0.03, 0.25)))
        saving["tiene_bloqueos"] = "1" if as_float(saving["monto_bloq"]) > 0 else "0"

        base_balance = available
        existing_transactions = transactions_by_client.get(client_id, [])
        if not existing_transactions:
            existing_transactions = []
            for tx_index in range(3):
                existing_transactions.append(
                    {
                        "fecha_trn": (date(2026, 5, 18) - timedelta(days=tx_index * 7)).isoformat(),
                        "nro_socio": client_id,
                        "cuenta": saving["v_ah_cuenta"],
                        "signo_nc_nd": "C",
                        "valor_trn": "0.00",
                        "causal_trn": "1",
                        "correccion": "N",
                        "saldo_contable": money(base_balance),
                        "saldo_disponible": money(base_balance),
                    }
                )
            transactions_by_client[client_id] = existing_transactions
        elif profile == "medio_preventivo":
            target_count = rng.choice([4, 6, 8])
            existing_transactions[:] = existing_transactions[:target_count]
            while len(existing_transactions) < target_count:
                existing_transactions.append(
                    {
                        "fecha_trn": date(2026, 5, 18).isoformat(),
                        "nro_socio": client_id,
                        "cuenta": saving["v_ah_cuenta"],
                        "signo_nc_nd": "C",
                        "valor_trn": "0.00",
                        "causal_trn": "1",
                        "correccion": "N",
                        "saldo_contable": money(base_balance),
                        "saldo_disponible": money(base_balance),
                    }
                )

        for tx_index, tx in enumerate(existing_transactions):
            if profile == "bajo_preventivo":
                sign = rng.choices(["C", "D"], weights=[0.68, 0.32], k=1)[0]
                value = rng.uniform(80, 1800)
            elif profile == "medio_preventivo":
                sign = rng.choices(["C", "D"], weights=[0.42, 0.58], k=1)[0]
                value = rng.uniform(80, 900)
            elif profile == "alto_preventivo":
                sign = rng.choices(["C", "D"], weights=[0.28, 0.72], k=1)[0]
                value = rng.uniform(30, 650)
            else:
                sign = rng.choices(["C", "D"], weights=[0.38, 0.62], k=1)[0]
                value = rng.uniform(15, 850)

            base_balance = base_balance + value if sign == "C" else max(base_balance - value, 0)
            tx["fecha_trn"] = (date(2026, 5, 18) - timedelta(days=rng.randint(1, 75))).isoformat()
            tx["cuenta"] = saving["v_ah_cuenta"]
            tx["signo_nc_nd"] = sign
            tx["valor_trn"] = money(value)
            tx["saldo_contable"] = money(base_balance)
            tx["saldo_disponible"] = money(max(base_balance - rng.uniform(0, 40), 0))

    calibration = tune_medium_rows_with_model(rng, clients, credits, savings_by_client, transactions_by_client)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    transactions = [
        row
        for client_transactions in transactions_by_client.values()
        for row in client_transactions
    ]
    write_csv(OUTPUT_DIR / "synthetic_clientes_500.csv", clients, list(clients[0].keys()))
    write_csv(OUTPUT_DIR / "synthetic_creditos_500.csv", credits, list(credits[0].keys()))
    write_csv(OUTPUT_DIR / "synthetic_ahorro_500.csv", savings, list(savings[0].keys()))
    write_csv(OUTPUT_DIR / "synthetic_transacciones_500.csv", transactions, list(transactions[0].keys()))

    report = {
        "seed": SEED,
        "source_dir": str(SOURCE_DIR),
        "output_dir": str(OUTPUT_DIR),
        "profiles": profile_counts,
        "model_calibration": calibration,
        "notes": [
            "bajo_preventivo, medio_preventivo y alto_preventivo tienen dias_mora, saldo_vencido y cuotas_atrasadas en cero.",
            "mora_actual contiene operaciones con atraso real y debe usarse en una tabla separada de cobranza.",
            "La distribucion final del modelo puede variar porque depende de los .pkl de la API predictiva."
        ]
    }
    (OUTPUT_DIR / "synthetic_balanced_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return report


if __name__ == "__main__":
    print(json.dumps(tune_rows(), ensure_ascii=False, indent=2))
