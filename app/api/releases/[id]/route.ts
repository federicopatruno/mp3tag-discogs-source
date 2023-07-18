import { discogsReleaseBaseUrl } from "@/constants";
import {
  getField,
  getMediaFormat,
  getNestedField,
  getReleaseCredits,
  getTracklist,
  isCompilation,
} from "@/lib/actions";
import { NextRequest, NextResponse } from "next/server";

const token = process.env.DISCOGS_TOKEN || "";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  const response = await fetch(
    `https://api.discogs.com/releases/${params.id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Discogs token=${token}`,
      },
    }
  );

  const json = await response.json();
  const tracklist = getTracklist(json.tracklist, json.artists_sort);
  const data = {
    album: getField(json.title),
    artist:
      json.artists_sort === "Various" ? "Various Artists" : json.artists_sort,
    catalog_number: getNestedField(json.labels, "catno"),
    compilation: isCompilation(json.tracklist),
    country: getField(json.country),
    credits: getReleaseCredits(json),
    format: getMediaFormat(json.formats),
    genre: getField(json.genres),
    images: json.images,
    master_id: json.master_id,
    publisher: getNestedField(json.labels, "name"),
    release_id: json.id,
    series: getNestedField(json.series, "name"),
    series_number: getNestedField(json.series, "catno"),
    styles: getField(json.styles),
    totaldiscs: json.format_quantity === 0 ? 1 : json.format_quantity,
    total_tracks: tracklist.length,
    tracklist: tracklist,
    www: `${discogsReleaseBaseUrl}/${json.id}`,
    year: getField(json.year),
  };

  const newData = Object.entries(data).reduce(
    (a: any, [k, v]) => (v ? ((a[k] = v), a) : a),
    {}
  );

  return NextResponse.json({ ...newData }, { status: 200 });
}
