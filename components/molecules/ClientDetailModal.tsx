import { X } from "lucide-react";
import type { ClientRiskRow } from "@/lib/types";
import { currency, percent } from "@/lib/constants";
import { Pill } from "@/components/atoms/Pill";

interface ClientDetailModalProps {
  row?: ClientRiskRow;
  onClose: () => void;
}

export function ClientDetailModal({ row, onClose }: ClientDetailModalProps) {
  if (!row) return null;

  const fields = [
    ["Operacion", row.operacionId],
    ["Destino", row.destinoOp],
    ["Actividad", row.actividad],
    ["Probabilidad mora", percent(row.probabilidadMora)],
    ["Probabilidad recuperacion", percent(row.probabilidadRecuperacion)],
    ["Dias hasta pago", row.diasHastaPago.toLocaleString("es-EC")],
    ["Dias mora actual", row.diasMoraActual.toLocaleString("es-EC")],
    ["Cuota estimada", currency.format(row.cuotaEstimada)],
    ["Saldo capital", currency.format(row.saldoCapital)],
    ["Saldo ahorro", currency.format(row.saldoAhorro)],
    ["Ingresos", currency.format(row.ingresos)],
    ["Egresos", currency.format(row.egresos)]
  ];

  return (
    <div className="detailOverlay" role="dialog" aria-modal="true" aria-label="Detalle de socio">
      <article className="detailModal">
        <header className="detailHeader">
          <div>
            <p className="eyebrow">Detalle del socio</p>
            <h3>Socio {row.clienteId}</h3>
          </div>
          <div className="detailHeaderActions">
            <Pill risk={row.riesgo} />
            <button className="iconButton" type="button" onClick={onClose} aria-label="Cerrar detalle">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="detailGrid">
          {fields.map(([label, value]) => (
            <div className="detailField" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
