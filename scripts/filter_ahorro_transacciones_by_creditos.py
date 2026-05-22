from __future__ import annotations

import json
import re
import csv
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
CLEAN_DIR = ROOT / "Datos_extraido_1" / "Cleaned_Data_1"

CREDIT_CSV = CLEAN_DIR / "Limpio_SabanaCred_Unificado_Mayo2026.csv"
SAVINGS_CSV = CLEAN_DIR / "Limpio_SabanaAhorro_Unificado_Trimestre.csv"
TRANSACTIONS_CSV = CLEAN_DIR / "Limpio_Trns_Unificado_Trimestre.csv"

SAVINGS_OUT = CLEAN_DIR / "Limpio_SabanaAhorro_Unificado_Trimestre_ClientesCredito.csv"
TRANSACTIONS_OUT = CLEAN_DIR / "Limpio_Trns_Unificado_Trimestre_ClientesCredito.csv"
REPORT_OUT = CLEAN_DIR / "Limpio_Ahorro_Trns_ClientesCredito_report.json"
SCHEMA_OUT = CLEAN_DIR / "schema_ahorro_transacciones_supabase.sql"

SAVINGS_DATE_COLUMNS = [
    "fecha_proceso",
    "fecha_aper",
    "fecha_ultmov",
    "fecha_ult_capi",
    "v_fecha_nac",
    "fecha_actualizacion",
]

SAVINGS_INTEGER_COLUMNS = [
    "v_ah_cliente",
    "v_ah_cuenta",
    "oficina_cta",
    "prod_bancario",
    "cooplinea",
    "tarjetas",
    "credito",
    "edad",
    "menor_edad",
]

SAVINGS_NUMERIC_COLUMNS = [
    "saldo_disponible",
    "monto_bloq",
    "ult_tasa_int",
    "tiene_bloqueos",
    "bloqueo_encaje",
    "v24h",
    "val_de_creditos",
    "val_de_debitos",
    "certificadosvalor",
    "ingresos",
    "egresos",
    "v12h",
    "v48h",
    "v72h_difer",
    "int_hoy",
    "int_acumulado",
    "saldo_int_decim",
]

SAVINGS_TEXT_COLUMNS = [
    "v_ah_nombre",
    "estado_cta",
    "tipo_cuenta",
    "nacionalidad",
    "sexo",
    "estado_civil",
]

TRANSACTION_DATE_COLUMNS = ["fecha_trn"]
TRANSACTION_INTEGER_COLUMNS = ["cuenta", "cliente", "causal_trn"]
TRANSACTION_NUMERIC_COLUMNS = ["valor_trn", "saldo_contable", "saldo_disponible"]
TRANSACTION_TEXT_COLUMNS = ["signo_nc_nd", "correccion"]


def normalize_text(value: object) -> object:
    if pd.isna(value):
        return pd.NA
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text if text else pd.NA


def parse_date_series(series: pd.Series) -> pd.Series:
    cleaned = series.map(normalize_text).astype("string")
    parsed = pd.to_datetime(cleaned, errors="coerce", format="%Y-%m-%d")

    missing = parsed.isna()
    if missing.any():
        parsed.loc[missing] = pd.to_datetime(
            cleaned.loc[missing], errors="coerce", format="%b %d %Y %I:%M%p"
        )

    missing = parsed.isna()
    if missing.any():
        parsed.loc[missing] = pd.to_datetime(cleaned.loc[missing], errors="coerce")

    return parsed.dt.strftime("%Y-%m-%d").astype("string").where(parsed.notna(), pd.NA)


def clean_numeric(series: pd.Series) -> pd.Series:
    cleaned = series.map(normalize_text).astype("string")
    cleaned = cleaned.str.replace(",", "", regex=False)
    return pd.to_numeric(cleaned, errors="coerce")


def normalize_client_id(series: pd.Series) -> pd.Series:
    numeric = clean_numeric(series)
    return numeric.round(0).astype("Int64").astype("string")


def read_savings_csv_with_thousands_repair(path: Path) -> tuple[pd.DataFrame, int]:
    rows = []
    repaired_rows = 0

    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        columns = next(reader)

        for raw_row in reader:
            if len(raw_row) == len(columns):
                rows.append(raw_row)
                continue

            repaired_rows += 1
            row = []
            index = 0
            for column in columns:
                if index >= len(raw_row):
                    row.append("")
                    continue

                value = raw_row[index]
                if column in SAVINGS_NUMERIC_COLUMNS:
                    parts = [value]
                    while (
                        index + 1 < len(raw_row)
                        and re.fullmatch(r"-?\d{1,3}", parts[-1].strip() or "")
                        and re.fullmatch(r"\d{3}(?:\.\d+)?", raw_row[index + 1].strip() or "")
                    ):
                        index += 1
                        parts.append(raw_row[index])
                        if "." in parts[-1]:
                            break
                    value = "".join(parts)

                row.append(value)
                index += 1

            rows.append(row[: len(columns)])

    return pd.DataFrame(rows, columns=columns, dtype="string"), repaired_rows


