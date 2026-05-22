import { Users, AlertTriangle, TrendingUp, CircleDollarSign } from "lucide-react";
import { MetricCard } from "@/components/atoms/MetricCard";
import { percent, currency } from "@/lib/constants";
import type { DashboardPayload } from "@/lib/types";

interface MetricGridProps {
  summary: DashboardPayload["summary"];
}

export function MetricGrid({ summary }: MetricGridProps) {
  return (
    <section id="resumen" aria-label="Métricas principales" className="metricGrid">
      <MetricCard
        icon={<Users size={20} />}
        label="Operaciones monitoreadas"
        value={summary.operaciones.toLocaleString("es-EC")}
      />
      <MetricCard
        icon={<AlertTriangle size={20} />}
        label="Probabilidad mora promedio"
        value={percent(summary.probabilidadMoraPromedio)}
        tone="danger"
      />
      <MetricCard
        icon={<TrendingUp size={20} />}
        label="Recuperación promedio"
        value={percent(summary.probabilidadRecuperacionPromedio)}
        tone="success"
      />
      <MetricCard
        icon={<CircleDollarSign size={20} />}
        label="Exposición capital"
        value={currency.format(summary.exposicionCapital)}
        tone="warning"
      />
    </section>
  );
}
