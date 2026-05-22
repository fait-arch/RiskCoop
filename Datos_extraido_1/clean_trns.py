#!/usr/bin/env python3
import os
import sys
import csv
import argparse
import tempfile
import glob
import time

def detect_encoding(file_path):
    encodings = ["utf-8", "latin1", "cp1252"]
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                f.readline()
            return enc
        except (UnicodeDecodeError, PermissionError):
            continue
    return "utf-8"

def clean_csv_file(file_path, inplace=True):
    if not os.path.exists(file_path):
        print(f"Error: El archivo '{file_path}' no existe.")
        return False

    print(f"Procesando: {file_path}...")
    encoding = detect_encoding(file_path)
    
    # Read the header to find the indexes of cuenta and cliente
    try:
        with open(file_path, "r", encoding=encoding, errors="ignore") as f:
            reader = csv.reader(f)
            header = next(reader)
    except Exception as e:
        print(f"  Error al leer cabecera: {e}")
        return False

    if "cuenta" not in header and "cliente" not in header:
        print(f"  Advertencia: No se encontraron las columnas 'cuenta' ni 'cliente' en '{file_path}'. Cabecera: {header}")
        return False

    idx_cuenta = header.index("cuenta") if "cuenta" in header else None
    idx_cliente = header.index("cliente") if "cliente" in header else None

    # Process and write to a temp file in the same directory to avoid cross-device link errors
    target_dir = os.path.dirname(os.path.abspath(file_path))
    temp_fd, temp_path = tempfile.mkstemp(suffix=".csv", dir=target_dir)
    rows_cleaned_cuenta = 0
    rows_cleaned_cliente = 0
    total_rows = 0

    try:
        with open(file_path, "r", encoding=encoding, errors="ignore") as fin, \
             os.fdopen(temp_fd, "w", encoding="utf-8", newline="") as fout:
            
            reader = csv.reader(fin)
            writer = csv.writer(fout)
            
            # Write original header
            header = next(reader)
            writer.writerow(header)
            
            for row in reader:
                total_rows += 1
                # Clean cuenta column
                if idx_cuenta is not None and len(row) > idx_cuenta:
                    val = row[idx_cuenta].strip()
                    if val.endswith(".0"):
                        row[idx_cuenta] = val[:-2]
                        rows_cleaned_cuenta += 1
                
                # Clean cliente column
                if idx_cliente is not None and len(row) > idx_cliente:
                    val = row[idx_cliente].strip()
                    if val.endswith(".0"):
                        row[idx_cliente] = val[:-2]
                        rows_cleaned_cliente += 1
                        
                writer.writerow(row)

        if inplace:
            os.replace(temp_path, file_path)
            print(f"  [Listo] Reemplazado en sitio. Filas totales: {total_rows}")
            if idx_cuenta is not None:
                print(f"    - Modificaciones en 'cuenta': {rows_cleaned_cuenta}")
            if idx_cliente is not None:
                print(f"    - Modificaciones en 'cliente': {rows_cleaned_cliente}")
        else:
            output_path = file_path.replace(".csv", "_limpio.csv")
            os.replace(temp_path, output_path)
            print(f"  [Listo] Guardado como '{output_path}'. Filas totales: {total_rows}")
            
        return True
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"  Error durante la limpieza: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description="Limpia las columnas 'cuenta' y 'cliente' en archivos CSV eliminando el sufijo '.0' para dejarlos como enteros."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "-f", "--files",
        nargs="+",
        help="Uno o más archivos CSV específicos para limpiar."
    )
    group.add_argument(
        "-d", "--dir",
        help="Directorio donde buscar archivos CSV para procesar."
    )
    
    parser.add_argument(
        "-p", "--pattern",
        default="Limpio_Trns*.csv",
        help="Patrón glob para buscar archivos en el directorio (por defecto: Limpio_Trns*.csv)."
    )
    parser.add_argument(
        "--no-inplace",
        action="store_true",
        help="Guardar los resultados en archivos nuevos con sufijo '_limpio' en lugar de sobrescribir en sitio."
    )

    args = parser.parse_args()
    inplace = not args.no_inplace

    start_time = time.time()
    processed_count = 0
    success_count = 0

    if args.files:
        files_to_process = []
        for f_pattern in args.files:
            matched = glob.glob(f_pattern)
            if matched:
                files_to_process.extend(matched)
            else:
                files_to_process.append(f_pattern)
    else:
        search_path = os.path.join(args.dir, args.pattern)
        files_to_process = glob.glob(search_path)
        if not files_to_process:
            print(f"No se encontraron archivos en '{args.dir}' con el patrón '{args.pattern}'.")
            sys.exit(0)

    # Dedup and sort
    files_to_process = sorted(list(set(files_to_process)))

    print(f"Se encontraron {len(files_to_process)} archivos para procesar.")
    for file_path in files_to_process:
        processed_count += 1
        if clean_csv_file(file_path, inplace=inplace):
            success_count += 1

    elapsed = time.time() - start_time
    print("-" * 50)
    print(f"Completado en {elapsed:.2f} segundos.")
    print(f"Archivos procesados exitosamente: {success_count} de {processed_count}.")

if __name__ == "__main__":
    main()
