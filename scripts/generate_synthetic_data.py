from __future__ import annotations

import csv
import json
import random
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "Datos_extraido_1" / "Synthetic_Data_Corrected"
ROW_COUNT = 500
SEED = 20260521

CLIENT_COLUMNS = [
    "nro_socio",
    "nombre_socio",
    "sexo",
    "estado_civil",
    "fech_nacimiento",
    "ingresos_socio",
    "egresos_socio",
    "nivel_educa",
    "tipo_vivien",
    "nro_carga_fam",
    "tipo_vivien_orig",
    "ciudad_orig",
    "nro_credito",
]

CREDIT_COLUMNS = [
    "nro_operacion",
    "nro_socio",
    "qy_fechaproc",
    "nro_oficina",
    "tipo_operacion",
    "estado_op",
    "cod_destino_op",
    "destino_op",
    "cod_actividad",
    "actividad_socio",
    "fecha_concesion_op",
    "fecha_fin_op",
    "fecha_ult_pag",
    "monto_credito",
    "saldo_capital",
    "saldo_por_vencer",
    "saldo_no_devenga",
    "saldo_vencido",
    "int_normal",
    "int_devengado",
    "int_vencido",
    "int_resolucion",
    "int_castigado",
    "int_mora",
    "tipo_cartera",
    "plazo",
    "nro_cuotas",
    "tipo_plazo",
    "tasa_int_con",
    "tasa_int_vig",
    "tgarantia",
    "valgarantias",
    "fecha_garantias",
    "calificacion",
    "dia_pago",
    "dias_mora",
    "nro_cuotas_atra",
    "val_capd",
    "val_intd",
    "val_morad",
    "val_notd",
    "val_gnot2d",
    "val_intresd",
]

SAVINGS_COLUMNS = [
    "fecha_proceso",
    "nro_socio",
    "v_ah_cuenta",
    "fecha_aper",
    "fecha_ultmov",
    "oficina_cta",
    "estado_actual",
    "prod_bancario",
    "saldo_disponible",
    "monto_bloq",
    "ult_tasa_int",
    "tiene_bloqueos",
    "bloqueo_encaje",
    "v24h",
    "val_de_creditos",
    "val_de_debitos",
    "fecha_ult_capi",
    "tipo_cuenta",
    "cooplinea",
    "tarjetas",
    "credito",
    "fecha_actualizacion",
    "v12h",
    "v48h",
    "v72h_difer",
    "int_hoy",
    "int_acumulado",
    "saldo_int_decim",
]

TRANSACTION_COLUMNS = [
    "fecha_trn",
    "nro_socio",
    "cuenta",
    "signo_nc_nd",
    "valor_trn",
    "causal_trn",
    "correccion",
    "saldo_contable",
    "saldo_disponible",
]


def money(value: float) -> str:
    return f"{value:.2f}"


def iso_random_date(rng: random.Random, start: date, end: date) -> str:
    days = (end - start).days
    return (start + timedelta(days=rng.randint(0, days))).isoformat()


