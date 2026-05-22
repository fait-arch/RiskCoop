import { RiskBand } from "./types";

export const riskFilters = ["Todos", "Alto", "Medio", "Bajo"] as const;

export const riskClass: Record<RiskBand, string> = {
  Alto: "riskHigh",
  Medio: "riskMedium",
  Bajo: "riskLow"
};

export const maxDaysOptions = [
  { value: "Todos", label: "Todos los dias" },
  { value: "7", label: "0 - 7 dias" },
  { value: "15", label: "0 - 15 dias" },
  { value: "30", label: "0 - 30 dias" }
] as const;

export const currency = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

export const percent = (v: number) => `${Math.round(v * 100)}%`;
