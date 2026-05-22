import { promises as fs } from "fs";
import path from "path";
import { buildRiskRow } from "./riskModel";
import { ClientRiskRow, DashboardPayload, DestinationRisk } from "./types";

const root = process.cwd();

const splitCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
};

const repairMojibake = (value: string) => {
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
};

const parseCsv = async (filePath: string, limit = 4000) => {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1, limit + 1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = repairMojibake(values[index]?.trim() ?? "");
      return row;
    }, {});
  });
};

const bucketize = (rows: ClientRiskRow[], key: "probabilidadMora" | "probabilidadRecuperacion") => {
  const buckets = [
    { label: "0-20%", min: 0, max: 0.2, count: 0 },
    { label: "21-40%", min: 0.2, max: 0.4, count: 0 },
    { label: "41-60%", min: 0.4, max: 0.6, count: 0 },
    { label: "61-80%", min: 0.6, max: 0.8, count: 0 },
    { label: "81-100%", min: 0.8, max: 1.01, count: 0 }
  ];
  rows.forEach((row) => {
    const match = buckets.find((bucket) => row[key] >= bucket.min && row[key] < bucket.max);
    if (match) match.count += 1;
  });
  return buckets.map(({ label, count }) => ({ label, count }));
};

const summarizeDestinations = (rows: ClientRiskRow[]): DestinationRisk[] => {
  const grouped = new Map<string, { operaciones: number; moraActual: number; probabilitySum: number }>();
  rows.forEach((row) => {
    const item = grouped.get(row.destinoOp) ?? { operaciones: 0, moraActual: 0, probabilitySum: 0 };
    item.operaciones += 1;
    item.moraActual += row.diasMoraActual > 0 ? 1 : 0;
    item.probabilitySum += row.probabilidadMora;
    grouped.set(row.destinoOp, item);
  });

  return Array.from(grouped.entries())
    .map(([destino, value]) => ({
      destino,
      operaciones: value.operaciones,
      moraActual: value.moraActual,
      probabilidadPromedio: value.operaciones ? value.probabilitySum / value.operaciones : 0
    }))
    .sort((a, b) => b.moraActual - a.moraActual || b.probabilidadPromedio - a.probabilidadPromedio)
    .slice(0, 8);
};

export const getLocalDashboardData = async (): Promise<DashboardPayload> => {
  const creditPath = path.join(root, "Datos_extraido_1", "Datos", "DataSabanaCred1Mayo2026.csv");
  const savingPath = path.join(root, "Datos_extraido_1", "Cleaned_Data_1", "Limpio_DatosSabanaAhorroMayo1_2026.csv");

  const [credits, savings] = await Promise.all([parseCsv(creditPath, 2500), parseCsv(savingPath, 5000)]);
  const savingsByClient = new Map(savings.map((saving) => [(saving.v_ah_cliente || "").replace(".0", ""), saving]));
  const allRows = credits
    .filter((credit) => credit.estado_op?.toUpperCase().includes("VIGENTE"))
    .map((credit) => buildRiskRow(credit, savingsByClient.get((credit.nro_cliente || "").replace(".0", ""))))
    .sort((a, b) => b.probabilidadMora - a.probabilidadMora);
  const rows = allRows.slice(0, 120);

  const probabilitySum = allRows.reduce((sum, row) => sum + row.probabilidadMora, 0);
  const recoverySum = allRows.reduce((sum, row) => sum + row.probabilidadRecuperacion, 0);
  const capitalSum = allRows.reduce((sum, row) => sum + row.saldoCapital, 0);

  return {
    generatedAt: new Date().toISOString(),
    source: "local",
    summary: {
      operaciones: allRows.length,
      clientesAltoRiesgo: allRows.filter((row) => row.riesgo === "Alto").length,
      probabilidadMoraPromedio: allRows.length ? probabilitySum / allRows.length : 0,
      probabilidadRecuperacionPromedio: allRows.length ? recoverySum / allRows.length : 0,
      exposicionCapital: capitalSum
    },
    moraBuckets: bucketize(allRows, "probabilidadMora"),
    recoveryBuckets: bucketize(allRows, "probabilidadRecuperacion"),
    destinationRisks: summarizeDestinations(allRows),
    rows
  };
};
