import axios from "axios";

const suffixRegex: RegExp = new RegExp(/ \(\d+\)$/);
const artistParenthesisRegex: RegExp = new RegExp(/ \(\d{1,2}\)/);
const headers = {
  Authorization: `Discogs token=${process.env.DISCOGS_TOKEN || ""}`,
};

export async function getDatabaseResults(
  searchParams:
    | string
    | string[][]
    | Record<string, string>
    | URLSearchParams
    | undefined
) {
  const response = await axios.get(`https://api.discogs.com/database/search`, {
    params: searchParams,
    headers,
  });

  // const results = await response.json();
  return response.data;
}

export async function getReleaseById(
  releaseId: string,
  multi: boolean = false
) {
  const response = await axios.get(
    `https://api.discogs.com/releases/${releaseId}`,
    {
      headers,
    }
  );
  const json = response.data;
  const albumArtist = parseAlbumArtist(json);
  const tracklist = parseTracklist(json.tracklist, albumArtist, multi);
  const optimized = {
    album: parseField(json.title),
    artist: albumArtist,
    catalog_number: parseField(json.labels, "\\\\", "catno"),
    compilation: parseCompilationFlag(json.tracklist),
    credits: parseReleaseCredits(json),
    format: parseMediaFormat(json.formats),
    country: parseField(json.country),
    genre: parseField(json.genres),
    images: json.images,
    master_id: json.master_id,
    publisher: parseField(json.labels, "\\\\", "name"),
    release_id: json.id,
    series: parseField(json.series, "\\\\", "name"),
    series_number: parseField(json.series, "\\\\", "catno"),
    styles: parseField(json.styles),
    totaldiscs: json.format_quantity == 0 ? 1 : json.format_quantity,
    total_tracks: tracklist.length,
    tracklist: tracklist,
    www: `https://www.discogs.com/release/${json.id}`,
    year: parseField(json.year),
  };

  return {
    original: { ...json },
    optimized: Object.entries(optimized).reduce(
      (a: any, [k, v]) => (v ? ((a[k] = v), a) : a),
      {}
    ),
  };
}

// Parse Album Artists
function parseAlbumArtist(json: any) {
  const artist = json.artists_sort.replace(artistParenthesisRegex, "");
  if (artist.endsWith(", The")) return `The ${artist.split(", The")[0]}`;
  return artist;
}

// Parse Fields and Nested Fields
function parseField(
  field: any,
  separator: string = "\\\\",
  nested_key: string = ""
) {
  if (field) {
    if (nested_key) {
      return field
        .map((value: any) => {
          if (value[nested_key]) {
            return `${value[nested_key]}`.replace(suffixRegex, "");
          }
        })
        .join(separator)
        .trim();
    } else {
      if (Array.isArray(field)) {
        return field.join(separator).trim();
      }
      return typeof field === "string" ? field.replace(suffixRegex, "") : field;
    }
  }
}

// Parse Release Credits
function parseReleaseCredits(json: any) {
  function getCredits(credits: Array<string>) {
    const newCredits = credits.join("\r\n");
    return newCredits !== "" ? `Credits:\r\n${newCredits}\r\n` : "";
  }

  const credits = getCredits(parseExtraCredits(json.extraartists));
  const notes =
    parseField(json.notes) !== ""
      ? `Notes:\r\n${parseField(json.notes)}\r\n`
      : "";
  const companies = parseCompanies(json.companies);

  return [credits, notes, companies].join("\r\n").trim();
}

function parseCompanies(companies: Array<any>) {
  const newCompanies = companies
    .map((company) => {
      const name = parseField(company.name).replace(suffixRegex, "").trim();
      const entityTypeName = parseField(company.entity_type_name);
      const catNo = parseField(company.catno);
      return catNo && catNo !== ""
        ? `${entityTypeName}: ${name} - ${catNo}`
        : `${entityTypeName}: ${name}`;
    })
    .filter((value: string) => value && value !== "")
    .join("\r\n");

  return newCompanies && newCompanies !== ""
    ? `Companies etc.:\r\n${newCompanies}`.trim()
    : "";
}

function parseExtraCredits(extraArtists: Array<any>) {
  return extraArtists
    ? extraArtists.map((artist) => {
      const tmpName = parseField(artist.name);
      const anv = parseField(artist.anv);
      const name = (anv && anv !== "" ? anv : tmpName)
        .replace(suffixRegex, "")
        .trim();
      const role = `(${parseField(artist.role).trim()})`;
      return [name, role]
        .filter((value: string) => value && value !== "")
        .join(" ")
        .trim();
    })
    : [];
}

function parseCompilationFlag(tracklist: Array<any>) {
  return tracklist.filter((item: any) => item.type_ === "track" && item.artists)
    .length > 0
    ? 1
    : "";
}
function parseMediaFormat(formats: Array<any>) {
  if (formats.length > 0) {
    return formats
      .map((format: any) => {
        const qty = parseField(format.qty);
        const media = parseField(format.name);
        const text = parseField(format.text);
        const mediaQty = qty && qty > 1 ? `${qty} x ${media}` : media;
        return [mediaQty, text, parseField(format.descriptions, ",")];
      })
      .flat()
      .filter((value: string) => value && value !== "")
      .join()
      .trim();
  }
}

