import { AlertTriangle, BarChart3, CircleDollarSign, Clock3, Eye, PieChart, TrendingUp } from "lucide-react";
import type { ClientRiskRow, DashboardPayload } from "@/lib/types";
import { currency, percent } from "@/lib/constants";

interface DashboardInsightsProps {
  dashboard: DashboardPayload;
  riskCounts: {
    Alto: number;
    Medio: number;
    Bajo: number;
    "En mora": number;
  };
  riskTotal: number;
  onInspect: (row: ClientRiskRow) => void;
}

const share = (value: number, total: number) => (total ? `${(value / total) * 100}%` : "0%");

const dueBuckets = (rows: ClientRiskRow[]) => {
  const buckets = [
    { label: "0-7 dias", count: 0 },
    { label: "8-15 dias", count: 0 },
    { label: "16-30 dias", count: 0 },
    { label: "+30 dias", count: 0 }
  ];

  rows.forEach((row) => {
    if (row.diasHastaPago <= 7) buckets[0].count += 1;
    else if (row.diasHastaPago <= 15) buckets[1].count += 1;
    else if (row.diasHastaPago <= 30) buckets[2].count += 1;
    else buckets[3].count += 1;
  });

  return buckets;
};

export function DashboardInsights({ dashboard, riskCounts, riskTotal, onInspect }: DashboardInsightsProps) {
  const maxDestinationProbability = Math.max(
    ...dashboard.destinationRisks.map((item) => item.probabilidadPromedio),
    0.01
  );
  const maxRecoveryBucket = Math.max(...dashboard.recoveryBuckets.map((item) => item.count), 1);
  const priorityRows = dashboard.rows.slice(0, 5);
  const exposedCapital = priorityRows.reduce((sum, row) => sum + row.saldoCapital, 0);
  const paymentBuckets = dueBuckets(dashboard.rows);
  const maxPaymentBucket = Math.max(...paymentBuckets.map((item) => item.count), 1);

  return (
    <section className="insightsGrid" aria-label="Indicadores visuales de cartera">
      <article className="panel chartPanel riskDonutPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Cartera activa</p>
            <h3>Distribucion por riesgo</h3>
          </div>
          <span className="panelIcon"><PieChart size={20} aria-hidden /></span>
        </div>

        <div
          className="donutChart"
          style={{
            ["--high" as any]: share(riskCounts.Alto, riskTotal),
            ["--medium" as any]: share(riskCounts.Medio, riskTotal),
            ["--low" as any]: share(riskCounts.Bajo, riskTotal)
          }}
          role="img"
          aria-label="Distribucion de socios por nivel de riesgo"
        >
          <div>
            <strong>{riskTotal.toLocaleString("es-EC")}</strong>
            <span>socios</span>
          </div>
        </div>

        <div className="legendGrid">
          <span><i className="legendDot high" /> Alto {riskCounts.Alto.toLocaleString("es-EC")}</span>
          <span><i className="legendDot medium" /> Medio {riskCounts.Medio.toLocaleString("es-EC")}</span>
          <span><i className="legendDot low" /> Bajo {riskCounts.Bajo.toLocaleString("es-EC")}</span>
          <span><i className="legendDot delinquent" /> En mora {riskCounts["En mora"].toLocaleString("es-EC")}</span>
        </div>
      </article>

      <article className="panel chartPanel destinationChartPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Destino operacion</p>
            <h3>Mayor probabilidad de mora</h3>
          </div>
          <span className="panelIcon"><BarChart3 size={20} aria-hidden /></span>
        </div>

        <div className="barChart destinationBars">
          {dashboard.destinationRisks.slice(0, 6).map((item) => (
            <div className="barChartRow" key={item.destino}>
              <span title={item.destino}>{item.destino}</span>
              <div className="barChartTrack">
                <i style={{ ["--w" as any]: `${(item.probabilidadPromedio / maxDestinationProbability) * 100}%` }} />
                <strong>{percent(item.probabilidadPromedio)}</strong>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel chartPanel recoveryPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Recuperacion</p>
            <h3>Socios por capacidad estimada</h3>
          </div>
          <span className="panelIcon"><TrendingUp size={20} aria-hidden /></span>
        </div>

        <div className="recoveryBars" aria-label="Socios agrupados por probabilidad de recuperacion">
          {dashboard.recoveryBuckets.map((bucket) => (
            <div className="recoveryRow" key={bucket.label}>
              <span>{bucket.label}</span>
              <div className="barChartTrack">
                <i style={{ ["--w" as any]: `${(bucket.count / maxRecoveryBucket) * 100}%` }} />
              </div>
              <strong>{bucket.count}</strong>
            </div>
          ))}
        </div>

        <div className="subChart">
          <div className="subChartTitle">
            <Clock3 size={16} aria-hidden />
            <span>Vencimientos proximos</span>
          </div>
          <div className="miniDueGrid">
            {paymentBuckets.map((bucket) => (
              <div className="miniDueItem" key={bucket.label}>
                <strong>{bucket.count}</strong>
                <i style={{ ["--h" as any]: `${(bucket.count / maxPaymentBucket) * 100}%` }} />
                <span>{bucket.label}</span>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="panel chartPanel priorityPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Alertas</p>
            <h3>Socios prioritarios</h3>
          </div>
          <span className="panelIcon"><AlertTriangle size={20} aria-hidden /></span>
        </div>

        <div className="prioritySummary">
          <CircleDollarSign size={22} aria-hidden />
          <div>
            <span>Capital expuesto en top 5</span>
            <strong>{currency.format(exposedCapital)}</strong>
          </div>
        </div>

        <div className="priorityList">
          {priorityRows.map((row) => (
            <div className="priorityItem" key={`${row.clienteId}-${row.operacionId}`}>
              <div>
                <strong>Socio {row.clienteId}</strong>
                <span>{row.destinoOp}</span>
              </div>
              <b>{percent(row.probabilidadMora)}</b>
              <button className="iconButton eyeButton" type="button" onClick={() => onInspect(row)} aria-label={`Ver socio ${row.clienteId}`}>
                <Eye size={16} />
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
