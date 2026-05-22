"use client";

import { MessageSquareText, Send } from "lucide-react";
import { useChat } from "@/components/hooks/useChat";
import type { ClientRiskRow } from "@/lib/types";

interface ChatbotProps {
  selected?: ClientRiskRow;
}

export function Chatbot({ selected }: ChatbotProps) {
  const { messages, input, setInput, loading, send } = useChat(selected);

  return (
    <div id="asistente" className="panel chatPanel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Asistente IA</p>
          <h3>Consultas a Supabase y modelo</h3>
        </div>
        <span className="panelIcon">
          <MessageSquareText size={20} />
        </span>
      </div>

      <div className="messages" aria-live="polite" aria-label="Mensajes del asistente">
        {messages.map((m, i) => (
          <div className={`message ${m.role === "user" ? "user" : "bot"}`} key={`${m.role}-${i}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="message bot" aria-busy="true">
            Analizando contexto...
          </div>
        )}
      </div>

      <form className="chatInput" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej: ¿qué destino tiene más mora?"
          aria-label="Mensaje al asistente"
        />
        <button type="submit" aria-label="Enviar mensaje">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
