import { getReleaseById } from "@/lib/discogs/actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await getReleaseById(params.id);

  return NextResponse.json(data.optimized, { status: 200 });
}
