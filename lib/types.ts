export type RiskBand = "Alto" | "Medio" | "Bajo" | "En mora";

export type ClientRiskRow = {
  clienteId: string;
  operacionId: string;
  destinoOp: string;
  actividad: string;
  probabilidadMora: number;
  probabilidadRecuperacion: number;
  diasHastaPago: number;
  riesgo: RiskBand;
  cuotaEstimada: number;
  ingresos: number;
  egresos: number;
  saldoCapital: number;
  saldoAhorro: number;
  diasMoraActual: number;
  explicacion: string[];
};

export type DestinationRisk = {
  destino: string;
  operaciones: number;
  moraActual: number;
  probabilidadPromedio: number;
};

export type DashboardPayload = {
  generatedAt: string;
  source: "local" | "supabase";
  summary: {
    operaciones: number;
    operacionesEnMora: number;
    clientesAltoRiesgo: number;
    probabilidadMoraPromedio: number;
    probabilidadRecuperacionPromedio: number;
    exposicionCapital: number;
  };
  moraBuckets: { label: string; count: number }[];
  recoveryBuckets: { label: string; count: number }[];
  destinationRisks: DestinationRisk[];
  rows: ClientRiskRow[];
};

export type SimulationInput = {
  clienteId?: string;
  montoCredito: number;
  saldoCapital: number;
  ingresos: number;
  egresos: number;
  saldoAhorro: number;
  numeroCuotas: number;
  pagoPorCuota: number;
  diasHastaPago: number;
  diasMoraActual: number;
  tasaInteres: number;
  nroCreditos: number;
};

export type SimulationOutput = {
  probabilidadMora: number;
  probabilidadRecuperacion: number;
  riesgo: RiskBand;
  razones: string[];
  recomendaciones: string[];
};
