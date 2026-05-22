import argparse
import csv
import glob
import os

def unify_trns_files(input_paths, output_path):
    all_files = []
    
    # Resolve all input paths
    for path in input_paths:
        if os.path.isdir(path):
            all_files.extend(glob.glob(os.path.join(path, "*.csv")))
        else:
            all_files.extend(glob.glob(path))
            
    # Filter files
    target_files = [f for f in all_files if "Limpio_Trns" in os.path.basename(f)]
    
    if not target_files:
        print("No se encontraron archivos 'Limpio_Trns' para procesar.")
        return
        
    # Dedup and sort
    target_files = sorted(list(set(target_files)))
    print(f"Archivos a procesar ({len(target_files)}):")
    for f in target_files:
        print(f" - {f}")
        
    first_file = True
    total_rows = 0
    
    with open(output_path, "w", encoding="utf-8", newline="") as fout:
        writer = csv.writer(fout)
        
        for file in target_files:
            print(f"Procesando {file}...")
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
                        
                    for row in reader:
                        total_rows += 1
                        writer.writerow(row)
                        
            except Exception as e:
                print(f"Error leyendo {file}: {e}")
                
    print(f"\n--- Resumen ---")
    print(f"Total de filas consolidadas: {total_rows}")
    print(f"Archivo guardado en: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unifica los archivos Limpio_Trns.")
    parser.add_argument("-i", "--input", nargs="+", required=True, 
                        help="Ruta(s) de los archivos o directorios de entrada (ej. Datos/*.csv).")
    parser.add_argument("-o", "--output", default="Trns_Unificado.csv", 
                        help="Ruta del archivo CSV de salida unificado.")
    
    args = parser.parse_args()
    
    unify_trns_files(args.input, args.output)
