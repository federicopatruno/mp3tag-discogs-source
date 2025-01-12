import { getReleaseById } from "@/lib/discogs/actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getReleaseById(id);

  return NextResponse.json(data.optimized, { status: 200 });
}
