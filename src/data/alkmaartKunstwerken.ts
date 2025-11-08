import csvData from './alkmaar.csv?raw';

export interface AlkmaarKunstwerk {
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

// Parse CSV manually
const parseAlkmaarCSV = (): AlkmaarKunstwerk[] => {
  const csvText = csvData;
  const lines = csvText.trim().split('\n');
  const kunstwerken: AlkmaarKunstwerk[] = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parsing with semicolon separator
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);
    
    if (parts.length >= 21) {
      const id = parts[0];
      const title = parts[1];
      const lastName = parts[2];
      const firstName = parts[3];
      const middleName = parts[4];
      const year = parts[5];
      const address = parts[7];
      const materials = [parts[8], parts[9], parts[10], parts[11], parts[12]].filter(m => m && m.trim());
      const lat = parseFloat(parts[13].replace(',', '.'));
      const lon = parseFloat(parts[14].replace(',', '.'));
      const description = parts[15];
      const photos = [parts[16], parts[17], parts[18], parts[19], parts[20]].filter(p => p && p.trim());
      
      const artist = [firstName, middleName, lastName].filter(n => n && n.trim()).join(' ');
      
      if (!isNaN(lat) && !isNaN(lon)) {
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
  }
  
  return kunstwerken;
};

export const alkmaartKunstwerken = parseAlkmaarCSV();
