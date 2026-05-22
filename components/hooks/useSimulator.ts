"use client";

import { useState, useEffect } from "react";
import type { ClientRiskRow, RiskBand, SimulationInput, SimulationOutput } from "@/lib/types";

const defaultForm: SimulationInput = {
  montoCredito: 8500,
  saldoCapital: 4200,
  ingresos: 750,
  egresos: 520,
  saldoAhorro: 80,
  numeroCuotas: 24,
  pagoPorCuota: 220,
  diasHastaPago: 8,
  diasMoraActual: 0,
  tasaInteres: 15.5,
  nroCreditos: 1
};

export function useSimulator(selected?: ClientRiskRow) {
  const [form, setForm] = useState<SimulationInput>(defaultForm);
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setForm({
      clienteId: selected.clienteId,
      montoCredito: Math.round(selected.saldoCapital + selected.cuotaEstimada * 6),
      saldoCapital: Math.round(selected.saldoCapital),
      ingresos: Math.round(selected.ingresos),
      egresos: Math.round(selected.egresos),
      saldoAhorro: Math.round(selected.saldoAhorro),
      numeroCuotas: 24,
      pagoPorCuota: Math.round(selected.cuotaEstimada),
      diasHastaPago: selected.diasHastaPago,
      diasMoraActual: selected.diasMoraActual,
      tasaInteres: 15.5,
      nroCreditos: 1
    });
    setResult(null);
  }, [selected]);

  const update = (key: keyof SimulationInput, v: number) =>
    setForm((cur) => ({ ...cur, [key]: v }));

  const simulate = async () => {
    setLoading(true);
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setResult(await res.json());
    setLoading(false);
  };

  const currentRisk = (result?.riesgo ?? selected?.riesgo ?? "Medio") as RiskBand;

  return { form, result, loading, update, simulate, currentRisk };
}
