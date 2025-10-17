// Statues in Nijmegen, Netherlands
// Data compiled from public sources including OpenStreetMap and municipal records

export interface NijmegenStatue {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  address?: string;
}

export const nijmegenStatues: NijmegenStatue[] = [
  {
    id: 'mariken-van-nieumeghen',
    name: 'Mariken van Nieumeghen',
    description: 'Standbeeld van Mariken van Nieumeghen, een bekend personage uit de middeleeuwse literatuur',
    latitude: 51.8426,
    longitude: 5.8538,
    address: 'Marikenstraat, Nijmegen',
  },
  {
    id: 'de-stevenstoren',
    name: 'Stevenskerk Beelden',
    description: 'Historische beelden bij de Stevenskerk',
    latitude: 51.8478,
    longitude: 5.8661,
    address: 'Grote Markt, Nijmegen',
  },
  {
    id: 'keizer-trajanus',
    name: 'Keizer Trajanus',
    description: 'Standbeeld ter ere van de Romeinse keizer Trajanus die Nijmegen stadsrechten verleende',
    latitude: 51.8456,
    longitude: 5.8643,
    address: 'Keizer Traianusplein, Nijmegen',
  },
  {
    id: 'de-waagh',
    name: 'De Waagh Beelden',
    description: 'Decoratieve beelden bij het historische Waaggebouw',
    latitude: 51.8471,
    longitude: 5.8658,
    address: 'Grote Markt, Nijmegen',
  },
  {
    id: 'monument-de-grote-markt',
    name: 'Monument Grote Markt',
    description: 'Oorlogsmonument op de Grote Markt',
    latitude: 51.8469,
    longitude: 5.8656,
    address: 'Grote Markt, Nijmegen',
  },
  {
    id: 'koningin-wilhelmina',
    name: 'Koningin Wilhelmina',
    description: 'Standbeeld van Koningin Wilhelmina',
    latitude: 51.8445,
    longitude: 5.8625,
    address: 'Wilhelminasingel, Nijmegen',
  },
  {
    id: 'bevrijdingsmonument',
    name: 'Bevrijdingsmonument',
    description: 'Monument ter herdenking van de bevrijding van Nijmegen in 1944',
    latitude: 51.8423,
    longitude: 5.8689,
    address: 'Hunnerpark, Nijmegen',
  },
  {
    id: 'monument-valkhof',
    name: 'Monument Valkhof',
    description: 'Historisch monument bij het Valkhofpark',
    latitude: 51.8502,
    longitude: 5.8685,
    address: 'Valkhofpark, Nijmegen',
  },
  {
    id: 'de-zeven-zusterbeelden',
    name: 'De Zeven Zusters',
    description: 'Kunstwerk van zeven sculpturen',
    latitude: 51.8391,
    longitude: 5.8542,
    address: 'Stationsplein, Nijmegen',
  },
  {
    id: 'standbeeld-plein-1944',
    name: 'Monument Plein 1944',
    description: 'Gedenkteken voor de slachtoffers van de bombardementen',
    latitude: 51.8433,
    longitude: 5.8599,
    address: 'Plein 1944, Nijmegen',
  },
  {
    id: 'monument-kelfkensbos',
    name: 'Monument Kelfkensbos',
    description: 'Oorlogsmonument in het Kelfkensbos',
    latitude: 51.8356,
    longitude: 5.8378,
    address: 'Kelfkensbos, Nijmegen',
  },
  {
    id: 'de-nachtwacht-sculptuur',
    name: 'De Nachtwacht',
    description: 'Modern kunstwerk in het stadscentrum',
    latitude: 51.8451,
    longitude: 5.8612,
    address: 'Burchtstraat, Nijmegen',
  },
  {
    id: 'monument-waalkade',
    name: 'Monument Waalkade',
    description: 'Sculptuur langs de Waalkade',
    latitude: 51.8488,
    longitude: 5.8723,
    address: 'Waalkade, Nijmegen',
  },
  {
    id: 'kronenburgerpark-beeld',
    name: 'Kronenburgerpark Sculptuur',
    description: 'Kunstwerk in het Kronenburgerpark',
    latitude: 51.8524,
    longitude: 5.8589,
    address: 'Kronenburgerpark, Nijmegen',
  },
  {
    id: 'monument-berg-en-dalseweg',
    name: 'Berg en Dalseweg Monument',
    description: 'Gedenkteken aan de Berg en Dalseweg',
    latitude: 51.8312,
    longitude: 5.8567,
    address: 'Berg en Dalseweg, Nijmegen',
  },
];
