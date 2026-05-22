import { DashboardPayload } from "./types";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const fetchSupabaseContext = async (question: string) => {
  if (!hasSupabaseConfig) return "";

  const response = await fetch(`${supabaseUrl}/rest/v1/risk_alerts?select=*&limit=20`, {
    headers: {
      apikey: supabaseAnonKey!,
      Authorization: `Bearer ${supabaseAnonKey}`
    },
    cache: "no-store"
  });

  if (!response.ok) return "";
  const rows = await response.json();
  return `Pregunta del asesor: ${question}\nRegistros relevantes desde Supabase:\n${JSON.stringify(rows).slice(0, 6000)}`;
};

export const fetchDashboardFromSupabase = async (): Promise<DashboardPayload | null> => {
  if (!hasSupabaseConfig) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/risk_dashboard_payload?select=payload&limit=1`, {
    headers: {
      apikey: supabaseAnonKey!,
      Authorization: `Bearer ${supabaseAnonKey}`
    },
    cache: "no-store"
  });

  if (!response.ok) return null;
  const rows = await response.json();
  return rows?.[0]?.payload ?? null;
};