def write_csv(path: Path, columns: list[str], rows: list[dict[str, object]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def build_clients(rng: random.Random) -> list[dict[str, object]]:
    first_names_m = ["Carlos", "Luis", "Andres", "Jorge", "Miguel", "Diego", "Mateo", "Oscar"]
    first_names_f = ["Maria", "Ana", "Sofia", "Lucia", "Diana", "Paola", "Gabriela", "Camila"]
    last_names = ["Mendoza", "Vera", "Zambrano", "Cedeño", "Moreira", "Ponce", "Lopez", "Torres"]
    cities = ["Guayaquil", "Quito", "Cuenca", "Manta", "Portoviejo", "Machala", "Loja", "Ambato"]
    education = ["N", "P", "S", "U", "T"]
    housing = ["PROPIA", "FAMILIAR", "ARRENDADA", "HIPOTECADA"]
    civil_status = ["S", "C", "D", "V", "U"]

    clients = []
    for index in range(ROW_COUNT):
        sex = rng.choice(["M", "F"])
        first_name = rng.choice(first_names_m if sex == "M" else first_names_f)
        income = round(rng.uniform(420, 4200), 2)
        expenses = round(income * rng.uniform(0.28, 0.82), 2)
        clients.append(
            {
                "nro_socio": 2_000_000 + index,
                "nombre_socio": f"{first_name} {rng.choice(last_names)} {rng.choice(last_names)}",
                "sexo": sex,
                "estado_civil": rng.choice(civil_status),
                "fech_nacimiento": iso_random_date(rng, date(1955, 1, 1), date(2003, 12, 31)),
                "ingresos_socio": money(income),
                "egresos_socio": money(expenses),
                "nivel_educa": rng.choice(education),
                "tipo_vivien": rng.choice(housing),
                "nro_carga_fam": rng.randint(0, 5),
                "tipo_vivien_orig": rng.choice(housing),
                "ciudad_orig": rng.choice(cities),
                "nro_credito": 1,
            }
        )
    return clients


def build_credits(rng: random.Random, clients: list[dict[str, object]]) -> list[dict[str, object]]:
    rows = []
    destinations = [
        ("CT", "CAPITAL DE TRABAJO"),
        ("CV", "COMPRA DE VEHICULO"),
        ("ED", "EDUCACION"),
        ("MV", "MEJORA DE VIVIENDA"),
        ("RP", "PAGO DE DEUDAS VARIAS"),
    ]
    activities = [
        ("G471101", "VENTA AL POR MENOR EN COMERCIOS NO ESPECIALIZADOS"),
        ("H492201", "TRANSPORTE DE PASAJEROS POR CARRETERA"),
        ("I561001", "ACTIVIDADES DE RESTAURANTES Y SERVICIO MOVIL DE COMIDAS"),
        ("S960201", "PELUQUERIA Y OTROS TRATAMIENTOS DE BELLEZA"),
        ("A011301", "CULTIVO DE HORTALIZAS Y LEGUMBRES"),
    ]

    for index, client in enumerate(clients):
        amount = round(rng.uniform(800, 35_000), 2)
        paid_ratio = rng.uniform(0.05, 0.85)
        balance = round(amount * (1 - paid_ratio), 2)
        overdue_days = rng.choices([0, rng.randint(1, 30), rng.randint(31, 120)], weights=[0.72, 0.2, 0.08], k=1)[0]
        dest_code, destination = rng.choice(destinations)
        activity_code, activity = rng.choice(activities)
        grant_date = date.fromisoformat(iso_random_date(rng, date(2022, 1, 1), date(2026, 4, 30)))
        term = rng.choice([12, 18, 24, 36, 48, 60, 72])
        end_date = grant_date + timedelta(days=term * 30)
        rate = round(rng.uniform(9.5, 19.9), 2)
        overdue_balance = round(balance * rng.uniform(0.05, 0.25), 2) if overdue_days else 0.0

        rows.append(
            {
                "nro_operacion": 9_000_000_000 + index,
                "nro_socio": client["nro_socio"],
                "qy_fechaproc": "2026-05-18",
                "nro_oficina": rng.choice([5, 20, 41, 48, 60, 69]),
                "tipo_operacion": rng.choice(["PFMC", "PFSC", "CRVIVIENDA", "MICROCRED"]),
                "estado_op": rng.choices(["VIGENTE", "VENCIDO", "CASTIGADO"], weights=[0.86, 0.11, 0.03], k=1)[0],
                "cod_destino_op": dest_code,
                "destino_op": destination,
                "cod_actividad": activity_code,
                "actividad_socio": activity,
                "fecha_concesion_op": grant_date.isoformat(),
                "fecha_fin_op": end_date.isoformat(),
                "fecha_ult_pag": iso_random_date(rng, grant_date, date(2026, 5, 18)),
                "monto_credito": money(amount),
                "saldo_capital": money(balance),
                "saldo_por_vencer": money(max(balance - overdue_balance, 0)),
                "saldo_no_devenga": money(round(balance * 0.03, 2) if overdue_days > 30 else 0),
                "saldo_vencido": money(overdue_balance),
                "int_normal": money(round(balance * rate / 1200, 2)),
                "int_devengado": money(round(balance * rate / 1200, 2)),
                "int_vencido": money(round(overdue_balance * rate / 1200, 2)),
                "int_resolucion": money(0),
                "int_castigado": money(round(overdue_balance * 0.04, 2) if overdue_days > 90 else 0),
                "int_mora": money(round(overdue_balance * 0.02, 2) if overdue_days else 0),
                "tipo_cartera": rng.choice(["CONSUMO", "MICROCREDITO", "INMOBILIARIO"]),
                "plazo": term,
                "nro_cuotas": term,
                "tipo_plazo": "M",
                "tasa_int_con": rate,
                "tasa_int_vig": rate,
                "tgarantia": rng.choice(["PAG", "QUI", "VIV"]),
                "valgarantias": money(amount * rng.uniform(0.8, 2.5)),
                "fecha_garantias": grant_date.isoformat(),
                "calificacion": rng.choices(["A1", "A2", "B1", "C1", "D", "E"], weights=[0.55, 0.2, 0.12, 0.08, 0.03, 0.02], k=1)[0],
                "dia_pago": rng.randint(1, 28),
                "dias_mora": overdue_days,
                "nro_cuotas_atra": min(term, overdue_days // 30),
                "val_capd": money(overdue_balance),
                "val_intd": money(round(overdue_balance * rate / 1200, 2)),
                "val_morad": money(round(overdue_balance * 0.02, 2) if overdue_days else 0),
                "val_notd": money(0),
                "val_gnot2d": money(round(overdue_balance * 0.005, 2) if overdue_days else 0),
                "val_intresd": money(0),
            }
        )
    return rows


def build_savings(rng: random.Random, clients: list[dict[str, object]]) -> list[dict[str, object]]:
    rows = []
    for index, client in enumerate(clients):
        available = round(rng.uniform(0, 18_000), 2)
        blocked = round(available * rng.uniform(0, 0.2), 2)
        rows.append(
            {
                "fecha_proceso": "2026-05-18",
                "nro_socio": client["nro_socio"],
                "v_ah_cuenta": 4_000_000 + index,
                "fecha_aper": iso_random_date(rng, date(2018, 1, 1), date(2026, 4, 30)),
                "fecha_ultmov": iso_random_date(rng, date(2026, 3, 1), date(2026, 5, 18)),
                "oficina_cta": rng.choice([5, 20, 41, 48, 60, 69]),
                "estado_actual": rng.choices(["A", "I"], weights=[0.94, 0.06], k=1)[0],
                "prod_bancario": rng.choice([1, 10, 20]),
                "saldo_disponible": money(available),
                "monto_bloq": money(blocked),
                "ult_tasa_int": money(rng.choice([0.6, 1.0, 1.5, 2.0])),
                "tiene_bloqueos": 1 if blocked > 0 else 0,
                "bloqueo_encaje": money(round(blocked * 0.1, 2)),
                "v24h": money(rng.uniform(0, 1600)),
                "val_de_creditos": money(rng.uniform(0, 4000)),
                "val_de_debitos": money(rng.uniform(0, 3800)),
                "fecha_ult_capi": "2026-05-18",
                "tipo_cuenta": rng.choice(["AHORROS", "CUENTA BASICA", "EL CENTAVITO"]),
                "cooplinea": rng.choice([0, 1]),
                "tarjetas": rng.choice([0, 1]),
                "credito": 1,
                "fecha_actualizacion": iso_random_date(rng, date(2025, 1, 1), date(2026, 5, 18)),
                "v12h": money(rng.uniform(0, 900)),
                "v48h": money(rng.uniform(0, 2400)),
                "v72h_difer": money(rng.uniform(0, 1200)),
                "int_hoy": money(available * rng.uniform(0, 0.0002)),
                "int_acumulado": money(available * rng.uniform(0, 0.02)),
                "saldo_int_decim": money(available * rng.uniform(0, 0.005)),
            }
        )
    return rows


def build_transactions(rng: random.Random, clients: list[dict[str, object]], savings: list[dict[str, object]]) -> list[dict[str, object]]:
    savings_by_client = {row["nro_socio"]: row for row in savings}
    rows = []
    for _ in range(ROW_COUNT):
        client = rng.choice(clients)
        savings_row = savings_by_client[client["nro_socio"]]
        sign = rng.choice(["C", "D"])
        amount = round(rng.uniform(2, 2500), 2)
        available = float(savings_row["saldo_disponible"])
        balance = available + amount if sign == "C" else max(available - amount, 0)
        rows.append(
            {
                "fecha_trn": iso_random_date(rng, date(2026, 3, 1), date(2026, 5, 18)),
                "nro_socio": client["nro_socio"],
                "cuenta": savings_row["v_ah_cuenta"],
                "signo_nc_nd": sign,
                "valor_trn": money(amount),
                "causal_trn": rng.choice([1, 2, 5, 8, 12, 21, 33]),
                "correccion": rng.choices(["N", "S"], weights=[0.98, 0.02], k=1)[0],
                "saldo_contable": money(balance),
                "saldo_disponible": money(max(balance - rng.uniform(0, 50), 0)),
            }
        )
    return rows


def main() -> None:
    rng = random.Random(SEED)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    clients = build_clients(rng)
    credits = build_credits(rng, clients)
    savings = build_savings(rng, clients)
    transactions = build_transactions(rng, clients, savings)

    outputs = {
        "clientes": OUTPUT_DIR / "synthetic_clientes_500.csv",
        "creditos": OUTPUT_DIR / "synthetic_creditos_500.csv",
        "ahorro": OUTPUT_DIR / "synthetic_ahorro_500.csv",
        "transacciones": OUTPUT_DIR / "synthetic_transacciones_500.csv",
    }

    write_csv(outputs["clientes"], CLIENT_COLUMNS, clients)
    write_csv(outputs["creditos"], CREDIT_COLUMNS, credits)
    write_csv(outputs["ahorro"], SAVINGS_COLUMNS, savings)
    write_csv(outputs["transacciones"], TRANSACTION_COLUMNS, transactions)

    report = {
        "seed": SEED,
        "rows_per_file": ROW_COUNT,
        "outputs": {name: str(path) for name, path in outputs.items()},
        "relationship_key": "nro_socio",
        "client_only_fields": [
            "nombre_socio",
            "sexo",
            "estado_civil",
            "fech_nacimiento",
            "ingresos_socio",
            "egresos_socio",
            "nivel_educa",
            "tipo_vivien",
            "nro_carga_fam",
            "tipo_vivien_orig",
            "ciudad_orig",
            "nro_credito",
        ],
    }
    report_path = OUTPUT_DIR / "synthetic_data_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
