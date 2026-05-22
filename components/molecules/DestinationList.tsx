import type { DestinationRisk } from "@/lib/types";
import { percent } from "@/lib/constants";

interface DestinationListProps {
  destinations: DestinationRisk[];
}

export function DestinationList({ destinations }: DestinationListProps) {
  return (
    <div className="destinationList">
      {destinations.slice(0, 5).map((item) => (
        <div className="destinationRow" key={item.destino}>
          <div>
            <strong>{item.destino}</strong>
            <span>{item.operaciones.toLocaleString("es-EC")} operaciones</span>
          </div>
          <div
            className="miniBar"
            aria-label={`${percent(item.probabilidadPromedio)} de probabilidad`}
          >
            <span style={{ ["--w" as any]: `${item.probabilidadPromedio * 100}%` }} />
          </div>
          <b>{percent(item.probabilidadPromedio)}</b>
        </div>
      ))}
    </div>
  );
}
