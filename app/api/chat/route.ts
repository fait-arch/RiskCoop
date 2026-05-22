import { NextRequest, NextResponse } from "next/server";
import { executeChatTool, functionDeclarations } from "@/lib/chatTools";

const geminiModel = "gemini-2.5-flash";

const toPlainText = (value: string) =>
  value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .trim();

const compactMessages = (messages: { role: string; content: string }[] = []) =>
  messages
    .slice(-6)
    .map((message) => `${message.role === "user" ? "Asesor" : "Asistente"}: ${message.content}`)
    .join("\n");

const callGemini = async (body: unknown) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errorText.slice(0, 300)}`);
  }

  return response.json();
};

const getTextFromResponse = (data: any) =>
  data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part.text)
    .filter(Boolean)
    .join("\n") ?? "";

const getFunctionCalls = (data: any) =>
  data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part.functionCall)
    .filter(Boolean) ?? [];

export async function POST(request: NextRequest) {
  const { messages, selectedClientId } = await request.json();
  const latest = messages?.at(-1)?.content ?? "";

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      reply: "GEMINI_API_KEY no esta configurada. Agregala en .env como GEMINI_API_KEY=tu_clave."
    });
  }

  const systemPrompt =
    "Eres un asistente experto para asesores de una cooperativa ecuatoriana. " +
    "Puedes consultar Supabase usando funciones seguras del backend cuando necesites datos reales de socios, operaciones, ahorro, transacciones, resumen de riesgo o destinos. " +
    "No inventes datos. Si no hay datos suficientes, dilo claramente. " +
    "Las predicciones de mora y recuperacion vienen de la API predictiva conectada a los modelos; si la API falla, no inventes probabilidades. " +
    "Responde siempre en texto plano. No uses Markdown, negritas, encabezados, tablas, bullets, numeracion ni bloques de codigo. " +
    "Si hay un socio seleccionado, puedes usarlo cuando la pregunta diga este socio, el socio actual o algo similar.";

  const userPrompt =
    `${systemPrompt}\n\n` +
    `Socio seleccionado en la interfaz: ${selectedClientId ?? "ninguno"}\n\n` +
    `Conversacion reciente:\n${compactMessages(messages)}\n\n` +
    `Pregunta actual del asesor: ${latest}`;

  const baseContent = {
    role: "user",
    parts: [{ text: userPrompt }]
  };

  const firstBody = {
    contents: [baseContent],
    tools: [{ functionDeclarations }],
    toolConfig: {
      functionCallingConfig: {
        mode: "AUTO"
      }
    },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024
    }
  };

  try {
    const firstData = await callGemini(firstBody);
    const functionCalls = getFunctionCalls(firstData);

    if (!functionCalls.length) {
      const directReply = getTextFromResponse(firstData) || "No encontre una respuesta util con el contexto disponible.";
      return NextResponse.json({ reply: toPlainText(directReply) });
    }

    const toolResults = await Promise.all(
      functionCalls.slice(0, 4).map(async (call: any) => ({
        name: call.name,
        result: await executeChatTool(call.name, call.args ?? {})
      }))
    );

    const modelContent = firstData.candidates?.[0]?.content;
    const secondBody = {
      contents: [
        baseContent,
        modelContent,
        {
          role: "user",
          parts: toolResults.map((tool) => ({
            functionResponse: {
              name: tool.name,
              response: {
                result: tool.result
              }
            }
          }))
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1400
      }
    };

    const secondData = await callGemini(secondBody);
    const reply = getTextFromResponse(secondData) || "No encontre una respuesta util con los datos consultados.";

    return NextResponse.json({ reply: toPlainText(reply) });
  } catch (error) {
    console.error("[chat] function calling error:", error);
    return NextResponse.json(
      {
        reply: `No pude completar la consulta del asistente: ${
          error instanceof Error ? error.message : String(error)
        }`
      },
      { status: 502 }
    );
  }
}
