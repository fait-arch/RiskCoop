"use client";

import { RefreshCcw } from "lucide-react";
import { Field } from "@/components/atoms/Field";
import { Pill } from "@/components/atoms/Pill";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import { useSimulator } from "@/components/hooks/useSimulator";
import type { ClientRiskRow } from "@/lib/types";

interface SimulatorProps {
  selected?: ClientRiskRow;
}

export function Simulator({ selected }: SimulatorProps) {
  const { form, result, loading, update, simulate, currentRisk } = useSimulator(selected);

  return (
    <div id="simulador" className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Simulador por socio</p>
          <h3>Modificar cuotas y recalcular mora</h3>
        </div>
        <Pill risk={currentRisk} />
      </div>

      <div className="clientSnapshot">
        <strong>{selected ? `Socio ${selected.clienteId}` : "Escenario manual"}</strong>
        <span>
          {selected
            ? `Operación ${selected.operacionId} · pago en ${selected.diasHastaPago} días`
            : "Ajusta las variables y presiona recalcular"}
        </span>
      </div>

      <div className="formGrid">
        <Field label="Número de cuotas" value={form.numeroCuotas}   onChange={(v) => update("numeroCuotas", v)} />
        <Field label="Pago por cuota"   value={form.pagoPorCuota}   onChange={(v) => update("pagoPorCuota", v)} />
        <Field label="Ingresos socio"   value={form.ingresos}       onChange={(v) => update("ingresos", v)} />
        <Field label="Egresos socio"    value={form.egresos}        onChange={(v) => update("egresos", v)} />
        <Field label="Saldo disponible" value={form.saldoAhorro}    onChange={(v) => update("saldoAhorro", v)} />
        <Field label="Saldo capital"    value={form.saldoCapital}   onChange={(v) => update("saldoCapital", v)} />
        <Field label="Días hasta pago"  value={form.diasHastaPago}  onChange={(v) => update("diasHastaPago", v)} />
        <Field label="Días mora actual" value={form.diasMoraActual} onChange={(v) => update("diasMoraActual", v)} />
      </div>

      <PrimaryButton onClick={simulate} disabled={loading} icon={<RefreshCcw size={18} />}>
        {loading ? "Recalculando..." : "Recalcular probabilidad"}
      </PrimaryButton>

      {result && (
        <div className="scenarioResult">
          <div>
            <span>Nueva probabilidad de mora</span>
            <strong>{`${Math.round(result.probabilidadMora * 100)}%`}</strong>
          </div>
          <Pill risk={result.riesgo} />
          <p>{result.razones.join(" · ")}</p>
        </div>
      )}
    </div>
  );
}
