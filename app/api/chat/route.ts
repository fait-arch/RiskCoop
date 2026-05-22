import { NextRequest, NextResponse } from "next/server";
import { getLocalDashboardData } from "@/lib/localData";
import { fetchSupabaseContext } from "@/lib/supabaseRest";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();
  const latest = messages?.at(-1)?.content ?? "";
  const dashboard = await getLocalDashboardData();
  const supabaseContext = await fetchSupabaseContext(latest);
  const compactContext = {
    resumen: dashboard.summary,
    destinos_mayor_mora: dashboard.destinationRisks.slice(0, 5),
    alertas_prioritarias: dashboard.rows.slice(0, 12).map((row) => ({
      cliente: row.clienteId,
      operacion: row.operacionId,
      destino: row.destinoOp,
      riesgo: row.riesgo,
      probabilidad_mora: row.probabilidadMora,
      razones: row.explicacion
    }))
  };

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      reply: "Gemini aun no esta configurado. Puedo usar el contexto local del dashboard: hay " +
        `${dashboard.summary.clientesAltoRiesgo} clientes en riesgo alto y los destinos con mas mora actual son ` +
        dashboard.destinationRisks.slice(0, 3).map((item) => item.destino).join(", ") +
        ". Configura GEMINI_API_KEY para activar respuestas generativas con Gemini 2.5 Flash."
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Eres un asistente experto para asesores de una cooperativa ecuatoriana. " +
                  "Responde solo con base en el contexto provisto, explica razones financieras y evita dar decisiones discriminatorias. " +
                  `Contexto local: ${JSON.stringify(compactContext)}\n${supabaseContext}\nPregunta: ${latest}`
              }
            ]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    return NextResponse.json({ reply: "No pude consultar Gemini en este momento. Revisa GEMINI_API_KEY o conectividad." }, { status: 502 });
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No encontre una respuesta util con el contexto disponible.";
  return NextResponse.json({ reply });
}
