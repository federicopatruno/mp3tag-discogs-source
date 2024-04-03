const suffixRegex: RegExp = new RegExp(/ \(\d+\)$/);
const artistParenthesisRegex: RegExp = new RegExp(/ \(\d{1,2}\)/);

function getField(field: any, separator: string = "\\\\") {
  if (field) {
    if (Array.isArray(field)) {
      return field.join(separator).trim();
    }
    return typeof field === "string" ? field.replace(suffixRegex, "") : field;
  }
}

function getAlbumArtist(field: string) {
  const artist = field.replace(artistParenthesisRegex, "");
  if (artist.endsWith(", The")) {
    return `The ${artist.replace(/, The$/, "")}`;
  }
  return artist;
}

function getNestedField(
  field: Array<any>,
  key: string,
  separator: string = "\\\\"
) {
  if (field) {
    return field
      .map((value: any) => {
        if (value[key]) {
          return (value[key] as string).replace(suffixRegex, "");
        }
      })
      .join(separator)
      .trim();
  }
}

function getMediaFormat(formats: Array<any>) {
  if (formats.length > 0) {
    return formats
      .map((format: any) => {
        const qty = getField(format.qty);
        const media = getField(format.name);
        const text = getField(format.text);
        const mediaQty = qty && qty > 1 ? `${qty} x ${media}` : media;
        return [mediaQty, text, getField(format.descriptions, ",")];
      })
      .flat()
      .filter((value: string) => value && value !== "")
      .join()
      .trim();
  }
}

function getArtists(artists: Array<any>) {
  const artist = artists
    .map((artist: any) => {
      const tmpName = getField(artist.name);
      const anv = getField(artist.anv);
      const name = anv && anv !== "" ? anv : tmpName;
      const joinValue = getField(artist.join);
      return [name.replace(suffixRegex, "").trim(), joinValue];
    })
    .flat()
    .filter((value: string) => value && value !== "")
    .join(" ")
    .trim();
  return artist === "va" || artist === "Various" ? "Various Artists" : artist;
}

function isCompilation(tracklist: Array<any>) {
  return tracklist.filter((item: any) => item.type_ === "track" && item.artists)
    .length > 0
    ? 1
    : "";
}

function getReleaseCredits(json: any) {
  function getCredits(credits: Array<string>) {
    const newCredits = credits.join("\r\n");
    return newCredits !== "" ? `Credits:\r\n${newCredits}\r\n` : "";
  }

  const credits = getCredits(getExtraCredits(json.extraartists));
  const notes =
    getField(json.notes) !== "" ? `Notes:\r\n${getField(json.notes)}\r\n` : "";
  const companies = getCompanies(json.companies);

  return [credits, notes, companies].join("\r\n").trim();
}

function getExtraCredits(extraArtists: Array<any>) {
  return extraArtists
    ? extraArtists.map((artist) => {
        const tmpName = getField(artist.name);
        const anv = getField(artist.anv);
        const name = (anv && anv !== "" ? anv : tmpName)
          .replace(suffixRegex, "")
          .trim();
        const role = `(${getField(artist.role).trim()})`;
        return [name, role]
          .filter((value: string) => value && value !== "")
          .join(" ")
          .trim();
      })
    : [];
}

function getCompanies(companies: Array<any>) {
  const newCompanies = companies
    .map((company) => {
      const name = getField(company.name).replace(suffixRegex, "").trim();
      const entityTypeName = getField(company.entity_type_name);
      const catNo = getField(company.catno);
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

export function getTracklist(
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
        chapter = getField(track.title);
        const subtracks = track.sub_tracks.filter(
          (subtrack: any) => subtrack.type_ === "track"
        );

        return subtracks.map((subtrack: any) => {
          const currentPos = getField(subtrack.position).replace(
            positionRegex,
            "$1"
          );
          const title = getField(subtrack.title);
          const artist = (
            subtrack.artists ? getArtists(subtrack.artists) : albumArtist
          ).replace(featuringRegex, "");
          const trackNo = subtrack.position.replace(trackNoRegex, "$2");
          const discNo = getDiscNumber(subtrack.position);
          const credits = getExtraCredits(subtrack.extraartists)
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
        chapter = getField(track.title);
      }
      if (track.type_ === "track") {
        const currentPos = getField(track.position).replace(
          positionRegex,
          "$1"
        );
        const title = getField(track.title)
          .replace(originalMixRegExp, "")
          .trim();
        const artist = (
          track.artists ? getArtists(track.artists) : albumArtist
        ).replace(featuringRegex, "");
        const trackNo = track.position.replace(trackNoRegex, "$2");
        const discNo = getDiscNumber(track.position);
        const credits = getExtraCredits(track.extraartists).join(";").trim();
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

function getDiscNumber(position: string) {
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

export async function getDatabaseResults(searchParams: any) {
  const token = process.env.DISCOGS_TOKEN || "";
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

  return json;
}

export async function parseRelease(releaseId: any, multi: boolean = false) {
  const token = process.env.DISCOGS_TOKEN || "";

  const response = await fetch(
    `https://api.discogs.com/releases/${releaseId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Discogs token=${token}`,
      },
    }
  );

  const json = await response.json();

  const albumArtist = getAlbumArtist(json.artists_sort);
  const tracklist = getTracklist(json.tracklist, albumArtist, multi);
  const data = {
    album: getField(json.title),
    artist: albumArtist === "Various" ? "Various Artists" : albumArtist,
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
    totaldiscs: json.format_quantity == 0 ? 1 : json.format_quantity,
    total_tracks: tracklist.length,
    tracklist: tracklist,
    www: `https://www.discogs.com/release/${json.id}`,
    year: getField(json.year),
  };

  return Object.entries(data).reduce(
    (a: any, [k, v]) => (v ? ((a[k] = v), a) : a),
    {}
  );
}
