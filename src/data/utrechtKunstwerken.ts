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
  const csvText = `4216,"Zittende vrouwentorso",Blees,Willy,,1981,Utrecht,Oost,"Maliebaan 6",Brons,,,,,52.08975894165677,5.130985969530343,"<p>De eigenzinnige beelden van de Utrechtse beeldhouwster Willy Blees (1931-1988) bezitten een verrassende opbouw. De gladde ronde volumes verwijzen naar herkenbare elementen, maar het is steeds de kracht van de ronde vormen die spreekt.<br /> Aanvankelijk ging haar creatieve belangstelling vooral uit naar dierplastieken waarvan er in Utrecht een aantal staan. Ook vervaardigde zij geabstraheerde vrouwenfiguren in verschillende poses. E&eacute;n daarvan is te zien in het park Vechtzoom.</p> <p>'Zittende Vrouwetorso' op de Maliebaan is een van haar laatste werkstukken. Zij boetseerde deze in gips. Daarna werd het beeld in brons gegoten. Het betreft hier een zittende vrouwelijke figuur die zover geabstraheerd is dat alleen de essenti&euml;le vormen overblijven. Dit levert een monumentaal beeld op.</p>",,http://beheer.kunstwacht.nl/cache/3/1/c/31cc8ee715a9f315f5776993d7b92914_700_540.jpg,http://beheer.kunstwacht.nl/cache/1/b/1/1b1df2812245d0f21e50af474fb33b4a_700_540.jpg,http://beheer.kunstwacht.nl/cache/f/a/6/fa63bdb6e1594ebcf991315859e13d00_700_540.jpg,,
4217,Sappho,Bourdelle,"Emile-Antoine ",,1959,Utrecht,Oost,"Museumlaan ",Brons,,,,,52.09465637512603,5.1400864426072985,"<p>Zittende vrouwenfiguur die met haar rechter arm onder het voorover gebogen hoofd steunt op een lier. Het beeld stelt de Griekse dichteres Sappho voor.</p>",,http://beheer.kunstwacht.nl/cache/2/5/0/250e0f00dece3a4b7ed3f01c713cf4c8_700_540.jpg,http://beheer.kunstwacht.nl/cache/5/3/b/53bc78354c440726880be266771a2dd6_700_540.jpg,http://beheer.kunstwacht.nl/cache/2/a/2/2a26424988bd465f03041b09c013d85a_700_540.jpg,,
4218,"Schrijdende danseres met tamboerijn",Blaisse,Fioen,,1982,Utrecht,Oost,"Maliebaan ",Brons,,,,,52.09068403548702,5.1323788980162135,"<p>E&eacute;n van de belangrijkste kenmerken van de plastieken van Fioen Blaisse (1932) is de vloeiende lijn, ooit de muzikaliteit van haar werk genoemd. Deze muzikaliteit is te vinden zowel in de suggestie van beweging als in de thematiek van haar beelden.</p> <p>In de jaren zestig maakte Blaisse grote dierplastieken. Een dansuitvoering in Tunesi&euml; in 1970 inspireerde haar tot het verwerken van het thema dans in haar beelden. Blaisse abstraheert de waarneembare werkelijkheid. Haar welhaast zwevende figuren bestaan uit strakke gebogen vormen die in elkaar overlopen, waarvan alleen het hoofd een herkenbare vorm heeft. Zij hebben geen individueel uitgewerkte gezichten en blijven anoniem. De kleding van de danseressen vormt zo'n eenheid met het lichaam dat er geen onderscheid aanwijsbaar is.</p> <p>De 'Schrijdende Danseres met Tamboerijn II' heeft een voet opgetild en is op weg om contact te maken met de aarde. Opvallend is dat de naar achteren hellende sculptuur zowel breed als ijl is. Door deze factoren wordt een moment van spanning weergegeven. Het zetten van de stap houdt de belofte in dat er iets komen gaat. Het is Blaisse's verbeelding van het ritme van het bestaan.</p>",,http://beheer.kunstwacht.nl/cache/e/5/d/e5d3b8997cc0923d820faf43b70af9ab_700_540.jpg,,,,`;
  
  // Note: This is a minimal dataset for demonstration. The full CSV has 420+ entries.
  // In a production environment, you would parse the entire CSV file.
  const lines = csvText.trim().split('\n');
  const kunstwerken: UtrechtKunstwerk[] = [];
  
  for (const line of lines) {
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
