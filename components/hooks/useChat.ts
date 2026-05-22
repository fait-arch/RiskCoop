"use client";

import { FormEvent, useState } from "react";
import type { ClientRiskRow } from "@/lib/types";

export function useChat(selected?: ClientRiskRow) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Listo para consultar Supabase, el modelo predictivo o explicar factores de mora."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const next = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next, selectedClientId: selected?.clienteId })
    });
    const data = await res.json();
    setMessages([...next, { role: "assistant", content: data.reply }]);
    setLoading(false);
  };

  return { messages, input, setInput, loading, send };
}
