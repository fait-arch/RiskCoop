import { NextRequest, NextResponse } from "next/server";
import { scoreSimulation } from "@/lib/riskModel";
import { SimulationInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SimulationInput;
  const result = scoreSimulation(body);
  return NextResponse.json(result);
}
