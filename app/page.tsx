"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Calculator,
  CircleDollarSign,
  Gauge,
  MessageSquareText,
  RefreshCcw,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
  Users
} from "lucide-react";
import { ClientRiskRow, DashboardPayload, RiskBand, SimulationInput, SimulationOutput } from "@/lib/types";

const currency = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const riskFilters = ["Todos", "Alto", "Medio", "Bajo"] as const;

const riskClass: Record<RiskBand, string> = {
  Alto: "riskHigh",
  Medio: "riskMedium",
  Bajo: "riskLow"
};

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: "danger" | "success" }) {
  return (
    <article className={`metric ${tone ?? ""}`}>
      <div className="metricIcon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function RiskBar({ label, value, total }: { label: RiskBand; value: number; total: number }) {
  return (
    <div className="riskBar">
      <div className="riskBarLabel">
        <span>{label}</span>
        <strong>{value.toLocaleString("es-EC")} socios</strong>
      </div>
      <div className="barTrack">
        <span className={riskClass[label]} style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

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

  const update = (key: keyof SimulationInput, value: number) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const simulate = async () => {
    setLoading(true);
    const response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setResult(await response.json());
    setLoading(false);
  };

  return (
    <div id="simulador" className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Simulador por socio</p>
          <h3>Modificar cuotas y recalcular mora</h3>
        </div>
        <span className={`pill ${result ? riskClass[result.riesgo] : selected ? riskClass[selected.riesgo] : "riskMedium"}`}>
          {result?.riesgo ?? selected?.riesgo ?? "Medio"}
        </span>
      </div>

      <div className="clientSnapshot">
        <strong>{selected ? `Cliente ${selected.clienteId}` : "Escenario manual"}</strong>
        <span>{selected ? `Operacion ${selected.operacionId} | pago en ${selected.diasHastaPago} dias` : "Ajusta las variables y recalcula"}</span>
      </div>

      <div className="formGrid">
        <Field label="Numero de cuotas" value={form.numeroCuotas} onChange={(value) => update("numeroCuotas", value)} />
        <Field label="Pago por cuota" value={form.pagoPorCuota} onChange={(value) => update("pagoPorCuota", value)} />
        <Field label="Ingresos socio" value={form.ingresos} onChange={(value) => update("ingresos", value)} />
        <Field label="Egresos socio" value={form.egresos} onChange={(value) => update("egresos", value)} />
        <Field label="Saldo disponible" value={form.saldoAhorro} onChange={(value) => update("saldoAhorro", value)} />
        <Field label="Saldo capital" value={form.saldoCapital} onChange={(value) => update("saldoCapital", value)} />
        <Field label="Dias hasta pago" value={form.diasHastaPago} onChange={(value) => update("diasHastaPago", value)} />
        <Field label="Dias mora actual" value={form.diasMoraActual} onChange={(value) => update("diasMoraActual", value)} />
      </div>

      <button className="primaryButton" onClick={simulate} disabled={loading}>
        <RefreshCcw size={18} /> {loading ? "Recalculando" : "Recalcular probabilidad"}
      </button>

      {result ? (
        <div className="scenarioResult">
          <div>
            <span>Nueva probabilidad</span>
            <strong>{percent(result.probabilidadMora)}</strong>
          </div>
          <span className={`pill ${riskClass[result.riesgo]}`}>{result.riesgo}</span>
          <p>{result.razones.join(" | ")}</p>
        </div>
      ) : null}
    </div>
  );
}

function Chatbot({ selected }: { selected?: ClientRiskRow }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Listo para consultar Supabase, el modelo predictivo o explicar factores de mora." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!input.trim()) return;
    const nextMessages = [...messages, { role: "user", content: input.trim() }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: nextMessages,
        selectedClientId: selected?.clienteId
      })
    });
    const data = await response.json();
    setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    setLoading(false);
  };

  return (
    <div id="asistente" className="panel chatPanel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Chatbot analitico</p>
          <h3>Consultas a Supabase y modelo</h3>
        </div>
        <MessageSquareText size={20} />
      </div>
      <div className="messages">
        {messages.map((message, index) => (
          <div className={`message ${message.role === "user" ? "user" : "bot"}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
        {loading ? <div className="message bot">Analizando contexto...</div> : null}
      </div>
      <form className="chatInput" onSubmit={send}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ej: que destino tiene mas mora?" />
        <button type="submit" aria-label="Enviar mensaje">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [selected, setSelected] = useState<ClientRiskRow | undefined>();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<(typeof riskFilters)[number]>("Todos");
  const [destinationFilter, setDestinationFilter] = useState("Todos");
  const [maxDaysFilter, setMaxDaysFilter] = useState("Todos");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((response) => response.json())
      .then((payload: DashboardPayload) => {
        setDashboard(payload);
        setSelected(payload.rows[0]);
      });
  }, []);

  const rows = dashboard?.rows ?? [];
  const riskCounts = useMemo(
    () => {
      const buckets = dashboard?.moraBuckets ?? [];
      const bucketCount = (label: string) => buckets.find((bucket) => bucket.label === label)?.count ?? 0;
      return {
        Alto: bucketCount("81-100%"),
        Medio: bucketCount("41-60%") + bucketCount("61-80%"),
        Bajo: bucketCount("0-20%") + bucketCount("21-40%")
      };
    },
    [dashboard?.moraBuckets]
  );
  const riskTotal = riskCounts.Alto + riskCounts.Medio + riskCounts.Bajo;
  const destinations = useMemo(() => ["Todos", ...Array.from(new Set(rows.map((row) => row.destinoOp)))], [rows]);
  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const maxDays = maxDaysFilter === "Todos" ? null : Number(maxDaysFilter);

    return rows
      .filter((row) => {
        const matchesSearch =
          !normalized ||
          row.clienteId.toLowerCase().includes(normalized) ||
          row.operacionId.toLowerCase().includes(normalized) ||
          row.destinoOp.toLowerCase().includes(normalized);
        const matchesRisk = riskFilter === "Todos" || row.riesgo === riskFilter;
        const matchesDestination = destinationFilter === "Todos" || row.destinoOp === destinationFilter;
        const matchesDays = maxDays === null || row.diasHastaPago <= maxDays;
        return matchesSearch && matchesRisk && matchesDestination && matchesDays;
      })
      .slice(0, 40);
  }, [destinationFilter, maxDaysFilter, riskFilter, rows, search]);

  if (!dashboard) {
    return <main className="loading">Cargando riesgo cooperativo...</main>;
  }

  return (
    <main className="pageShell">
      <aside className="sidebar">
        <div className="brandBlock">
          <div className="brandMark">
            <Gauge size={22} />
          </div>
          <div>
            <p className="eyebrow">RiskCoop</p>
            <h1>Riesgo de mora</h1>
          </div>
        </div>

        <nav className="navStack" aria-label="Secciones del dashboard">
          <a href="#resumen" className="navItem active">
            <Activity size={17} /> Resumen
          </a>
          <a href="#socios" className="navItem">
            <Users size={17} /> Socios
          </a>
          <a href="#simulador" className="navItem">
            <Calculator size={17} /> Simulador
          </a>
          <a href="#asistente" className="navItem">
            <Bot size={17} /> Asistente
          </a>
        </nav>

        <div className="modelNote">
          <p>Ventana base</p>
          <strong>Mayo 2026</strong>
          <span>Fuente {dashboard.source === "supabase" ? "Supabase" : "CSV local"} y API predictiva.</span>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard predictivo</p>
            <h2>Alertas de mora y recuperacion por socio</h2>
          </div>
          <div className="statusBadge">
            <Bot size={18} />
            Gemini 2.5 Flash listo
          </div>
        </header>

        <section id="resumen" className="metricGrid">
          <Metric icon={<Users size={20} />} label="Operaciones monitoreadas" value={dashboard.summary.operaciones.toLocaleString("es-EC")} />
          <Metric icon={<ShieldAlert size={20} />} label="% pueden caer en mora" value={percent(dashboard.summary.probabilidadMoraPromedio)} tone="danger" />
          <Metric icon={<TrendingUp size={20} />} label="% recuperacion" value={percent(dashboard.summary.probabilidadRecuperacionPromedio)} tone="success" />
          <Metric icon={<CircleDollarSign size={20} />} label="Exposicion capital" value={currency.format(dashboard.summary.exposicionCapital)} />
        </section>

        <section className="mainGrid">
          <div className="panel wide">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Distribucion</p>
                <h3>Socios por nivel de riesgo</h3>
              </div>
            </div>
            <div className="riskBars">
              <RiskBar label="Alto" value={riskCounts.Alto} total={riskTotal} />
              <RiskBar label="Medio" value={riskCounts.Medio} total={riskTotal} />
              <RiskBar label="Bajo" value={riskCounts.Bajo} total={riskTotal} />
            </div>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Destino OP</p>
                <h3>Mas propensos a mora</h3>
              </div>
            </div>
            <div className="destinationList">
              {dashboard.destinationRisks.slice(0, 5).map((item) => (
                <div className="destinationRow" key={item.destino}>
                  <div>
                    <strong>{item.destino}</strong>
                    <span>{item.operaciones.toLocaleString("es-EC")} operaciones</span>
                  </div>
                  <div className="miniBar" aria-label={percent(item.probabilidadPromedio)}>
                    <span style={{ width: `${item.probabilidadPromedio * 100}%` }} />
                  </div>
                  <b>{percent(item.probabilidadPromedio)}</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="socios" className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Cartera priorizada</p>
              <h3>Clientes con probabilidad y dias restantes de pago</h3>
            </div>
          </div>
          <div className="tableControls">
            <div className="searchBox tableSearch">
              <Search size={18} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, operacion o destino" />
            </div>
            <label className="selectFilter">
              <SlidersHorizontal size={16} />
              <span>Riesgo</span>
              <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as typeof riskFilter)}>
                {riskFilters.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </select>
            </label>
            <label className="selectFilter destinationFilter">
              <span>Destino OP</span>
              <select value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)}>
                {destinations.map((destination) => (
                  <option key={destination} value={destination}>
                    {destination}
                  </option>
                ))}
              </select>
            </label>
            <label className="selectFilter">
              <span>Dias pago</span>
              <select value={maxDaysFilter} onChange={(event) => setMaxDaysFilter(event.target.value)}>
                <option value="Todos">Todos</option>
                <option value="7">0-7</option>
                <option value="15">0-15</option>
                <option value="30">0-30</option>
              </select>
            </label>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Identificador cliente</th>
                  <th>Operacion</th>
                  <th>Destino OP</th>
                  <th>Prob. mora</th>
                  <th>Dias pago</th>
                  <th>Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={`${row.clienteId}-${row.operacionId}`} onClick={() => setSelected(row)}>
                    <td>{row.clienteId}</td>
                    <td>{row.operacionId}</td>
                    <td>{row.destinoOp}</td>
                    <td>{percent(row.probabilidadMora)}</td>
                    <td>{row.diasHastaPago}</td>
                    <td>
                      <span className={`pill ${riskClass[row.riesgo]}`}>{row.riesgo}</span>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={6} className="emptyTable">
                      No hay socios que coincidan con los filtros.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lowerGrid">
          <Simulator selected={selected} />
          <Chatbot selected={selected} />
        </section>
      </section>
    </main>
  );
}
