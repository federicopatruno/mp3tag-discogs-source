import { NextRequest, NextResponse } from "next/server";

const token = process.env.DISCOGS_TOKEN || "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req?.url);
  const response = await fetch(
    `https://api.discogs.com/database/search?${new URLSearchParams(
      searchParams
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Discogs token=${token}`,
      },
    }
  );

  const json = await response.json();
  return NextResponse.json({ ...json }, { status: 200 });
}
