import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { ClientRiskRow } from "@/lib/types";
import { percent } from "@/lib/constants";
import { Pill } from "@/components/atoms/Pill";

interface ClientTableProps {
  rows: ClientRiskRow[];
  selected?: ClientRiskRow;
  onSelect: (row: ClientRiskRow) => void;
  onInspect: (row: ClientRiskRow) => void;
  page: number;
  totalPages: number;
  totalRows: number;
  onPageChange: (page: number) => void;
}

export function ClientTable({
  rows,
  selected,
  onSelect,
  onInspect,
  page,
  totalPages,
  totalRows,
  onPageChange
}: ClientTableProps) {
  return (
    <>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Socio</th>
              <th scope="col">Operacion</th>
              <th scope="col">Destino OP</th>
              <th scope="col">Prob. mora</th>
              <th scope="col">Prob. recup.</th>
              <th scope="col">Dias pago</th>
              <th scope="col">Riesgo</th>
              <th scope="col">Ver</th>
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
                <td>{percent(row.probabilidadRecuperacion)}</td>
                <td>{row.diasHastaPago}</td>
                <td><Pill risk={row.riesgo} /></td>
                <td>
                  <button
                    className="iconButton eyeButton"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onInspect(row);
                    }}
                    aria-label={`Ver socio ${row.clienteId}`}
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="emptyTable">
                  No hay socios que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="paginationBar">
        <span>{totalRows.toLocaleString("es-EC")} socios filtrados</span>
        <div>
          <button className="iconButton" type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Pagina anterior">
            <ChevronLeft size={18} />
          </button>
          <strong>Pagina {page} de {totalPages}</strong>
          <button className="iconButton" type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Pagina siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
