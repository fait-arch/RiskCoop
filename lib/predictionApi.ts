import type { ClientRiskRow } from "./types";
import { estimateInstallment, riskBand } from "./riskModel";

type RawRow = Record<string, unknown>;
type TextRow = Record<string, string>;

type PredictionInput = {
  cliente_id: string;
  operacion_id: string;
  monto_credito: number;
  saldo_pendiente: number;
  plazo: number;
  dias_atraso_actual: number;
  numero_cuotas_pendientes: number;
  numero_cuotas_atrasadas: number;
  promedio_dias_atraso: number;
  max_dias_atraso: number;
  numero_pagos_tarde: number;
  porcentaje_pagos_tarde: number;
  ultimo_pago_tarde: number;
  dias_desde_ultimo_pago: number;
  saldo_actual: number;
  saldo_anterior: number;
  variacion_saldo_limpia: number;
  numero_transacciones: number;
  monto_total_movido: number;
  monto_promedio_transaccion: number;
  variacion_movimientos: number;
  variacion_monto_movido: number;
  nro_cargas_fam: number;
  estado_civil: string;
  nivel_educa: string;
  estado_op: string;
};

type PredictionOutput = {
  cliente_id: string;
  operacion_id: string;
  probabilidad_riesgo: number;
  probabilidad_recuperacion: number;
  prediccion_riesgo: number;
  prediccion_recuperacion: number;
  resultado_riesgo: string;
  resultado_recuperacion: string;
};

const predictionApiUrl = process.env.PREDICTION_API_URL ?? "http://127.0.0.1:8000";

const asTextRow = (row: RawRow): TextRow =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value === null || value === undefined ? "" : String(value)])
  );

