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

// Parse CSV manually
const parseDenHaagCSV = (): DenHaagKunstwerk[] => {
  const csvText = csvData;
  const lines = csvText.trim().split('\n');
  const kunstwerken: DenHaagKunstwerk[] = [];
  
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
    
    if (parts.length >= 20) {
      const id = parts[0];
      const title = parts[1];
      const description = parts[2];
      const material = parts[3];
      const address = parts[9];
      const lat = parseFloat(parts[10]);
      const lon = parseFloat(parts[11]);
      const kunstenaar1 = parts[14];
      const kunstenaar2 = parts[15];
      const kunstenaar3 = parts[16];
      const kunstenaar4 = parts[17];
      
      // Extract year from description if possible
      const yearMatch = description.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : '';
      
      // Combine all artists
      const artists = [kunstenaar1, kunstenaar2, kunstenaar3, kunstenaar4]
        .filter(a => a && a.trim())
        .join(', ');
      
      const materials = material ? [material] : [];
      
      // Photos would need to be extracted from description or other fields if available
      const photos: string[] = [];
      
      if (!isNaN(lat) && !isNaN(lon)) {
        kunstwerken.push({
          id,
          name: title,
          artist: artists || 'Onbekende kunstenaar',
          location: address,
          description: description.replace(/<[^>]*>/g, '').trim() || '',
          year,
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

export const denhaagKunstwerken = parseDenHaagCSV();
