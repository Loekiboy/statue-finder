import kunstwerkenData from './nijmegenKunstwerken.json';

export interface NijmegenKunstwerk {
  id: string;
  name: string;
  artist: string;
  location: string;
  description: string;
  credits: string;
  lat: number;
  lon: number;
  photoId: string | null;
  websiteUrl: string | null;
}

function parseCoordinate(coord: string): number {
  return parseFloat(coord.replace(',', '.'));
}

export const nijmegenKunstwerken: NijmegenKunstwerk[] = kunstwerkenData.features.map((feature: any) => ({
  id: feature.properties.KUNSTWERKID,
  name: feature.properties.KUNSTWERKNAAM || 'Onbekend kunstwerk',
  artist: feature.properties.KUNSTENAAR || 'Onbekende kunstenaar',
  location: feature.properties.LOKATIEBEELD || 'Onbekende locatie',
  description: feature.properties.LOKATIEBEELD || '',
  credits: feature.properties.EIGENDOM_VAN || '',
  lat: parseCoordinate(feature.properties.BREEDTEGRAAD),
  lon: parseCoordinate(feature.properties.LENGTEGRAAD),
  photoId: feature.properties.FOTO || null,
  websiteUrl: feature.properties.WEBSITEVERWIJZING || null,
}));
