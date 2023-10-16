const suffixRegex: RegExp = new RegExp(/ \(\d+\)$/);
const artistParenthesisRegex: RegExp = new RegExp(/ \(\d{1,2}\)/);

export function getField(field: any, separator: string = "\\\\") {
  if (field) {
    if (Array.isArray(field)) {
      return field.join(separator).trim();
    }
    return typeof field === "string" ? field.replace(suffixRegex, "") : field;
  }
}

export function getAlbumArtist(field: string) {
  const artist = field.replace(artistParenthesisRegex, "");
  if (artist.endsWith(", The")) {
    return `The ${artist.replace(/, The$/, "")}`;
  }
  return artist;
}

export function getNestedField(
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

export function getMediaFormat(formats: Array<any>) {
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

export function isCompilation(tracklist: Array<any>) {
  return tracklist.filter((item: any) => item.type_ === "track" && item.artists)
    .length > 0
    ? 1
    : "";
}

export function getReleaseCredits(json: any) {
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
  console.log("TRACKLIST");
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
        artist: `${prev.artist} / ${curr.artist}`,
        credits: `${prev.credits} / ${curr.credits}`,
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
