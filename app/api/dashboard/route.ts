import { NextResponse } from "next/server";
import { getLocalDashboardData } from "@/lib/localData";
import { fetchDashboardFromSupabase } from "@/lib/supabaseRest";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabasePayload = await fetchDashboardFromSupabase();
  if (supabasePayload) {
    return NextResponse.json({ ...supabasePayload, source: "supabase" });
  }

  const payload = await getLocalDashboardData();
  return NextResponse.json(payload);
}
