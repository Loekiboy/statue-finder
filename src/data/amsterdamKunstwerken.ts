// Amsterdam kunstwerken data
// Data source: https://amsterdam.kunstwacht.nl/
// TODO: Implement proper data fetching from Amsterdam API or dataset

export interface AmsterdamKunstwerk {
  id: string;
  name: string;
  artist: string;
  location: string;
  description: string;
  lat: number;
  lon: number;
  photoUrl: string | null;
  websiteUrl: string | null;
  year: string | null;
}

// Placeholder - add actual Amsterdam kunstwerken data here
// Example kunstwerken from Amsterdam
export const amsterdamKunstwerken: AmsterdamKunstwerk[] = [
  {
    id: 'ams-001',
    name: 'De Dokwerker',
    artist: 'Mari Andriessen',
    location: 'Jonas Daniël Meijerplein',
    description: 'Monument ter nagedachtenis aan de Februaristaking van 1941',
    lat: 52.3676,
    lon: 4.9041,
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/De_Dokwerker.jpg/800px-De_Dokwerker.jpg',
    websiteUrl: 'https://amsterdam.kunstwacht.nl/',
    year: '1952'
  },
  {
    id: 'ams-002',
    name: 'Nationale Monument',
    artist: 'J.J.P. Oud',
    location: 'Dam',
    description: 'Nationaal monument ter nagedachtenis aan de slachtoffers van de Tweede Wereldoorlog',
    lat: 52.3733,
    lon: 4.8936,
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Nationaal_Monument_Amsterdam_2019.jpg/800px-Nationaal_Monument_Amsterdam_2019.jpg',
    websiteUrl: 'https://amsterdam.kunstwacht.nl/',
    year: '1956'
  },
  {
    id: 'ams-003',
    name: 'Homo Ludens',
    artist: 'Atelier Van Lieshout',
    location: 'Westerpark',
    description: 'Kleurrijk kunstwerk in Westerpark',
    lat: 52.3883,
    lon: 4.8775,
    photoUrl: null,
    websiteUrl: 'https://amsterdam.kunstwacht.nl/',
    year: '2002'
  },
  {
    id: 'ams-004',
    name: 'Anne Frank',
    artist: 'Mari Andriessen',
    location: 'Merwedeplein',
    description: 'Standbeeld van Anne Frank',
    lat: 52.3486,
    lon: 4.8914,
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Anne_Frank_statue_at_Merwedeplein_in_Amsterdam.jpg/800px-Anne_Frank_statue_at_Merwedeplein_in_Amsterdam.jpg',
    websiteUrl: 'https://amsterdam.kunstwacht.nl/',
    year: '1977'
  },
  {
    id: 'ams-005',
    name: 'De Verzonken Stad',
    artist: 'Atelier Van Lieshout',
    location: 'Zuidas',
    description: 'Modern kunstwerk in de Zuidas',
    lat: 52.3368,
    lon: 4.8731,
    photoUrl: null,
    websiteUrl: 'https://amsterdam.kunstwacht.nl/',
    year: '2013'
  }
];
