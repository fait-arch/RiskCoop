import { RiskBar } from "@/components/atoms/RiskBar";

interface RiskBarsGroupProps {
  alto: number;
  medio: number;
  bajo: number;
  total: number;
}

export function RiskBarsGroup({ alto, medio, bajo, total }: RiskBarsGroupProps) {
  return (
    <div className="riskBars">
      <RiskBar label="Alto"  value={alto}  total={total} />
      <RiskBar label="Medio" value={medio} total={total} />
      <RiskBar label="Bajo"  value={bajo}  total={total} />
    </div>
  );
}
