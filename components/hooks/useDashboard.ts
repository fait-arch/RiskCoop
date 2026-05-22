"use client";

import { useState, useEffect, useMemo } from "react";
import type { DashboardPayload, ClientRiskRow } from "@/lib/types";
import { riskFilters } from "@/lib/constants";

export function useDashboard() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [selected, setSelected] = useState<ClientRiskRow | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<(typeof riskFilters)[number]>("Todos");
  const [destinationFilter, setDestinationFilter] = useState("Todos");
  const [maxDaysFilter, setMaxDaysFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => {
        const payload = await r.json();
        if (!r.ok) {
          throw new Error(payload?.detail || payload?.error || "No se pudo cargar Supabase.");
        }
        return payload;
      })
      .then((payload: DashboardPayload) => {
        setDashboard(payload);
        setSelected(payload.rows[0]);
        setError(null);
      })
      .catch((err) => {
        setDashboard(null);
        setSelected(undefined);
        setError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  const rows = dashboard?.rows ?? [];

  const riskCounts = useMemo(() => {
    const buckets = dashboard?.moraBuckets ?? [];
    const count = (label: string) =>
      buckets.find((b) => b.label === label)?.count ?? 0;
    return {
      Alto:  count("61-80%") + count("81-100%"),
      Medio: count("41-60%"),
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
      });
  }, [destinationFilter, maxDaysFilter, riskFilter, rows, search]);

  useEffect(() => {
    setPage(1);
  }, [destinationFilter, maxDaysFilter, riskFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return {
    dashboard,
    selected,
    setSelected,
    search, setSearch,
    riskFilter, setRiskFilter,
    destinationFilter, setDestinationFilter,
    maxDaysFilter, setMaxDaysFilter,
    filteredRows: paginatedRows,
    filteredTotal: filteredRows.length,
    page: currentPage,
    totalPages,
    setPage,
    riskCounts,
    riskTotal,
    destinations,
    loading: !dashboard && !error,
    error
  };
}
