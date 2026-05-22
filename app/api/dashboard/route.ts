import { NextResponse } from "next/server";
import { fetchDashboardFromSupabase } from "@/lib/supabaseRest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabasePayload = await fetchDashboardFromSupabase();
    return NextResponse.json({ ...supabasePayload, source: "supabase" });
  } catch (error) {
    return NextResponse.json(
      {
        error: "No se pudo cargar informacion desde Supabase.",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 502 }
    );
  }
}
