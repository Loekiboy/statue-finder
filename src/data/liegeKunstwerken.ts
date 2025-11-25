import liegeCSV from './liege.csv?raw';

export interface LiegeKunstwerk {
  id: string;
  name: string;
  artist: string;
  nationality: string;
  description: string;
  street: string;
  number: string;
  postalCode: string;
  year: string;
  websiteUrl: string | null;
  lat: number;
  lon: number;
}

function parseLiegeCSV(): LiegeKunstwerk[] {
  // Remove BOM if present
  const cleanedCSV = liegeCSV.replace(/^\uFEFF/, '');
  const lines = cleanedCSV.split('\n');
  const kunstwerken: LiegeKunstwerk[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by semicolon (CSV uses ; as separator)
    const fields = line.split(';');
    
    if (fields.length < 11) continue;
    
    const gid = fields[0]?.trim();
    if (!gid) continue;
    
    const titre = fields[1]?.trim() || 'Onbekend kunstwerk';
    const artistes = fields[2]?.trim() || 'Onbekende kunstenaar';
    const nationalite = fields[3]?.trim() || '';
    const description = fields[4]?.trim() || '';
    const rue = fields[5]?.trim() || 'Onbekende locatie';
    const numero = fields[6]?.trim() || '';
    const codePostal = fields[7]?.trim() || '';
    const date = fields[8]?.trim() || '';
    const site = fields[9]?.trim() || null;
    const geoPoint = fields[10]?.trim() || '';
    
    // Parse coordinates from "lat, lon" format
    const coords = geoPoint.split(',').map(c => parseFloat(c.trim()));
    
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      kunstwerken.push({
        id: `liege-${gid}`,
        name: titre,
        artist: artistes,
        nationality: nationalite,
        description: description,
        street: rue,
        number: numero,
        postalCode: codePostal,
        year: date,
        websiteUrl: site || null,
        lat: coords[0],
        lon: coords[1]
      });
    }
  }
  
  return kunstwerken;
}

export const liegeKunstwerken = parseLiegeCSV();
