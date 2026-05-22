"use client";

import { BarChart3, Activity, Users } from "lucide-react";
import { useDashboard } from "@/components/hooks/useDashboard";
import { Sidebar } from "@/components/organisms/Sidebar";
import { Simulator } from "@/components/organisms/Simulator";
import { Chatbot } from "@/components/organisms/Chatbot";
import { MetricGrid } from "@/components/molecules/MetricGrid";
import { RiskBarsGroup } from "@/components/molecules/RiskBarsGroup";
import { DestinationList } from "@/components/molecules/DestinationList";
import { TableControls } from "@/components/molecules/TableControls";
import { ClientTable } from "@/components/molecules/ClientTable";

export function DashboardTemplate() {
  const {
    dashboard,
    selected, setSelected,
    search, setSearch,
    riskFilter, setRiskFilter,
    destinationFilter, setDestinationFilter,
    maxDaysFilter, setMaxDaysFilter,
    filteredRows, riskCounts, riskTotal, destinations,
    loading
  } = useDashboard();

  if (loading) {
    return <main className="loading">Cargando riesgo cooperativo...</main>;
  }

  return (
    <main className="pageShell">
      <Sidebar source={dashboard!.source} />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard predictivo</p>
            <h2>Alertas de mora y recuperación</h2>
          </div>
        </header>

        <MetricGrid summary={dashboard!.summary} />

        <section className="mainGrid" aria-label="Distribución de riesgo">
          <div className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Distribución</p>
                <h3>Socios por nivel de riesgo</h3>
              </div>
              <span className="panelIcon"><BarChart3 size={20} aria-hidden /></span>
            </div>
            <RiskBarsGroup alto={riskCounts.Alto} medio={riskCounts.Medio} bajo={riskCounts.Bajo} total={riskTotal} />
          </div>

          <div className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Destino operación</p>
                <h3>Más propensos a mora</h3>
              </div>
              <span className="panelIcon"><Activity size={20} aria-hidden /></span>
            </div>
            <DestinationList destinations={dashboard!.destinationRisks} />
          </div>
        </section>

        <section id="socios" className="panel" aria-label="Cartera priorizada">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Cartera priorizada</p>
              <h3>Socios con probabilidad y días de pago</h3>
            </div>
            <span className="panelIcon"><Users size={20} aria-hidden /></span>
          </div>

          <TableControls
            search={search} onSearchChange={setSearch}
            riskFilter={riskFilter} onRiskFilterChange={(v) => setRiskFilter(v as any)}
            destinationFilter={destinationFilter} onDestinationFilterChange={setDestinationFilter}
            destinations={destinations}
            maxDaysFilter={maxDaysFilter} onMaxDaysFilterChange={setMaxDaysFilter}
          />

          <ClientTable rows={filteredRows} selected={selected} onSelect={setSelected} />
        </section>

        <section className="lowerGrid">
          <Simulator selected={selected} />
          <Chatbot selected={selected} />
        </section>
      </section>
    </main>
  );
}