def clean_frame(
    frame: pd.DataFrame,
    date_columns: list[str],
    integer_columns: list[str],
    numeric_columns: list[str],
) -> tuple[pd.DataFrame, dict[str, dict[str, int]]]:
    invalid_dates = {}
    invalid_numbers = {}

    for column in frame.columns:
        frame[column] = frame[column].map(normalize_text).astype("string")

    for column in date_columns:
        raw_non_empty = frame[column].notna()
        frame[column] = parse_date_series(frame[column])
        invalid_dates[column] = int((raw_non_empty & frame[column].isna()).sum())

    for column in numeric_columns:
        raw_non_empty = frame[column].notna()
        frame[column] = clean_numeric(frame[column])
        invalid_numbers[column] = int((raw_non_empty & frame[column].isna()).sum())

    for column in integer_columns:
        raw_non_empty = frame[column].notna()
        frame[column] = clean_numeric(frame[column]).round(0).astype("Int64")
        invalid_numbers[column] = int((raw_non_empty & frame[column].isna()).sum())

    return frame, {"invalid_dates": invalid_dates, "invalid_numbers": invalid_numbers}


def sql_type_map(
    date_columns: list[str],
    integer_columns: list[str],
    numeric_columns: list[str],
    text_columns: list[str],
) -> dict[str, str]:
    return {
        **{column: "date" for column in date_columns},
        **{column: "bigint" for column in integer_columns},
        **{column: "numeric" for column in numeric_columns},
        **{column: "text" for column in text_columns},
    }


def table_schema(table_name: str, columns: list[str], types: dict[str, str]) -> str:
    definitions = [f'  "{column}" {types.get(column, "text")}' for column in columns]
    return "\n".join(
        [
            f"create table if not exists public.{table_name} (",
            ",\n".join(definitions),
            ");",
            "",
        ]
    )


def main() -> None:
    credit_clients = pd.read_csv(
        CREDIT_CSV, usecols=["nro_cliente"], dtype="string", encoding="utf-8", keep_default_na=False
    )
    credit_client_ids = set(normalize_client_id(credit_clients["nro_cliente"]).dropna())

    savings, savings_repaired_rows = read_savings_csv_with_thousands_repair(SAVINGS_CSV)
    transactions = pd.read_csv(
        TRANSACTIONS_CSV, dtype="string", encoding="utf-8", keep_default_na=False
    )

    savings_before = len(savings)
    transactions_before = len(transactions)

    savings_client_ids = normalize_client_id(savings["v_ah_cliente"])
    transaction_client_ids = normalize_client_id(transactions["cliente"])

    savings = savings.loc[savings_client_ids.isin(credit_client_ids)].copy()
    transactions = transactions.loc[transaction_client_ids.isin(credit_client_ids)].copy()

    savings, savings_validation = clean_frame(
        savings,
        SAVINGS_DATE_COLUMNS,
        SAVINGS_INTEGER_COLUMNS,
        SAVINGS_NUMERIC_COLUMNS,
    )
    transactions, transactions_validation = clean_frame(
        transactions,
        TRANSACTION_DATE_COLUMNS,
        TRANSACTION_INTEGER_COLUMNS,
        TRANSACTION_NUMERIC_COLUMNS,
    )

    savings.to_csv(SAVINGS_OUT, index=False, encoding="utf-8", na_rep="")
    transactions.to_csv(TRANSACTIONS_OUT, index=False, encoding="utf-8", na_rep="")

    savings_types = sql_type_map(
        SAVINGS_DATE_COLUMNS,
        SAVINGS_INTEGER_COLUMNS,
        SAVINGS_NUMERIC_COLUMNS,
        SAVINGS_TEXT_COLUMNS,
    )
    transaction_types = sql_type_map(
        TRANSACTION_DATE_COLUMNS,
        TRANSACTION_INTEGER_COLUMNS,
        TRANSACTION_NUMERIC_COLUMNS,
        TRANSACTION_TEXT_COLUMNS,
    )
    SCHEMA_OUT.write_text(
        table_schema("ahorros_clientes_credito", list(savings.columns), savings_types)
        + "\n"
        + table_schema("transacciones_clientes_credito", list(transactions.columns), transaction_types),
        encoding="utf-8",
    )

    report = {
        "credit_clients_unique": len(credit_client_ids),
        "savings": {
            "input_rows": int(savings_before),
            "output_rows": int(len(savings)),
            "removed_rows_without_credit_client": int(savings_before - len(savings)),
            "rows_repaired_for_unquoted_thousands": int(savings_repaired_rows),
            "unique_clients_output": int(savings["v_ah_cliente"].nunique(dropna=True)),
            **savings_validation,
            "output_csv": str(SAVINGS_OUT),
        },
        "transactions": {
            "input_rows": int(transactions_before),
            "output_rows": int(len(transactions)),
            "removed_rows_without_credit_client": int(transactions_before - len(transactions)),
            "unique_clients_output": int(transactions["cliente"].nunique(dropna=True)),
            **transactions_validation,
            "output_csv": str(TRANSACTIONS_OUT),
        },
        "schema_sql": str(SCHEMA_OUT),
    }
    REPORT_OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
