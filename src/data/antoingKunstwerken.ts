import csvData from './antoing.csv?raw';

export interface AntoingKunstwerk {
  id: string;
  name: string;
  artist: string;
  location: string;
  type: string;
  lat: number;
  lon: number;
}

// Parse CSV manually
const parseAntoingCSV = (): AntoingKunstwerk[] => {
  const csvText = csvData;
  const lines = csvText.trim().split('\n');
  const kunstwerken: AntoingKunstwerk[] = [];
  
  // Skip header line (starts with BOM)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Parse CSV with semicolon separator
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    
    if (parts.length >= 5) {
      const name = parts[0].replace(/^["«»]+|["«»]+$/g, '').trim(); // Remove quotes and guillemets
      const artist = parts[1] || 'Onbekende kunstenaar';
      const location = parts[2];
      const type = parts[3];
      const coords = parts[4].split(',').map(c => parseFloat(c.trim()));
      
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        kunstwerken.push({
          id: `antoing-${i}`,
          name,
          artist,
          location,
          type,
          lat: coords[0],
          lon: coords[1]
        });
      }
    }
  }
  
  return kunstwerken;
};

export const antoingKunstwerken = parseAntoingCSV();
