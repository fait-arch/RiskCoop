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
      razones: row.explicacion,
    })),
  };

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      reply:
        "GEMINI_API_KEY no está configurada. Agrégala en .env.local como GEMINI_API_KEY=tu_clave.",
    });
  }

  const prompt =
    "Eres un asistente experto para asesores de una cooperativa ecuatoriana. " +
    "Responde solo con base en el contexto provisto, explica razones financieras y evita dar decisiones discriminatorias. " +
    `Contexto local: ${JSON.stringify(compactContext)}\n${supabaseContext}\nPregunta: ${latest}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
    },
  };

  // LOG para diagnóstico — eliminar en producción
  console.log("[chat] GEMINI_API_KEY presente:", !!process.env.GEMINI_API_KEY);
  console.log("[chat] Key (primeros 8 chars):", process.env.GEMINI_API_KEY?.slice(0, 8));
  console.log("[chat] Body enviado a Gemini:", JSON.stringify(body).slice(0, 300));

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  } catch (err) {
    console.error("[chat] fetch network error:", err);
    return NextResponse.json(
      { reply: `Error de red al conectar con Gemini: ${String(err)}` },
      { status: 502 }
    );
  }

  // LOG del status real de Gemini
  console.log("[chat] Gemini status:", response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    // LOG del cuerpo del error — esto te dirá exactamente qué falla
    console.error("[chat] Gemini error body:", errorText);

    // Devolver el error real al cliente para diagnosticar
    return NextResponse.json(
      {
        reply: `Error Gemini ${response.status}: ${errorText.slice(0, 300)}`,
        debug: { status: response.status, body: errorText.slice(0, 500) },
      },
      { status: 502 }
    );
  }

  const data = await response.json();
  console.log("[chat] Gemini candidates:", JSON.stringify(data.candidates?.[0])?.slice(0, 200));

  const reply =
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    "No encontré una respuesta útil con el contexto disponible.";

  return NextResponse.json({ reply });
}