"use client";

import { FormEvent, useState } from "react";
import type { ClientRiskRow } from "@/lib/types";

export function useChat(selected?: ClientRiskRow) {
  const initialMessages = [
    {
      role: "assistant",
      content: "Listo para consultar Supabase, el modelo predictivo o explicar factores de mora.",
    },
  ];
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const clear = () => {
    setMessages(initialMessages);
    setInput("");
    setLoading(false);
  };

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const next = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      // ── Bug 3 corregido: method + Content-Type header faltaban ──
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, selectedClientId: selected?.clienteId }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error("[useChat] send error:", err);
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Hubo un error al consultar el asistente. Intenta de nuevo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, input, setInput, loading, send, clear };
}
