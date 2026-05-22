"use client";

import { useState, useEffect, useMemo } from "react";
import type { DashboardPayload, ClientRiskRow } from "@/lib/types";
import { riskFilters } from "@/lib/constants";

export function useDashboard() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [selected, setSelected] = useState<ClientRiskRow | undefined>();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<(typeof riskFilters)[number]>("Todos");
  const [destinationFilter, setDestinationFilter] = useState("Todos");
  const [maxDaysFilter, setMaxDaysFilter] = useState("Todos");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((payload: DashboardPayload) => {
        setDashboard(payload);
        setSelected(payload.rows[0]);
      });
  }, []);

  const rows = dashboard?.rows ?? [];

  const riskCounts = useMemo(() => {
    const buckets = dashboard?.moraBuckets ?? [];
    const count = (label: string) =>
      buckets.find((b) => b.label === label)?.count ?? 0;
    return {
      Alto:  count("81-100%"),
      Medio: count("41-60%") + count("61-80%"),
      Bajo:  count("0-20%")  + count("21-40%")
    };
  }, [dashboard?.moraBuckets]);

  const riskTotal = riskCounts.Alto + riskCounts.Medio + riskCounts.Bajo;

  const destinations = useMemo(
    () => ["Todos", ...Array.from(new Set(rows.map((r) => r.destinoOp)))],
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const maxDays = maxDaysFilter === "Todos" ? null : Number(maxDaysFilter);
    return rows
      .filter((row) => {
        const matchSearch =
          !q ||
          row.clienteId.toLowerCase().includes(q) ||
          row.operacionId.toLowerCase().includes(q) ||
          row.destinoOp.toLowerCase().includes(q);
        const matchRisk  = riskFilter === "Todos" || row.riesgo === riskFilter;
        const matchDest  = destinationFilter === "Todos" || row.destinoOp === destinationFilter;
        const matchDays  = maxDays === null || row.diasHastaPago <= maxDays;
        return matchSearch && matchRisk && matchDest && matchDays;
      })
      .slice(0, 40);
  }, [destinationFilter, maxDaysFilter, riskFilter, rows, search]);

  return {
    dashboard,
    selected,
    setSelected,
    search, setSearch,
    riskFilter, setRiskFilter,
    destinationFilter, setDestinationFilter,
    maxDaysFilter, setMaxDaysFilter,
    filteredRows,
    riskCounts,
    riskTotal,
    destinations,
    loading: !dashboard
  };
}
