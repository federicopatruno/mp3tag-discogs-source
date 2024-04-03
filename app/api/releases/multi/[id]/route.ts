import { parseRelease } from "@/lib/actions";
import { NextResponse } from "next/server";

export async function GET({ params }: { params: { id: string } }) {
  const data = await parseRelease(params.id, true);

  return NextResponse.json({ ...data }, { status: 200 });
}
