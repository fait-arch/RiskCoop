import argparse
import csv
import glob
import os

def clean_and_unify_sabana(input_paths, output_path):
    all_files = []
    
    # Resolve all input paths
    for path in input_paths:
        if os.path.isdir(path):
            all_files.extend(glob.glob(os.path.join(path, "*.csv")))
        else:
            all_files.extend(glob.glob(path))
            
    # Filter files
    target_files = [f for f in all_files if "Limpio_DatosSabanaAhorro" in os.path.basename(f)]
    
    if not target_files:
        print("No se encontraron archivos 'Limpio_DatosSabanaAhorro' para procesar.")
        return
        
    # Dedup and sort
    target_files = sorted(list(set(target_files)))
    print(f"Archivos a procesar ({len(target_files)}):")
    for f in target_files:
        print(f" - {f}")
        
    first_file = True
    total_rows = 0
    cleaned_v_ah_cliente = 0
    cleaned_v_ah_cuenta = 0
    
    with open(output_path, "w", encoding="utf-8", newline="") as fout:
        writer = csv.writer(fout)
        
        for file in target_files:
            print(f"Procesando {file}...")
            # We assume utf-8 or try to handle encoding if needed. But let's stick to utf-8 first.
            try:
                with open(file, "r", encoding="utf-8", errors="ignore") as fin:
                    reader = csv.reader(fin)
                    
                    try:
                        header = next(reader)
                    except StopIteration:
                        continue # empty file
                        
                    if first_file:
                        writer.writerow(header)
                        first_file = False
                        # Find indices
                        idx_cliente = header.index("v_ah_cliente") if "v_ah_cliente" in header else None
                        idx_cuenta = header.index("v_ah_cuenta") if "v_ah_cuenta" in header else None
                    else:
                        # In subsequent files, just verify header length or skip it.
                        # Assuming same structure. We already skipped the header row.
                        pass
                        
                    for row in reader:
                        total_rows += 1
                        
                        if idx_cliente is not None and len(row) > idx_cliente:
                            val = row[idx_cliente].strip()
                            if val.endswith(".0"):
                                row[idx_cliente] = val[:-2]
                                cleaned_v_ah_cliente += 1
                                
                        if idx_cuenta is not None and len(row) > idx_cuenta:
                            val = row[idx_cuenta].strip()
                            if val.endswith(".0"):
                                row[idx_cuenta] = val[:-2]
                                cleaned_v_ah_cuenta += 1
                                
                        writer.writerow(row)
            except Exception as e:
                print(f"Error leyendo {file}: {e}")
                
    print(f"\n--- Resumen ---")
    print(f"Total de filas consolidadas: {total_rows}")
    print(f"Valores limpiados en 'v_ah_cliente': {cleaned_v_ah_cliente}")
    print(f"Valores limpiados en 'v_ah_cuenta': {cleaned_v_ah_cuenta}")
    print(f"Archivo guardado en: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Limpia columnas numéricas y unifica los archivos de SabanaAhorro.")
    parser.add_argument("-i", "--input", nargs="+", required=True, 
                        help="Ruta(s) de los archivos o directorios de entrada (ej. Datos/*.csv).")
    parser.add_argument("-o", "--output", default="SabanaAhorro_Unificado.csv", 
                        help="Ruta del archivo CSV de salida unificado.")
    
    args = parser.parse_args()
    
    clean_and_unify_sabana(args.input, args.output)
