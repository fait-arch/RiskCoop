import { predictRiskRows } from "./predictionApi";
import { fetchDashboardFromSupabase } from "./supabaseRest";

type JsonRow = Record<string, unknown>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY;

const headers = {
  apikey: supabaseKey ?? "",
  Authorization: `Bearer ${supabaseKey ?? ""}`
};

const clampLimit = (value: unknown, fallback = 10, max = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(Math.floor(parsed), max));
};

const cleanId = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/[^\w.-]/g, "")
    .slice(0, 40);

const supabaseFetch = async <T>(path: string): Promise<T> => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan credenciales de Supabase en el servidor.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase ${response.status}: ${errorText.slice(0, 200)}`);
  }

  return response.json();
};

const byClientPath = (table: string, clientId: string, select = "*", extra = "") =>
  `${table}?select=${encodeURIComponent(select)}&nro_socio=eq.${encodeURIComponent(clientId)}${extra}`;

export const functionDeclarations = [
  {
    name: "get_client_profile",
    description:
      "Obtiene informacion integral de un socio por nro_socio o clienteId: datos personales, operaciones de credito, cuentas de ahorro, transacciones recientes y perfil de riesgo calculado.",
    parameters: {
      type: "object",
      properties: {
        cliente_id: {
          type: "string",
          description: "Numero de socio o cliente. Ejemplo: 2000465."
        }
      },
      required: ["cliente_id"]
    }
  },
  {
    name: "get_recent_transactions",
    description: "Obtiene transacciones recientes de un socio especifico desde Supabase.",
    parameters: {
      type: "object",
      properties: {
        cliente_id: { type: "string", description: "Numero de socio o cliente." },
        limite: { type: "integer", description: "Numero maximo de transacciones. Maximo 50." }
      },
      required: ["cliente_id"]
    }
  },
  {
    name: "get_risk_summary",
    description: "Obtiene resumen agregado de la cartera: operaciones, alto riesgo, mora promedio, recuperacion y capital expuesto.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_destination_risk",
    description:
      "Obtiene destinos de operacion con mayor riesgo de mora o filtra un destino especifico si el usuario pregunta por una actividad concreta.",
    parameters: {
      type: "object",
      properties: {
        destino: {
          type: "string",
          description: "Nombre parcial o completo del destino de operacion. Opcional."
        },
        limite: {
          type: "integer",
          description: "Numero maximo de destinos o socios a devolver. Maximo 20."
        }
      }
    }
  },
  {
    name: "get_priority_clients",
    description:
      "Obtiene socios prioritarios por riesgo, probabilidad de mora, recuperacion y proximidad de pago.",
    parameters: {
      type: "object",
      properties: {
        riesgo: {
          type: "string",
          enum: ["Alto", "Medio", "Bajo", "Todos"],
          description: "Nivel de riesgo a filtrar."
        },
        limite: {
          type: "integer",
          description: "Numero maximo de socios. Maximo 30."
        }
      }
    }
  }
];

export const executeChatTool = async (name: string, args: Record<string, unknown>) => {
  if (name === "get_client_profile") {
    const clientId = cleanId(args.cliente_id);
    const [clientes, operaciones, cuentas, transacciones] = await Promise.all([
      supabaseFetch<JsonRow[]>(byClientPath("clientes", clientId, "*", "&limit=1")),
      supabaseFetch<JsonRow[]>(byClientPath("operaciones_credito", clientId, "*", "&limit=20")),
      supabaseFetch<JsonRow[]>(byClientPath("cuentas_ahorro", clientId, "*", "&limit=10")),
      supabaseFetch<JsonRow[]>(
        byClientPath("transacciones", clientId, "*", "&order=fecha_trn.desc&limit=12")
      )
    ]);

    const riskRows = await predictRiskRows(operaciones, clientes, cuentas, transacciones);

    return {
      cliente_id: clientId,
      cliente: clientes[0] ?? null,
      operaciones,
      cuentas_ahorro: cuentas,
      transacciones_recientes: transacciones,
      perfil_riesgo: riskRows,
      nota_prediccion: "Prediccion obtenida desde la API de modelos configurada."
    };
  }

  if (name === "get_recent_transactions") {
    const clientId = cleanId(args.cliente_id);
    const limit = clampLimit(args.limite, 12, 50);
    const rows = await supabaseFetch<JsonRow[]>(
      byClientPath("transacciones", clientId, "*", `&order=fecha_trn.desc&limit=${limit}`)
    );
    return { cliente_id: clientId, transacciones: rows };
  }

  if (name === "get_risk_summary") {
    const dashboard = await fetchDashboardFromSupabase();
    return {
      resumen: dashboard.summary,
      distribucion_mora: dashboard.moraBuckets,
      distribucion_recuperacion: dashboard.recoveryBuckets,
      destinos_mayor_riesgo: dashboard.destinationRisks,
      nota:
        "Las operaciones con mora actual se excluyen de la prediccion de caida futura; se tratan como gestion de mora y recuperacion.",
      muestra_prioritaria: dashboard.rows.slice(0, 10)
    };
  }

  if (name === "get_destination_risk") {
    const dashboard = await fetchDashboardFromSupabase();
    const limit = clampLimit(args.limite, 8, 20);
    const destino = String(args.destino ?? "").trim().toLowerCase();

    if (destino) {
      const rows = dashboard.rows
        .filter((row) => row.destinoOp.toLowerCase().includes(destino))
        .slice(0, limit);
      return {
        destino_consultado: args.destino,
        operaciones_encontradas: rows.length,
        socios: rows
      };
    }

    return {
      destinos: dashboard.destinationRisks.slice(0, limit)
    };
  }

  if (name === "get_priority_clients") {
    const dashboard = await fetchDashboardFromSupabase();
    const limit = clampLimit(args.limite, 10, 30);
    const riesgo = String(args.riesgo ?? "Todos");
    const rows = dashboard.rows
      .filter((row) => riesgo === "Todos" || row.riesgo === riesgo)
      .sort(
        (a, b) =>
          b.probabilidadMora - a.probabilidadMora ||
          a.probabilidadRecuperacion - b.probabilidadRecuperacion ||
          a.diasHastaPago - b.diasHastaPago
      )
      .slice(0, limit);

    return { riesgo, socios: rows };
  }

  return { error: `Funcion no permitida: ${name}` };
};
