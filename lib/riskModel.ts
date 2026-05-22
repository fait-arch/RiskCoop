import { ClientRiskRow, RiskBand, SimulationInput, SimulationOutput } from "./types";

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

const safeNumber = (value: string | number | undefined, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (!value) return fallback;
  const cleaned = value.toString().replace(",", ".").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const riskBand = (probability: number): RiskBand => {
  if (probability >= 0.68) return "Alto";
  if (probability >= 0.38) return "Medio";
  return "Bajo";
};

export const estimateInstallment = (saldoCapital: number, cuotasPendientes: number, tasaAnual: number) => {
  if (cuotasPendientes <= 0) return saldoCapital;
  const monthlyRate = Math.max(tasaAnual, 0) / 100 / 12;
  if (monthlyRate === 0) return saldoCapital / cuotasPendientes;
  return (saldoCapital * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -cuotasPendientes));
};

export const scoreSimulation = (input: SimulationInput): SimulationOutput => {
  const disposableIncome = input.ingresos - input.egresos;
  const installmentBurden = input.ingresos > 0 ? input.pagoPorCuota / input.ingresos : 1;
  const liquidityCoverage = input.pagoPorCuota > 0 ? input.saldoAhorro / input.pagoPorCuota : 0;
  const debtToIncome = input.ingresos > 0 ? input.saldoCapital / input.ingresos : 6;
  const disposableCoverage = input.pagoPorCuota > 0 ? disposableIncome / input.pagoPorCuota : 0;

  let score = 0.12;
  score += clamp((installmentBurden - 0.28) / 0.72, 0, 1) * 0.35;
  score += input.egresos >= input.ingresos && input.ingresos > 0 ? 0.08 : clamp(1 - disposableCoverage, 0, 1) * 0.12;
  score += clamp(debtToIncome / 36, 0, 0.18);
  score += input.saldoAhorro <= 5 ? 0.08 : 0;
  score += liquidityCoverage < 0.5 ? 0.08 : liquidityCoverage < 1 ? 0.04 : -0.05;
  score += input.diasHastaPago < 3 ? 0.05 : 0;
  score += input.diasMoraActual > 0 ? clamp(input.diasMoraActual / 90, 0.05, 0.18) : 0;
  score += input.nroCreditos > 2 ? 0.04 : 0;
  score += input.tasaInteres > 18 ? 0.03 : 0;

  const probabilidadMora = clamp(score);
  const probabilidadRecuperacion = clamp(
    0.78 - probabilidadMora * 0.45 + clamp(liquidityCoverage / 4, 0, 0.14) + (input.diasMoraActual <= 15 ? 0.08 : -0.08)
  );
  const razones: string[] = [];

  if (installmentBurden > 0.35) razones.push("La cuota supera un umbral prudente frente al ingreso declarado.");
  if (disposableIncome <= 0) razones.push("Los egresos declarados consumen el ingreso; conviene validar si es dato duplicado o capacidad real limitada.");
  if (liquidityCoverage < 1) razones.push("El saldo disponible no cubre una cuota completa.");
  if (input.diasMoraActual > 0) razones.push("Existe atraso actual, por lo que el riesgo de deterioro aumenta.");
  if (input.nroCreditos > 2) razones.push("El socio mantiene varias obligaciones y puede estar sobreendeudado.");
  if (!razones.length) razones.push("La carga financiera y la liquidez se mantienen en rangos manejables.");

  const recomendaciones = probabilidadMora >= 0.68
    ? ["Contactar antes del vencimiento.", "Revisar fecha real de ingreso y posible reestructuracion temprana.", "Priorizar acuerdo de pago documentado."]
    : probabilidadMora >= 0.38
      ? ["Enviar recordatorio preventivo.", "Confirmar liquidez para la proxima cuota.", "Monitorear movimientos de ahorro durante la semana de pago."]
      : ["Mantener seguimiento normal.", "Ofrecer educacion financiera ligera si hay ingresos variables."];

  return {
    probabilidadMora,
    probabilidadRecuperacion,
    riesgo: riskBand(probabilidadMora),
    razones,
    recomendaciones
  };
};

export const buildRiskRow = (credit: Record<string, string>, saving?: Record<string, string>): ClientRiskRow => {
  const montoCredito = safeNumber(credit.monto_credito);
  const saldoCapital = safeNumber(credit.saldo_capital);
  const ingresos = safeNumber(credit.ingresos_socio || saving?.ingresos);
  const egresos = safeNumber(credit.egresos_socio || saving?.egresos);
  const nroCuotas = safeNumber(credit.nro_cuotas, 1);
  const plazo = safeNumber(credit.plazo, nroCuotas);
  const diasMoraActual = safeNumber(credit.dias_mora);
  const tasaInteres = safeNumber(credit.tasa_int_vig || credit.tasa_int_con);
  const saldoAhorro = safeNumber(saving?.saldo_disponible);
  const nroCreditos = safeNumber(credit.nro_creditos);
  const diaPago = Math.max(1, Math.min(31, safeNumber(credit.dia_pago, 15)));
  const today = new Date();
  const paymentDate = new Date(today.getFullYear(), today.getMonth(), diaPago);
  if (paymentDate.getTime() < today.getTime()) paymentDate.setMonth(paymentDate.getMonth() + 1);
  const diasHastaPago = Math.max(0, Math.ceil((paymentDate.getTime() - today.getTime()) / 86400000));
  const avanceCuotas = montoCredito > 0 ? 1 - saldoCapital / montoCredito : 0;
  const cuotasPendientes = Math.max(1, Math.round(plazo * (1 - clamp(avanceCuotas, 0, 0.95))));
  const cuotaEstimada = estimateInstallment(saldoCapital, cuotasPendientes, tasaInteres);

  const simulation = scoreSimulation({
    montoCredito,
    saldoCapital,
    ingresos,
    egresos,
    saldoAhorro,
    numeroCuotas: cuotasPendientes,
    pagoPorCuota: cuotaEstimada,
    diasHastaPago,
    diasMoraActual,
    tasaInteres,
    nroCreditos
  });

  return {
    clienteId: credit.nro_cliente?.trim() || "Sin cliente",
    operacionId: credit.nro_operacion?.trim() || "Sin operacion",
    destinoOp: credit.destino_op?.trim() || "Sin destino",
    actividad: credit.actividad_socio?.trim() || "Actividad no registrada",
    probabilidadMora: simulation.probabilidadMora,
    probabilidadRecuperacion: simulation.probabilidadRecuperacion,
    diasHastaPago,
    riesgo: simulation.riesgo,
    cuotaEstimada,
    ingresos,
    egresos,
    saldoCapital,
    saldoAhorro,
    diasMoraActual,
    explicacion: simulation.razones
  };
};
