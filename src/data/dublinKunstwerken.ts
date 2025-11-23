import dublinCanvasFCC from './dublin_canvas_fcc.csv?raw';
import dublinPublicArtFCC from './dublin_public_art_fcc.csv?raw';
import dublinDLR from './dublin_dlr.csv?raw';
import dublinCanvasDCC from './dublin_canvas_dcc.csv?raw';

export interface DublinKunstwerk {
  id: string;
  name: string;
  artist: string;
  location: string;
  description: string;
  year: string;
  lat: number;
  lon: number;
  photos: string[];
  source: string;
}

function parseCSV(csv: string, skipFirstRow: boolean = true): string[][] {
  const lines = csv.split('\n');
  const result: string[][] = [];
  
  for (let i = skipFirstRow ? 1 : 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    result.push(fields);
  }
  
  return result;
}

function isDuplicate(
  existing: DublinKunstwerk[],
  lat: number,
  lon: number,
  name: string
): boolean {
  const threshold = 0.0001; // ~11 meters
  return existing.some(
    (artwork) =>
      Math.abs(artwork.lat - lat) < threshold &&
      Math.abs(artwork.lon - lon) < threshold &&
      artwork.name.toLowerCase().includes(name.toLowerCase().substring(0, 10))
  );
}

function parseDublinKunstwerken(): DublinKunstwerk[] {
  const kunstwerken: DublinKunstwerk[] = [];
  
  // Parse Dublin Canvas FCC (Fingal County Council)
  const canvasFCCRows = parseCSV(dublinCanvasFCC);
  for (const fields of canvasFCCRows) {
    const lat = parseFloat(fields[3]);
    const lon = parseFloat(fields[4]);
    const artist = fields[5] || 'Onbekende kunstenaar';
    const name = fields[6] || 'Onbekend kunstwerk';
    const location = fields[7] || 'Onbekende locatie';
    const year = fields[8] || '';
    const photo = fields[10] || '';
    const objectId = fields[11];
    
    if (!isNaN(lat) && !isNaN(lon) && !isDuplicate(kunstwerken, lat, lon, name)) {
      kunstwerken.push({
        id: `dublin-canvas-fcc-${objectId}`,
        name,
        artist,
        location,
        description: location,
        year,
        lat,
        lon,
        photos: photo ? [photo] : [],
        source: 'Fingal County Council'
      });
    }
  }
  
  // Parse Public Art FCC
  const publicArtFCCRows = parseCSV(dublinPublicArtFCC);
  for (const fields of publicArtFCCRows) {
    const lat = parseFloat(fields[5]);
    const lon = parseFloat(fields[6]);
    const typeOfArt = fields[2] || '';
    const location = fields[3] || 'Onbekende locatie';
    const description = fields[4] || '';
    const objectId = fields[7];
    
    // Extract artist from description or type
    let artist = 'Onbekende kunstenaar';
    const artistMatch = description.match(/by\s+([^,\.]+)/i) || description.match(/Artist\s+([^,\.]+)/i);
    if (artistMatch) {
      artist = artistMatch[1].trim();
    }
    
    const name = typeOfArt || 'Onbekend kunstwerk';
    
    if (!isNaN(lat) && !isNaN(lon) && !isDuplicate(kunstwerken, lat, lon, name)) {
      kunstwerken.push({
        id: `dublin-public-fcc-${objectId}`,
        name,
        artist,
        location,
        description,
        year: '',
        lat,
        lon,
        photos: [],
        source: 'Fingal County Council'
      });
    }
  }
  
  // Parse DLR (Dún Laoghaire-Rathdown)
  const dlrRows = parseCSV(dublinDLR);
  for (const fields of dlrRows) {
    const lat = parseFloat(fields[6]);
    const lon = parseFloat(fields[7]);
    const artist = fields[1] || 'Onbekende kunstenaar';
    const name = fields[2] || 'Onbekend kunstwerk';
    const description = fields[3] || '';
    const location = fields[4] || 'Onbekende locatie';
    const year = fields[5] || '';
    const objectId = fields[0];
    
    if (!isNaN(lat) && !isNaN(lon) && !isDuplicate(kunstwerken, lat, lon, name)) {
      kunstwerken.push({
        id: `dublin-dlr-${objectId}`,
        name,
        artist,
        location,
        description,
        year,
        lat,
        lon,
        photos: [],
        source: 'Dún Laoghaire-Rathdown'
      });
    }
  }
  
  // Parse Dublin Canvas DCC (Dublin City Council)
  const canvasDCCRows = parseCSV(dublinCanvasDCC, false);
  for (let i = 1; i < canvasDCCRows.length; i++) {
    const fields = canvasDCCRows[i];
    if (fields.length < 9) continue;
    
    const lat = parseFloat(fields[1]);
    const lon = parseFloat(fields[2]);
    const artist = fields[3] || 'Onbekende kunstenaar';
    const name = fields[4] || 'Onbekend kunstwerk';
    const location = fields[5] || 'Onbekende locatie';
    const year = fields[6] || '';
    const photo = fields[8] || '';
    
    if (!isNaN(lat) && !isNaN(lon) && !isDuplicate(kunstwerken, lat, lon, name)) {
      kunstwerken.push({
        id: `dublin-canvas-dcc-${i}`,
        name,
        artist,
        location,
        description: location,
        year,
        lat,
        lon,
        photos: photo ? [photo] : [],
        source: 'Dublin City Council'
      });
    }
  }
  
  return kunstwerken;
}

export const dublinKunstwerken = parseDublinKunstwerken();
