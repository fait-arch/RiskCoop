import { DashboardPayload } from "./types";
import { predictRiskRows } from "./predictionApi";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const fetchSupabaseContext = async (question: string) => {
  if (!hasSupabaseConfig) return "";

  const response = await fetch(`${supabaseUrl}/rest/v1/risk_alerts?select=*&limit=20`, {
    headers: {
      apikey: supabaseAnonKey!,
      Authorization: `Bearer ${supabaseAnonKey}`
    },
    cache: "no-store"
  });

  if (!response.ok) return "";
  const rows = await response.json();
  return `Pregunta del asesor: ${question}\nRegistros relevantes desde Supabase:\n${JSON.stringify(rows).slice(0, 6000)}`;
};

const supabaseHeaders = {
  apikey: supabaseAnonKey ?? "",
  Authorization: `Bearer ${supabaseAnonKey ?? ""}`
};

const bucketize = (
  rows: DashboardPayload["rows"],
  key: "probabilidadMora" | "probabilidadRecuperacion"
) => {
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

const summarizeDestinations = (rows: DashboardPayload["rows"]) => {
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

const predictiveRows = (rows: DashboardPayload["rows"]) => rows.filter((row) => row.riesgo !== "En mora");
const delinquentRows = (rows: DashboardPayload["rows"]) => rows.filter((row) => row.riesgo === "En mora");

const fetchJson = async <T>(path: string): Promise<T> => {
  if (!hasSupabaseConfig) {
    throw new Error("Faltan SUPABASE_URL/SUPABASE_ANON_KEY o sus equivalentes NEXT_PUBLIC.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      ...supabaseHeaders
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase ${response.status}: ${errorText.slice(0, 240)}`);
  }

  return response.json();
};

const fetchFirstAvailable = async (
  tableNames: string[],
  limit: number,
  required = true
): Promise<{ table: string; rows: Record<string, unknown>[] }> => {
  const errors: string[] = [];

  for (const table of tableNames) {
    try {
      const rows = await fetchJson<Record<string, unknown>[]>(`${table}?select=*&limit=${limit}`);
      return { table, rows };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${table}: ${message}`);
      if (!message.includes("PGRST205") && !message.includes("404")) {
        throw error;
      }
    }
  }

  if (required) {
    throw new Error(`No encontre tablas compatibles en Supabase. Intentos: ${errors.join(" | ")}`);
  }

  return { table: "", rows: [] };
};

export const fetchDashboardFromSupabase = async (): Promise<DashboardPayload> => {
  const [creditSource, savingSource, clientSource, transactionSource] = await Promise.all([
    fetchFirstAvailable(
      [
        "operaciones_credito",
        "creditos",
        "credito",
        "synthetic_creditos",
        "synthetic_creditos_500",
        "creditos_sinteticos",
        "sintetico_creditos",
        "prestamos",
        "operaciones",
        "clientes"
      ],
      2500
    ),
    fetchFirstAvailable(
      ["cuentas_ahorro", "ahorros_clientes_credito", "ahorros", "ahorro", "synthetic_ahorro", "synthetic_ahorro_500"],
      5000,
      false
    ),
    fetchFirstAvailable(["clientes", "synthetic_clientes", "socios"], 5000, false),
    fetchFirstAvailable(["transacciones", "transacciones_clientes_credito", "synthetic_transacciones"], 10000, false)
  ]);

  const hasOperationStatus = creditSource.rows.some((credit) => "estado_op" in credit);
  const activeCredits = creditSource.rows.filter(
    (credit) => !hasOperationStatus || String(credit.estado_op ?? "").toUpperCase().includes("VIGENTE")
  );
  const allRows = (await predictRiskRows(
    activeCredits,
    clientSource.rows,
    savingSource.rows,
    transactionSource.rows
  ))
    .sort((a, b) => b.probabilidadMora - a.probabilidadMora);

  if (!allRows.length) {
    throw new Error(
      `Supabase respondio, pero no hay filas visibles en ${creditSource.table} para construir el dashboard.`
    );
  }

  const rowsForPrediction = predictiveRows(allRows);
  const rowsInMora = delinquentRows(allRows);
  const probabilitySum = rowsForPrediction.reduce((sum, row) => sum + row.probabilidadMora, 0);
  const recoverySum = allRows.reduce((sum, row) => sum + row.probabilidadRecuperacion, 0);
  const capitalSum = allRows.reduce((sum, row) => sum + row.saldoCapital, 0);

  return {
    generatedAt: new Date().toISOString(),
    source: "supabase",
    summary: {
      operaciones: allRows.length,
      operacionesEnMora: rowsInMora.length,
      clientesAltoRiesgo: rowsForPrediction.filter((row) => row.riesgo === "Alto").length,
      probabilidadMoraPromedio: rowsForPrediction.length ? probabilitySum / rowsForPrediction.length : 0,
      probabilidadRecuperacionPromedio: recoverySum / allRows.length,
      exposicionCapital: capitalSum
    },
    moraBuckets: bucketize(rowsForPrediction, "probabilidadMora"),
    recoveryBuckets: bucketize(allRows, "probabilidadRecuperacion"),
    destinationRisks: summarizeDestinations(rowsForPrediction),
    rows: allRows
  };
};
