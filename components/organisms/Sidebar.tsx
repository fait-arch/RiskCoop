import { Activity, Bot, Calculator, Gauge, Shield, Users } from "lucide-react";

interface SidebarProps {
  source: "local" | "supabase";
}

export function Sidebar({ source }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Navegacion principal">
      <div className="brandBlock">
        <div className="brandMark">
          <Gauge size={22} />
        </div>
        <h1>RiskCoop</h1>
      </div>

      <nav className="navStack">
        <a href="#resumen" className="navItem active" aria-current="page">
          <Activity size={20} aria-hidden />
          <span>Resumen</span>
        </a>
        <a href="#socios" className="navItem">
          <Users size={20} aria-hidden />
          <span>Socios</span>
        </a>
        <a href="#simulador" className="navItem">
          <Calculator size={20} aria-hidden />
          <span>Simular</span>
        </a>
        <a href="#asistente" className="navItem">
          <Bot size={20} aria-hidden />
          <span>IA</span>
        </a>
      </nav>

      <div className="modelNote">
        <p>Ventana base</p>
        <strong>Mayo 2026</strong>
        <span className="sourceTag">
          <Shield size={10} aria-hidden />
          {source === "supabase" ? "Supabase" : "CSV"}
        </span>
      </div>
    </aside>
  );
}
