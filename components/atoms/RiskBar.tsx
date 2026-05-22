import { RiskBand } from "@/lib/types";
import { riskClass } from "@/lib/constants";

interface RiskBarProps {
  label: RiskBand;
  value: number;
  total: number;
}

export function RiskBar({ label, value, total }: RiskBarProps) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="riskBar">
      <div className="riskBarLabel">
        <span>{label} riesgo</span>
        <strong>{value.toLocaleString("es-EC")} socios</strong>
      </div>
      <div
        className="barTrack"
        role="meter"
        aria-label={`${label}: ${pct}%`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className={riskClass[label]} style={{ ["--w" as any]: `${pct}%` }} />
      </div>
    </div>
  );
}
