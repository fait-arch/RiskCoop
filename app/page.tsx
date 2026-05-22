"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Calculator,
  CircleDollarSign,
  Gauge,
  MessageSquareText,
  RefreshCcw,
  Search,
  Send,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  Users
} from "lucide-react";
import {
  ClientRiskRow,
  DashboardPayload,
  RiskBand,
  SimulationInput,
  SimulationOutput
} from "@/lib/types";

/* ── Formatters ── */
const currency = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});
const percent = (v: number) => `${Math.round(v * 100)}%`;

const riskFilters = ["Todos", "Alto", "Medio", "Bajo"] as const;

/* Mapeo riesgo → clase CSS (definida en globals.css) */
const riskClass: Record<RiskBand, string> = {
  Alto: "riskHigh",
  Medio: "riskMedium",
  Bajo: "riskLow"
};

/* ══════════════════════════════════
   Metric card
══════════════════════════════════ */
function Metric({
  icon,
  label,
  value,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "danger" | "success" | "warning";
}) {
  return (
    <article className={`metric ${tone ?? ""}`}>
      <div className="metricIcon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

/* ══════════════════════════════════
   Risk bar (MD3 Linear Progress)
══════════════════════════════════ */
function RiskBar({
  label,
  value,
  total
}: {
  label: RiskBand;
  value: number;
  total: number;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="riskBar">
      <div className="riskBarLabel">
        <span>{label} riesgo</span>
        <strong>{value.toLocaleString("es-EC")} socios</strong>
      </div>
      <div
        className="barTrack"
        role="meter"
        aria-label={`${label}: ${pct}%`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className={riskClass[label]} style={{ ["--w" as any]: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   TextField (MD3 Filled)
══════════════════════════════════ */
function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

/* ══════════════════════════════════
   Simulator panel
══════════════════════════════════ */
function Simulator({ selected }: { selected?: ClientRiskRow }) {
  const [form, setForm] = useState<SimulationInput>({
    montoCredito: 8500,
    saldoCapital: 4200,
    ingresos: 750,
    egresos: 520,
    saldoAhorro: 80,
    numeroCuotas: 24,
    pagoPorCuota: 220,
    diasHastaPago: 8,
    diasMoraActual: 0,
    tasaInteres: 15.5,
    nroCreditos: 1
  });
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setForm({
      clienteId: selected.clienteId,
      montoCredito: Math.round(selected.saldoCapital + selected.cuotaEstimada * 6),
      saldoCapital: Math.round(selected.saldoCapital),
      ingresos: Math.round(selected.ingresos),
      egresos: Math.round(selected.egresos),
      saldoAhorro: Math.round(selected.saldoAhorro),
      numeroCuotas: 24,
      pagoPorCuota: Math.round(selected.cuotaEstimada),
      diasHastaPago: selected.diasHastaPago,
      diasMoraActual: selected.diasMoraActual,
      tasaInteres: 15.5,
      nroCreditos: 1
    });
    setResult(null);
  }, [selected]);

  const update = (key: keyof SimulationInput, v: number) =>
    setForm((cur) => ({ ...cur, [key]: v }));

  const simulate = async () => {
    setLoading(true);
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setResult(await res.json());
    setLoading(false);
  };

  const currentRisk = (result?.riesgo ?? selected?.riesgo ?? "Medio") as RiskBand;

  return (
    <div id="simulador" className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Simulador por socio</p>
          <h3>Modificar cuotas y recalcular mora</h3>
        </div>
        <span className={`pill ${riskClass[currentRisk]}`}>{currentRisk}</span>
      </div>

      <div className="clientSnapshot">
        <strong>{selected ? `Socio ${selected.clienteId}` : "Escenario manual"}</strong>
        <span>
          {selected
            ? `Operación ${selected.operacionId} · pago en ${selected.diasHastaPago} días`
            : "Ajusta las variables y presiona recalcular"}
        </span>
      </div>

      <div className="formGrid">
        <Field label="Número de cuotas" value={form.numeroCuotas}   onChange={(v) => update("numeroCuotas", v)} />
        <Field label="Pago por cuota"   value={form.pagoPorCuota}   onChange={(v) => update("pagoPorCuota", v)} />
        <Field label="Ingresos socio"   value={form.ingresos}       onChange={(v) => update("ingresos", v)} />
        <Field label="Egresos socio"    value={form.egresos}        onChange={(v) => update("egresos", v)} />
        <Field label="Saldo disponible" value={form.saldoAhorro}    onChange={(v) => update("saldoAhorro", v)} />
        <Field label="Saldo capital"    value={form.saldoCapital}   onChange={(v) => update("saldoCapital", v)} />
        <Field label="Días hasta pago"  value={form.diasHastaPago}  onChange={(v) => update("diasHastaPago", v)} />
        <Field label="Días mora actual" value={form.diasMoraActual} onChange={(v) => update("diasMoraActual", v)} />
      </div>

      <button className="primaryButton" onClick={simulate} disabled={loading}>
        <RefreshCcw size={18} />
        {loading ? "Recalculando..." : "Recalcular probabilidad"}
      </button>

      {result && (
        <div className="scenarioResult">
          <div>
            <span>Nueva probabilidad de mora</span>
            <strong>{percent(result.probabilidadMora)}</strong>
          </div>
          <span className={`pill ${riskClass[result.riesgo]}`}>{result.riesgo}</span>
          <p>{result.razones.join(" · ")}</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   Chatbot panel
══════════════════════════════════ */
function Chatbot({ selected }: { selected?: ClientRiskRow }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Listo para consultar Supabase, el modelo predictivo o explicar factores de mora."
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
          <div
            className={`message ${m.role === "user" ? "user" : "bot"}`}
            key={`${m.role}-${i}`}
          >
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

/* ══════════════════════════════════
   HOME PAGE
══════════════════════════════════ */
export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [selected, setSelected]   = useState<ClientRiskRow | undefined>();
  const [search, setSearch]               = useState("");
  const [riskFilter, setRiskFilter]       = useState<(typeof riskFilters)[number]>("Todos");
  const [destinationFilter, setDestinationFilter] = useState("Todos");
  const [maxDaysFilter, setMaxDaysFilter] = useState("Todos");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((payload: DashboardPayload) => {
        setDashboard(payload);
        setSelected(payload.rows[0]);
      });
  }, []);

  const rows = dashboard?.rows ?? [];

  const riskCounts = useMemo(() => {
    const buckets = dashboard?.moraBuckets ?? [];
    const count = (label: string) =>
      buckets.find((b) => b.label === label)?.count ?? 0;
    return {
      Alto:  count("81-100%"),
      Medio: count("41-60%") + count("61-80%"),
      Bajo:  count("0-20%")  + count("21-40%")
    };
  }, [dashboard?.moraBuckets]);

  const riskTotal = riskCounts.Alto + riskCounts.Medio + riskCounts.Bajo;

  const destinations = useMemo(
    () => ["Todos", ...Array.from(new Set(rows.map((r) => r.destinoOp)))],
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const maxDays = maxDaysFilter === "Todos" ? null : Number(maxDaysFilter);
    return rows
      .filter((row) => {
        const matchSearch =
          !q ||
          row.clienteId.toLowerCase().includes(q) ||
          row.operacionId.toLowerCase().includes(q) ||
          row.destinoOp.toLowerCase().includes(q);
        const matchRisk  = riskFilter === "Todos" || row.riesgo === riskFilter;
        const matchDest  = destinationFilter === "Todos" || row.destinoOp === destinationFilter;
        const matchDays  = maxDays === null || row.diasHastaPago <= maxDays;
        return matchSearch && matchRisk && matchDest && matchDays;
      })
      .slice(0, 40);
  }, [destinationFilter, maxDaysFilter, riskFilter, rows, search]);

  if (!dashboard) {
    return <main className="loading">Cargando riesgo cooperativo...</main>;
  }

  return (
    <main className="pageShell">

      {/* ── Navigation Rail (MD3) ── */}
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brandBlock">
          <div className="brandMark">
            <Gauge size={22} />
          </div>
          <h1>RiskCoop</h1>
        </div>

        <nav className="navStack">
          <a href="#resumen"   className="navItem active" aria-current="page">
            <Activity size={20} aria-hidden />
            <span>Resumen</span>
          </a>
          <a href="#socios"    className="navItem">
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
            {dashboard.source === "supabase" ? "Supabase" : "CSV"}
          </span>
        </div>
      </aside>

      {/* ── Content ── */}
      <section className="content">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard predictivo</p>
            <h2>Alertas de mora y recuperación</h2>
          </div>
        </header>

        {/* ── Métricas (MD3 Cards) ── */}
        <section id="resumen" aria-label="Métricas principales" className="metricGrid">
          <Metric
            icon={<Users size={20} />}
            label="Operaciones monitoreadas"
            value={dashboard.summary.operaciones.toLocaleString("es-EC")}
          />
          <Metric
            icon={<AlertTriangle size={20} />}
            label="Probabilidad mora promedio"
            value={percent(dashboard.summary.probabilidadMoraPromedio)}
            tone="danger"
          />
          <Metric
            icon={<TrendingUp size={20} />}
            label="Recuperación promedio"
            value={percent(dashboard.summary.probabilidadRecuperacionPromedio)}
            tone="success"
          />
          <Metric
            icon={<CircleDollarSign size={20} />}
            label="Exposición capital"
            value={currency.format(dashboard.summary.exposicionCapital)}
            tone="warning"
          />
        </section>

        {/* ── Grid principal ── */}
        <section className="mainGrid" aria-label="Distribución de riesgo">
          {/* Barras de riesgo */}
          <div className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Distribución</p>
                <h3>Socios por nivel de riesgo</h3>
              </div>
              <span className="panelIcon"><BarChart3 size={20} aria-hidden /></span>
            </div>
            <div className="riskBars">
              <RiskBar label="Alto"  value={riskCounts.Alto}  total={riskTotal} />
              <RiskBar label="Medio" value={riskCounts.Medio} total={riskTotal} />
              <RiskBar label="Bajo"  value={riskCounts.Bajo}  total={riskTotal} />
            </div>
          </div>

          {/* Destinos */}
          <div className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Destino operación</p>
                <h3>Más propensos a mora</h3>
              </div>
              <span className="panelIcon"><Activity size={20} aria-hidden /></span>
            </div>
            <div className="destinationList">
              {dashboard.destinationRisks.slice(0, 5).map((item) => (
                <div className="destinationRow" key={item.destino}>
                  <div>
                    <strong>{item.destino}</strong>
                    <span>{item.operaciones.toLocaleString("es-EC")} operaciones</span>
                  </div>
                  <div
                    className="miniBar"
                    aria-label={`${percent(item.probabilidadPromedio)} de probabilidad`}
                  >
                    <span style={{ ["--w" as any]: `${item.probabilidadPromedio * 100}%` }} />
                  </div>
                  <b>{percent(item.probabilidadPromedio)}</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tabla de socios ── */}
        <section id="socios" className="panel" aria-label="Cartera priorizada">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Cartera priorizada</p>
              <h3>Socios con probabilidad y días de pago</h3>
            </div>
            <span className="panelIcon"><Users size={20} aria-hidden /></span>
          </div>

          {/* Controles MD3 */}
          <div className="tableControls">
            <div className="searchBox">
              <Search size={20} aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar socio, operación o destino"
                aria-label="Buscar en la cartera"
              />
            </div>

            <label className="selectFilter" aria-label="Filtrar por riesgo">
              <SlidersHorizontal size={16} aria-hidden />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as typeof riskFilter)}
              >
                {riskFilters.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            <label className="selectFilter" aria-label="Filtrar por destino de operación">
              <select
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
              >
                {destinations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>

            <label className="selectFilter" aria-label="Filtrar por días hasta pago">
              <select
                value={maxDaysFilter}
                onChange={(e) => setMaxDaysFilter(e.target.value)}
              >
                <option value="Todos">Todos los días</option>
                <option value="7">0 – 7 días</option>
                <option value="15">0 – 15 días</option>
                <option value="30">0 – 30 días</option>
              </select>
            </label>
          </div>

          {/* Tabla MD3 */}
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Socio</th>
                  <th scope="col">Operación</th>
                  <th scope="col">Destino OP</th>
                  <th scope="col">Prob. mora</th>
                  <th scope="col">Días pago</th>
                  <th scope="col">Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={`${row.clienteId}-${row.operacionId}`}
                    onClick={() => setSelected(row)}
                    aria-selected={selected?.clienteId === row.clienteId}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(row)}
                  >
                    <td>{row.clienteId}</td>
                    <td>{row.operacionId}</td>
                    <td>{row.destinoOp}</td>
                    <td>{percent(row.probabilidadMora)}</td>
                    <td>{row.diasHastaPago}</td>
                    <td>
                      <span className={`pill ${riskClass[row.riesgo]}`}>
                        {row.riesgo}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length && (
                  <tr>
                    <td colSpan={6} className="emptyTable">
                      No hay socios que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Simulador + Chat ── */}
        <section className="lowerGrid">
          <Simulator selected={selected} />
          <Chatbot   selected={selected} />
        </section>

      </section>
    </main>
  );
}