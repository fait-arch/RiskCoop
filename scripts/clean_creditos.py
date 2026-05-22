from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / "Datos_extraido_1" / "Datos"
OUTPUT_DIR = ROOT / "Datos_extraido_1" / "Cleaned_Data_1"
OUTPUT_CSV = OUTPUT_DIR / "Limpio_SabanaCred_Unificado_Mayo2026.csv"
OUTPUT_REPORT = OUTPUT_DIR / "Limpio_SabanaCred_Unificado_Mayo2026_report.json"
OUTPUT_SCHEMA = OUTPUT_DIR / "schema_creditos_supabase.sql"

DATE_COLUMNS = [
    "qy_fechaproc",
    "fecha_concesion_op",
    "fecha_fin_op",
    "fecha_ult_pag",
    "fecha_garantias",
    "fech_nacimiento",
    "fech_ult_viv",
    "fech_utl_tra",
]

INTEGER_COLUMNS = [
    "nro_operacion",
    "nro_cliente",
    "nro_oficina",
    "plazo",
    "nro_cuotas",
    "dia_pago",
    "dias_mora",
    "nro_cuotas_atra",
    "nro_cargas_fam",
    "nro_creditos",
    "cidudad_orig",
]

NUMERIC_COLUMNS = [
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
    "tasa_int_con",
    "tasa_int_vig",
    "valgarantias",
    "ingresos_socio",
    "egresos_socio",
    "val_capd",
    "val_intd",
    "val_morad",
    "val_notd",
    "val_gnot2d",
    "val_intresd",
]

TEXT_COLUMNS = [
    "nombres_socio",
    "tipo_operacion",
    "estado_op",
    "cod_destino_op",
    "destino_op",
    "cod_actividad",
    "actividad_socio",
    "tipo_cartera",
    "tipo_plazo",
    "tgarantia",
    "calificacion",
    "sexo",
    "estado_civil",
    "nivel_educa",
    "tipo_vivien",
]

SQL_TYPES = {
    **{column: "date" for column in DATE_COLUMNS},
    **{column: "bigint" for column in INTEGER_COLUMNS},
    **{column: "numeric" for column in NUMERIC_COLUMNS},
    **{column: "text" for column in TEXT_COLUMNS},
}


def normalize_text(value: object) -> object:
    if pd.isna(value):
        return pd.NA
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text if text else pd.NA


def parse_date_series(series: pd.Series) -> pd.Series:
    cleaned = series.map(normalize_text)
    # Some source rows concatenate two SQL Server style timestamps. Keep the first.
    cleaned = cleaned.astype("string").str.extract(
        r"^([A-Za-z]{3}\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2}[AP]M|\d{1,2}/\d{1,2}/\d{4}(?:\s+\d{2}:\d{2}:\d{2})?)",
        expand=False,
    ).fillna(cleaned)

    parsed_us = pd.to_datetime(cleaned, errors="coerce", format="%m/%d/%Y %H:%M:%S")
    missing = parsed_us.isna()
    if missing.any():
        parsed_us.loc[missing] = pd.to_datetime(
            cleaned.loc[missing], errors="coerce", format="%m/%d/%Y"
        )

    missing = parsed_us.isna()
    if missing.any():
        parsed_us.loc[missing] = pd.to_datetime(
            cleaned.loc[missing], errors="coerce", format="%b %d %Y %I:%M%p"
        )

    missing = parsed_us.isna()
    if missing.any():
        parsed_us.loc[missing] = pd.to_datetime(cleaned.loc[missing], errors="coerce")

    return parsed_us.dt.strftime("%Y-%m-%d").astype("string").where(parsed_us.notna(), pd.NA)


def clean_numeric(series: pd.Series) -> pd.Series:
    cleaned = series.map(normalize_text).astype("string")
    cleaned = cleaned.str.replace(",", "", regex=False)
    return pd.to_numeric(cleaned, errors="coerce")


def write_schema(columns: list[str]) -> None:
    definitions = []
    for column in columns:
        sql_type = SQL_TYPES.get(column, "text")
        nullable = " not null" if column == "nro_operacion" else ""
        definitions.append(f'  "{column}" {sql_type}{nullable}')

    schema = "\n".join(
        [
            "create table if not exists public.creditos (",
            ",\n".join(definitions),
            ',\n  constraint creditos_nro_operacion_key unique ("nro_operacion")',
            ");",
            "",
        ]
    )
    OUTPUT_SCHEMA.write_text(schema, encoding="utf-8")


def main() -> None:
    files = sorted(INPUT_DIR.glob("DataSabanaCred*Mayo2026.csv"))
    if not files:
        raise FileNotFoundError(f"No se encontraron CSV de creditos en {INPUT_DIR}")

    frames = []
    input_rows_by_file = {}
    for file in files:
        frame = pd.read_csv(file, dtype="string", encoding="utf-8", keep_default_na=False)
        frame["_archivo_origen"] = file.name
        frames.append(frame)
        input_rows_by_file[file.name] = int(len(frame))

    data = pd.concat(frames, ignore_index=True)
    original_columns = [column for column in data.columns if not column.startswith("_")]

    for column in original_columns:
        data[column] = data[column].map(normalize_text).astype("string")

    invalid_dates = {}
    for column in DATE_COLUMNS:
        raw_non_empty = data[column].notna()
        data[column] = parse_date_series(data[column])
        invalid_dates[column] = int((raw_non_empty & data[column].isna()).sum())

    invalid_numbers = {}
    for column in NUMERIC_COLUMNS:
        raw_non_empty = data[column].notna()
        data[column] = clean_numeric(data[column])
        invalid_numbers[column] = int((raw_non_empty & data[column].isna()).sum())

    for column in INTEGER_COLUMNS:
        data[column] = data[column].round(0).astype("Int64")

    data["_fecha_proceso_sort"] = pd.to_datetime(data["qy_fechaproc"], errors="coerce")
    data["_row_order"] = range(len(data))

    before_dedupe = len(data)
    exact_duplicate_rows = int(data[original_columns].duplicated().sum())
    duplicated_operations = int(data.duplicated(subset=["nro_operacion"]).sum())

    data = data.sort_values(["nro_operacion", "_fecha_proceso_sort", "_row_order"])
    data = data.drop_duplicates(subset=["nro_operacion"], keep="last")
    data = data.sort_values(["_fecha_proceso_sort", "nro_operacion"], ascending=[False, True])

    clean = data[original_columns].copy()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clean.to_csv(OUTPUT_CSV, index=False, encoding="utf-8", na_rep="")
    write_schema(original_columns)

    report = {
        "input_files": [file.name for file in files],
        "input_rows_by_file": input_rows_by_file,
        "input_rows_total": int(before_dedupe),
        "exact_duplicate_rows": exact_duplicate_rows,
        "duplicated_operations_removed": duplicated_operations,
        "output_rows": int(len(clean)),
        "output_columns": int(len(clean.columns)),
        "dedupe_rule": "nro_operacion: conserva la fila con qy_fechaproc mas reciente",
        "invalid_dates_after_cleaning": invalid_dates,
        "invalid_numbers_after_cleaning": invalid_numbers,
        "output_csv": str(OUTPUT_CSV),
        "schema_sql": str(OUTPUT_SCHEMA),
    }
    OUTPUT_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
