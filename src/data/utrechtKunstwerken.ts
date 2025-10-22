import csvData from './utrecht.csv?raw';

export interface UtrechtKunstwerk {
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

// Parse CSV manually to avoid dependency
const parseUtrechtCSV = (): UtrechtKunstwerk[] => {
  const csvText = csvData;
  const lines = csvText.trim().split('\n');
  const kunstwerken: UtrechtKunstwerk[] = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parsing - in production, use a proper CSV parser
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);
    
    if (parts.length >= 22) {
      const id = parts[0];
      const title = parts[1];
      const lastName = parts[2];
      const firstName = parts[3];
      const middleName = parts[4];
      const year = parts[5];
      const address = parts[8];
      const materials = [parts[9], parts[10], parts[11], parts[12], parts[13]].filter(m => m && m.trim());
      const lat = parseFloat(parts[14]);
      const lon = parseFloat(parts[15]);
      const description = parts[16];
      const photos = [parts[18], parts[19], parts[20], parts[21], parts[22]].filter(p => p && p.trim());
      
      const artist = [firstName, middleName, lastName].filter(n => n && n.trim()).join(' ');
      
      kunstwerken.push({
        id,
        name: title,
        artist: artist || 'Onbekende kunstenaar',
        location: address,
        description: description || '',
        year: year || '',
        materials,
        lat,
        lon,
        photos
      });
    }
  }
  
  return kunstwerken;
};

export const utrechtKunstwerken = parseUtrechtCSV();
