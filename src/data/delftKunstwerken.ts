import delftCSV from './delft.csv?raw';

export interface DelftKunstwerk {
  id: string;
  name: string;
  artist: string;
  location: string;
  wijk: string;
  description: string;
  year: string;
  lat: number;
  lon: number;
  inventoryCode: string;
}

function parseDelftCSV(): DelftKunstwerk[] {
  const lines = delftCSV.split('\n');
  const kunstwerken: DelftKunstwerk[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted fields with commas
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
    
    // Extract fields
    const titel = fields[4] || 'Onbekend kunstwerk';
    const kunstenaar = fields[5] || 'Onbekende kunstenaar';
    const toponiem = fields[6] || 'Onbekende locatie';
    const wijk = fields[7] || '';
    const jaar = fields[9] || '';
    const omschrijving = fields[10] || '';
    const lat = parseFloat(fields[12]);
    const lon = parseFloat(fields[13]);
    const fid = fields[14];
    const inventoryCode = fields[3] || '';
    
    if (!isNaN(lat) && !isNaN(lon)) {
      kunstwerken.push({
        id: fid || `delft-${i}`,
        name: titel,
        artist: kunstenaar,
        location: toponiem,
        wijk: wijk,
        description: omschrijving,
        year: jaar,
        lat: lat,
        lon: lon,
        inventoryCode: inventoryCode
      });
    }
  }
  
  return kunstwerken;
}

export const delftKunstwerken = parseDelftCSV();
