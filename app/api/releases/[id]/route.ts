import { parseRelease } from "@/lib/actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await parseRelease(params.id);

  return NextResponse.json({ ...data }, { status: 200 });
}