const num = (value: unknown, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clientIdOf = (row: RawRow | TextRow) => String(row.nro_socio ?? row.nro_cliente ?? row.v_ah_cliente ?? "").replace(".0", "");

const daysSince = (value: unknown) => {
  if (!value) return 999;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
};

const daysUntilPayment = (dayValue: unknown) => {
  const day = Math.max(1, Math.min(31, num(dayValue, 15)));
  const today = new Date();
  const paymentDate = new Date(today.getFullYear(), today.getMonth(), day);
  if (paymentDate.getTime() < today.getTime()) paymentDate.setMonth(paymentDate.getMonth() + 1);
  return Math.max(0, Math.ceil((paymentDate.getTime() - today.getTime()) / 86400000));
};

const movementStats = (transactions: RawRow[]) => {
  const sorted = [...transactions].sort(
    (a, b) => new Date(String(b.fecha_trn ?? "")).getTime() - new Date(String(a.fecha_trn ?? "")).getTime()
  );
  const amounts = sorted.map((row) => Math.abs(num(row.valor_trn)));
  const total = amounts.reduce((sum, value) => sum + value, 0);
  const midpoint = Math.ceil(sorted.length / 2);
  const recentAmount = amounts.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
  const previousAmount = amounts.slice(midpoint).reduce((sum, value) => sum + value, 0);
  const creditCount = sorted.filter((row) => String(row.signo_nc_nd ?? "").toUpperCase().includes("C")).length;
  const debitCount = sorted.filter((row) => String(row.signo_nc_nd ?? "").toUpperCase().includes("D")).length;
  const latest = sorted[0];
  const previous = sorted[1];

  return {
    count: sorted.length,
    total,
    average: sorted.length ? total / sorted.length : 0,
    currentBalance: num(latest?.saldo_disponible ?? latest?.saldo_contable),
    previousBalance: num(previous?.saldo_disponible ?? previous?.saldo_contable ?? latest?.saldo_disponible),
    movementVariation: sorted.length ? (creditCount - debitCount) / sorted.length : 0,
    amountVariation: previousAmount ? (recentAmount - previousAmount) / previousAmount : recentAmount
  };
};

const buildFeatureRow = (
  operation: RawRow,
  client: RawRow | undefined,
  saving: RawRow | undefined,
  transactions: RawRow[],
  clientOperations: RawRow[]
): PredictionInput => {
  const montoCredito = num(operation.monto_credito);
  const saldoCapital = num(operation.saldo_capital);
  const plazo = num(operation.plazo || operation.nro_cuotas, 1);
  const nroCuotas = num(operation.nro_cuotas, plazo || 1);
  const cuotasAtrasadas = num(operation.nro_cuotas_atra);
  const diasMora = num(operation.dias_mora ?? operation.mora);
  const movement = movementStats(transactions);
  const saldoActual = movement.currentBalance || num(saving?.saldo_disponible);
  const saldoAnterior = movement.previousBalance || saldoActual;
  const lateOperations = clientOperations.filter((row) => num(row.dias_mora ?? row.mora) > 0);
  const lateDays = clientOperations.map((row) => num(row.dias_mora ?? row.mora)).filter((value) => value > 0);

  return {
    cliente_id: clientIdOf(operation),
    operacion_id: String(operation.nro_operacion ?? ""),
    monto_credito: montoCredito,
    saldo_pendiente: saldoCapital,
    plazo,
    dias_atraso_actual: diasMora,
    numero_cuotas_pendientes: Math.max(0, nroCuotas - cuotasAtrasadas),
    numero_cuotas_atrasadas: cuotasAtrasadas,
    promedio_dias_atraso: lateDays.length ? lateDays.reduce((sum, value) => sum + value, 0) / lateDays.length : diasMora,
    max_dias_atraso: Math.max(diasMora, ...lateDays, 0),
    numero_pagos_tarde: lateOperations.length || (diasMora > 0 ? 1 : 0),
    porcentaje_pagos_tarde: nroCuotas ? Math.min(1, (lateOperations.length || cuotasAtrasadas) / nroCuotas) : 0,
    ultimo_pago_tarde: diasMora > 0 ? 1 : 0,
    dias_desde_ultimo_pago: daysSince(operation.fecha_ult_pag),
    saldo_actual: saldoActual,
    saldo_anterior: saldoAnterior,
    variacion_saldo_limpia: saldoActual - saldoAnterior,
    numero_transacciones: movement.count,
    monto_total_movido: movement.total,
    monto_promedio_transaccion: movement.average,
    variacion_movimientos: movement.movementVariation,
    variacion_monto_movido: movement.amountVariation,
    nro_cargas_fam: num(client?.nro_carga_fam ?? client?.nro_cargas_fam),
    estado_civil: String(client?.estado_civil ?? saving?.estado_civil ?? "NO REGISTRADO"),
    nivel_educa: String(client?.nivel_educa ?? "NO REGISTRADO"),
    estado_op: String(operation.estado_op ?? "NO REGISTRADO")
  };
};

export const predictRiskRows = async (
  operations: RawRow[],
  clients: RawRow[],
  savings: RawRow[],
  transactions: RawRow[]
): Promise<ClientRiskRow[]> => {
  const clientsById = new Map(clients.map((row) => [clientIdOf(row), row]));
  const savingsById = new Map(savings.map((row) => [clientIdOf(row), row]));
  const transactionsById = new Map<string, RawRow[]>();
  const operationsById = new Map<string, RawRow[]>();

  transactions.forEach((row) => {
    const id = clientIdOf(row);
    transactionsById.set(id, [...(transactionsById.get(id) ?? []), row]);
  });
  operations.forEach((row) => {
    const id = clientIdOf(row);
    operationsById.set(id, [...(operationsById.get(id) ?? []), row]);
  });

  const featureRows = operations.map((operation) => {
    const id = clientIdOf(operation);
    return buildFeatureRow(
      operation,
      clientsById.get(id),
      savingsById.get(id),
      transactionsById.get(id) ?? [],
      operationsById.get(id) ?? []
    );
  });

  const response = await fetch(`${predictionApiUrl}/predict-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(featureRows),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API predictiva ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const payload = (await response.json()) as { predicciones: PredictionOutput[] };
  const predictionByOperation = new Map(payload.predicciones.map((item) => [String(item.operacion_id), item]));

  return operations.map((operation) => {
    const id = clientIdOf(operation);
    const client = clientsById.get(id);
    const saving = savingsById.get(id);
    const operationText = asTextRow(operation);
    const savingText = asTextRow(saving ?? {});
    const prediction = predictionByOperation.get(String(operation.nro_operacion ?? ""));
    const saldoCapital = num(operation.saldo_capital);
    const plazo = num(operation.plazo || operation.nro_cuotas, 1);
    const montoCredito = num(operation.monto_credito);
    const avanceCuotas = montoCredito > 0 ? 1 - saldoCapital / montoCredito : 0;
    const cuotasPendientes = Math.max(1, Math.round(plazo * (1 - Math.min(Math.max(avanceCuotas, 0), 0.95))));
    const cuotaEstimada = estimateInstallment(saldoCapital, cuotasPendientes, num(operation.tasa_int_vig ?? operation.tasa_int_con));

    if (!prediction) {
      throw new Error(`La API predictiva no devolvio prediccion para la operacion ${operation.nro_operacion}`);
    }

    const probabilidadMora = prediction.probabilidad_riesgo;
    const probabilidadRecuperacion = prediction.probabilidad_recuperacion;

    return {
      clienteId: id || "Sin cliente",
      operacionId: String(operation.nro_operacion ?? "Sin operacion"),
      destinoOp: String(operation.destino_op ?? "Sin destino"),
      actividad: String(operation.actividad_socio ?? "Actividad no registrada"),
      probabilidadMora,
      probabilidadRecuperacion,
      diasHastaPago: daysUntilPayment(operation.dia_pago),
      riesgo: riskBand(probabilidadMora),
      cuotaEstimada,
      ingresos: num(client?.ingresos_socio ?? saving?.ingresos),
      egresos: num(client?.egresos_socio ?? saving?.egresos),
      saldoCapital,
      saldoAhorro: num(saving?.saldo_disponible),
      diasMoraActual: num(operation.dias_mora ?? operation.mora),
      explicacion: [
        `Prediccion calculada por API: ${prediction.resultado_riesgo}.`,
        `Recuperacion estimada por API: ${prediction.resultado_recuperacion}.`
      ]
    };
  });
};
