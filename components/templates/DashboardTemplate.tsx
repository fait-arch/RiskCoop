"use client";

import { useState } from "react";
import { AlertCircle, Database, Users } from "lucide-react";
import type { ClientRiskRow } from "@/lib/types";
import { useDashboard } from "@/components/hooks/useDashboard";
import { Sidebar } from "@/components/organisms/Sidebar";
import { Simulator } from "@/components/organisms/Simulator";
import { Chatbot } from "@/components/organisms/Chatbot";
import { MetricGrid } from "@/components/molecules/MetricGrid";
import { DashboardInsights } from "@/components/molecules/DashboardInsights";
import { TableControls } from "@/components/molecules/TableControls";
import { ClientTable } from "@/components/molecules/ClientTable";
import { ClientDetailModal } from "@/components/molecules/ClientDetailModal";

export function DashboardTemplate() {
  const [inspected, setInspected] = useState<ClientRiskRow | undefined>();
  const {
    dashboard,
    selected, setSelected,
    search, setSearch,
    riskFilter, setRiskFilter,
    destinationFilter, setDestinationFilter,
    maxDaysFilter, setMaxDaysFilter,
    filteredRows, riskCounts, riskTotal, destinations,
    filteredTotal, page, totalPages, setPage,
    loading, error
  } = useDashboard();

  if (loading) {
    return <main className="loading">Cargando riesgo cooperativo...</main>;
  }

  if (error || !dashboard) {
    return (
      <main className="errorState">
        <div className="errorCard">
          <span className="errorIcon"><AlertCircle size={24} aria-hidden /></span>
          <p className="eyebrow">Conexion Supabase</p>
          <h2>No se pudo cargar el dashboard</h2>
          <p>{error ?? "La respuesta de Supabase no contiene datos disponibles."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pageShell">
      <Sidebar source={dashboard.source} />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard predictivo</p>
            <h2>Riesgo, mora y recuperacion</h2>
          </div>
          <div className="topbarBadge">
            <Database size={16} aria-hidden />
            Supabase activo
          </div>
        </header>

        <MetricGrid summary={dashboard.summary} />

        <DashboardInsights
          dashboard={dashboard}
          riskCounts={riskCounts}
          riskTotal={riskTotal}
          onInspect={setInspected}
        />

        <section id="socios" className="panel" aria-label="Cartera priorizada">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Cartera priorizada</p>
              <h3>Socios con probabilidad y dias de pago</h3>
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

          <ClientTable
            rows={filteredRows}
            selected={selected}
            onSelect={setSelected}
            onInspect={setInspected}
            page={page}
            totalPages={totalPages}
            totalRows={filteredTotal}
            onPageChange={setPage}
          />
        </section>

        <section className="lowerGrid">
          <Simulator selected={selected} />
          <Chatbot selected={selected} />
        </section>
      </section>

      <ClientDetailModal row={inspected} onClose={() => setInspected(undefined)} />
    </main>
  );
}
