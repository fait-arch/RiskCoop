import { RiskBand } from "@/lib/types";
import { riskClass } from "@/lib/constants";

interface PillProps {
  risk: RiskBand;
}

export function Pill({ risk }: PillProps) {
  return <span className={`pill ${riskClass[risk]}`}>{risk}</span>;
}
