import { ReactNode } from "react";

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "danger" | "success" | "warning";
}

export function MetricCard({ icon, label, value, tone }: MetricCardProps) {
  return (
    <article className={`metric ${tone ?? ""}`}>
      <div className="metricIcon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
