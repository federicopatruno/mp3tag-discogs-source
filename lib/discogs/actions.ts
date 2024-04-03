const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN || "";
const suffixRegex: RegExp = new RegExp(/ \(\d+\)$/);
const artistParenthesisRegex: RegExp = new RegExp(/ \(\d{1,2}\)/);

export async function getReleaseById(releaseId: string) {
  const response = await fetch(
    `https://api.discogs.com/releases/${releaseId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Discogs token=${DISCOGS_TOKEN}`,
      },
    }
  );
  const json = await response.json();

  return {
    original: { ...json },
    optimized: {
      artist: parseAlbumArtist(json),
      images: json.images,
    },
  };
}

function parseAlbumArtist(json: any) {
  let artist = json.artists_sort.replace(artistParenthesisRegex, "");
  if (artist.endsWith(", The")) {
    artist.split(", The");
    artist = `The ${artist[0]}`;
  }
  return artist;
}

function parseField(field: any, separator: string = "\\\\") {
  if (field) {
    if (Array.isArray(field)) {
      return field.join(separator).trim();
    }
    return typeof field === "string" ? field.replace(suffixRegex, "") : field;
  }
}
