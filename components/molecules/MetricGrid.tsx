import { Users, AlertTriangle, TrendingUp, CircleDollarSign, ShieldAlert } from "lucide-react";
import { MetricCard } from "@/components/atoms/MetricCard";
import { percent, currency } from "@/lib/constants";
import type { DashboardPayload } from "@/lib/types";

interface MetricGridProps {
  summary: DashboardPayload["summary"];
}

export function MetricGrid({ summary }: MetricGridProps) {
  return (
    <section id="resumen" aria-label="Metricas principales" className="metricGrid">
      <MetricCard
        icon={<ShieldAlert size={20} />}
        label="Alto riesgo preventivo"
        value={summary.clientesAltoRiesgo.toLocaleString("es-EC")}
        tone="danger"
      />
      <MetricCard
        icon={<AlertTriangle size={20} />}
        label="Mora futura promedio"
        value={percent(summary.probabilidadMoraPromedio)}
        tone="danger"
      />
      <MetricCard
        icon={<Users size={20} />}
        label="Operaciones en mora"
        value={summary.operacionesEnMora.toLocaleString("es-EC")}
      />
      <MetricCard
        icon={<TrendingUp size={20} />}
        label="Recuperacion promedio"
        value={percent(summary.probabilidadRecuperacionPromedio)}
        tone="success"
      />
      <MetricCard
        icon={<CircleDollarSign size={20} />}
        label="Exposicion capital"
        value={currency.format(summary.exposicionCapital)}
        tone="warning"
      />
    </section>
  );
}