export function parseTracklist(
  tracklist: any,
  albumArtist: string,
  multi: boolean = false
) {
  const positionRegex: RegExp = new RegExp(/(.+)([a-z]|\.\d+)/);
  const featuringRegex: RegExp = new RegExp(
    /( feat| feat.| featuring| ,|&| &,|,&)$/
  );
  const trackNoRegex: RegExp = new RegExp(/.+?(\.|-)(\d+).*/);
  const originalMixRegExp: RegExp = new RegExp(/\(Original Mix\)|\(Original\)/);

  let chapter = "";
  const tracks = tracklist
    .map((track: any, i: number) => {
      if (track.type_ === "index") {
        chapter = parseField(track.title);
        const subtracks = track.sub_tracks.filter(
          (subtrack: any) => subtrack.type_ === "track"
        );

        return subtracks.map((subtrack: any) => {
          const currentPos = parseField(subtrack.position).replace(
            positionRegex,
            "$1"
          );
          const title = parseField(subtrack.title);
          const artist = (
            subtrack.artists ? parseArtists(subtrack.artists) : albumArtist
          ).replace(featuringRegex, "");
          const trackNo = subtrack.position.replace(trackNoRegex, "$2");
          const discNo = parseDiscNumber(subtrack.position);
          const credits = parseExtraCredits(subtrack.extraartists)
            .join(";")
            .trim();
          const lenPos =
            subtrack.duration && subtrack.duration != ""
              ? `${subtrack.duration} / #${subtrack.position}`
              : `-:-- / #${subtrack.position}`;

          return {
            title: title,
            artist: artist,
            credits: credits,
            chapter: chapter,
            discnumber: discNo,
            trackno: trackNo,
            _length: lenPos,
            currpos: currentPos,
          };
        });
      }
      if (track.type_ === "heading") {
        chapter = parseField(track.title);
      }
      if (track.type_ === "track") {
        const currentPos = parseField(track.position).replace(
          positionRegex,
          "$1"
        );
        const title = parseField(track.title)
          .replace(originalMixRegExp, "")
          .trim();
        const artist = (
          track.artists ? parseArtists(track.artists) : albumArtist
        ).replace(featuringRegex, "");
        const trackNo = track.position.replace(trackNoRegex, "$2");
        const discNo = parseDiscNumber(track.position);
        const credits = parseExtraCredits(track.extraartists).join(";").trim();
        const lenPos =
          track.duration && track.duration != ""
            ? `${track.duration} / #${track.position}`
            : `-:-- / #${track.position}`;

        return {
          title: title,
          artist: artist,
          credits: credits,
          chapter: chapter,
          discnumber: discNo,
          trackno: trackNo,
          _length: lenPos,
          currpos: currentPos,
        };
      }
    })
    .filter((track: any) => track)
    .flat();
  return (multi ? parseMulti(tracks) : tracks).map(
    ({ currpos, ...rest }: { currpos: string }) => rest
  );
}

function parseArtists(artists: Array<any>) {
  const artist = artists
    .map((artist: any) => {
      const tmpName = parseField(artist.name);
      const anv = parseField(artist.anv);
      const name = anv && anv !== "" ? anv : tmpName;
      const joinValue = parseField(artist.join);
      return [name.replace(suffixRegex, "").trim(), joinValue];
    })
    .flat()
    .filter((value: string) => value && value !== "")
    .join(" ")
    .trim();
  return artist === "va" || artist === "Various" ? "Various Artists" : artist;
}

function parseDiscNumber(position: string) {
  const regexA: RegExp = new RegExp(/^\D*(\d+)(\.|-).+$|^(\d+)$/);
  const regexB: RegExp = new RegExp(/(\D+?)-*\d+/);

  const vinylDvd: Array<string> = ["a", "b", "aa", "aaa", "dvd"];
  const discNumber = position
    .replace(regexA, "$1")
    .replace(regexB, "$1")
    .trim();

  if (!isNaN(+discNumber)) {
    return +discNumber === 0 ? 1 : +discNumber;
  } else if (!discNumber) {
    return 1;
  } else {
    const side = discNumber.toLowerCase();
    if (!vinylDvd.includes(side) && side.length === 1) {
      const chr =
        side.charCodeAt(0) % 2 === 0
          ? side.charCodeAt(0) - 1
          : side.charCodeAt(0);
      return chr - 97;
    }

    return 1;
  }
}

function parseMulti(tracklist: Array<any>) {
  const groupByPosition = tracklist.reduce((pos, track) => {
    const { currpos } = track;
    pos[currpos] = pos[currpos] ?? [];
    pos[currpos].push(track);
    return pos;
  }, {});

  return Object.values(groupByPosition).map((value: any) =>
    value.reduce((prev: any, curr: any) => {
      const length = (
        prev._length.startsWith("-:--") ? curr._length : prev._length
      ).replace(/ \/ #.+?$/, "");

      const data = {
        title: `${prev.title} / ${curr.title}`,
        artist:
          prev.artist === curr.artist
            ? `${curr.artist}`
            : `${prev.artist} / ${curr.artist}`,
        credits:
          prev.credits === curr.credits
            ? `${curr.credits}`
            : `${prev.credits} / ${curr.credits}`,
        chapter: curr.chapter,
        discnumber: curr.discnumber,
        trackno: curr.trackno,
        _length: `${length} / #${curr.discnumber}-${curr.trackno}`,
        currpos: curr.currpos,
      };
      return data;
    })
  );
}
