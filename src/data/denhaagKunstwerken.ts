import csvData from './denhaag.csv?raw';

export interface DenHaagKunstwerk {
  id: string;
  name: string;
  artist: string;
  location: string;
  description: string;
  year: string;
  materials: string[];
  lat: number;
  lon: number;
  photos: string[];
}

// Robust CSV parser that supports semicolon delimiter and quoted newlines
const parseSemicolonCSV = (text: string): string[][] => {
  const input = text.replace(/^\uFEFF/, ''); // remove BOM if present
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === '"') {
      const next = input[i + 1];
      if (inQuotes && next === '"') {
        // escaped quote ""
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ';' && !inQuotes) {
      row.push(field);
      field = '';
    } else if (ch === '\n' && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // ignore CR
    } else {
      field += ch;
    }
  }

  // push last row
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  // remove completely empty rows
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
};

// Extract any image URLs present in the row values (jpg/jpeg/png/webp)
const extractImageUrls = (rowValues: string[]): string[] => {
  const joined = rowValues.join(' ');
  const regex = /(https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|webp))/gi;
  const matches = joined.match(regex) || [];
  // dedupe while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const m of matches) {
    const url = m.trim();
    if (!seen.has(url)) {
      seen.add(url);
      unique.push(url);
    }
  }
  return unique;
};

const parseDenHaagCSV = (): DenHaagKunstwerk[] => {
  const rows = parseSemicolonCSV(csvData);
  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim());
  const get = (row: string[], name: string): string => {
    const idx = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    return idx >= 0 ? (row[idx] || '').trim() : '';
  };

  const kunstwerken: DenHaagKunstwerk[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    const id = get(row, 'COUNTER') || `${i}`;
    const title = get(row, 'TITEL');
    const inhoud = get(row, 'INHOUD');
    const materiaal = get(row, 'MATERIAAL');
    const locatieToevoeging = get(row, 'LOCATIE_TOEVOEGING');
    const locatieFull = get(row, 'LOCATIE');
    const straat = get(row, 'STRAATNAAM');
    const huisnummer = get(row, 'HUISNUMMER');
    const latStr = get(row, 'LAT');
    const lonStr = get(row, 'LON');

    const kunstenaar = get(row, 'KUNSTENAAR');
    const kunstenaar1 = get(row, 'KUNSTENAAR1');
    const kunstenaar2 = get(row, 'KUNSTENAAR2');
    const kunstenaar3 = get(row, 'KUNSTENAAR3');

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      // skip entries without valid coordinates to avoid map issues
      continue;
    }

    // Clean description: strip HTML and collapse whitespace
    const description = (inhoud || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract year from description if possible
    const yearMatch = description.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : '';

    // Combine all artists
    const artists = [kunstenaar, kunstenaar1, kunstenaar2, kunstenaar3]
      .filter((a) => a && a.trim())
      .join(', ');

    // Materials split on common separators
    const materials = materiaal
      ? materiaal
          .split(/[\/|,]/)
          .map((m) => m.trim())
          .filter(Boolean)
      : [];

    // Prefer full location string, else compose from street + number + addition
    const location =
      locatieFull && locatieFull.trim()
        ? locatieFull.trim()
        : [straat, huisnummer, locatieToevoeging].filter((p) => p && p.trim()).join(' ');

    // Try to collect any direct image URLs present in the row
    const photos = extractImageUrls(row);

    kunstwerken.push({
      id,
      name: title || 'Onbekend',
      artist: artists || 'Onbekende kunstenaar',
      location,
      description,
      year,
      materials,
      lat,
      lon,
      photos,
    });
  }

  return kunstwerken;
};

export const denhaagKunstwerken = parseDenHaagCSV();
