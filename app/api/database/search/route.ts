import { getDatabaseResults } from "@/lib/discogs/actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request?.url);
  const results = await getDatabaseResults(searchParams);
  return NextResponse.json({ ...results }, { status: 200 });
}
