import type { ClientRiskRow } from "@/lib/types";
import { percent } from "@/lib/constants";
import { Pill } from "@/components/atoms/Pill";

interface ClientTableProps {
  rows: ClientRiskRow[];
  selected?: ClientRiskRow;
  onSelect: (row: ClientRiskRow) => void;
}

export function ClientTable({ rows, selected, onSelect }: ClientTableProps) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Socio</th>
            <th scope="col">Operación</th>
            <th scope="col">Destino OP</th>
            <th scope="col">Prob. mora</th>
            <th scope="col">Días pago</th>
            <th scope="col">Riesgo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.clienteId}-${row.operacionId}`}
              onClick={() => onSelect(row)}
              aria-selected={selected?.clienteId === row.clienteId}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(row)}
            >
              <td>{row.clienteId}</td>
              <td>{row.operacionId}</td>
              <td>{row.destinoOp}</td>
              <td>{percent(row.probabilidadMora)}</td>
              <td>{row.diasHastaPago}</td>
              <td><Pill risk={row.riesgo} /></td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={6} className="emptyTable">
                No hay socios que coincidan con los filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
