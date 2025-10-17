# Statue Finder - 3D Standbeeld Ontdek App

Een interactieve web applicatie waarmee gebruikers standbeelden in Nederland kunnen ontdekken, bekijken in 3D, en hun eigen modellen en foto's kunnen uploaden.

## 🎯 Over het Project

Statue Finder is een Pokémon GO-achtige applicatie voor het ontdekken van standbeelden. Gebruikers kunnen:
- **Standbeelden ontdekken** op een interactieve kaart
- **3D modellen bekijken** van standbeelden in augmented reality style
- **Foto's en 3D modellen uploaden** van standbeelden
- **Ontdekkingen verzamelen** wanneer ze fysiek bij een standbeeld zijn

Het project gebruikt moderne web technologieën en biedt een responsive, mobiele-first ervaring.

## 🚀 Functionaliteiten

### Kaart & Ontdekking
- Interactieve kaart met real-time GPS tracking
- Marker clustering voor betere prestaties bij veel standbeelden
- Ontdek standbeelden binnen 50 meter van je locatie
- Confetti animatie bij nieuwe ontdekkingen

### Standbeeld Database
- Nijmegen standbeelden database geïntegreerd
- OpenStreetMap integratie voor standbeelden zonder 3D model
- Mogelijkheid om als eerste een model te uploaden voor een standbeeld

### 3D Viewer
- WebGL-gebaseerde 3D model viewer
- Touch gestures ondersteuning (pinch to zoom, drag to rotate)
- Auto-rotatie functie
- Optimaliseerde rendering voor mobiele apparaten

### Upload Systeem
- Upload foto's van standbeelden met GPS data extractie
- Upload 3D modellen (.STL formaat)
- Automatische thumbnail generatie
- Foto compressie voor snellere uploads

### Offline & Caching
- Intelligente caching van kaart tiles bij WiFi
- Vooraf laden van 3D modellen in de buurt
- Offline ondersteuning voor eerder geladen content

## 📋 Vereisten

- **Node.js** v18 of hoger
- **npm** v9 of hoger
- Modern browser met WebGL ondersteuning
- GPS/locatie services voor volledige functionaliteit

## 🔧 Installatie

### 1. Clone de repository

```bash
git clone https://github.com/Loekiboy/statue-finder.git
cd statue-finder
```

### 2. Installeer dependencies

```bash
npm install
```

### 3. Configureer omgevingsvariabelen

Maak een `.env` bestand in de root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start de development server

```bash
npm run dev
```

De applicatie is nu beschikbaar op `http://localhost:5173`

## 🏗️ Build voor Productie

```bash
npm run build
```

Build output staat in de `dist/` directory.

Preview de productie build lokaal:

```bash
npm run preview
```

## 🧪 Linting

Controleer code kwaliteit:

```bash
npm run lint
```

## 📁 Project Structuur

```
statue-finder/
├── src/
│   ├── components/         # React componenten
│   │   ├── MapView.tsx    # Hoofdkaart component
│   │   ├── StandbeeldViewer.tsx  # 3D model viewer
│   │   ├── QuickUploadDialog.tsx # Quick upload modal
│   │   └── ui/            # Herbruikbare UI componenten
│   ├── pages/             # Route paginas
│   │   ├── Index.tsx      # Hoofdpagina met kaart
│   │   ├── Upload.tsx     # Upload pagina
│   │   └── Profile.tsx    # Gebruikersprofiel
│   ├── data/              # Statische data
│   │   └── nijmegenStatues.ts  # Nijmegen standbeelden database
│   ├── lib/               # Utility functies
│   │   ├── cacheManager.ts    # Cache management
│   │   └── utils.ts       # Helper functies
│   ├── contexts/          # React contexts
│   │   └── LanguageContext.tsx # i18n ondersteuning
│   └── integrations/      # Externe services
│       └── supabase/      # Supabase client & types
├── public/               # Statische assets
│   └── models/          # 3D model bestanden
├── supabase/            # Supabase configuratie
└── package.json         # Project dependencies
```

## 🛠️ Technologie Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library

### 3D Graphics
- **Three.js** - 3D rendering library
- **@react-three/fiber** - React renderer voor Three.js
- **@react-three/drei** - Helper componenten voor Three.js

### Kaart & Locatie
- **Leaflet** - Interactieve kaarten
- **leaflet.markercluster** - Marker clustering
- **Geolocation API** - GPS tracking

### Backend & Storage
- **Supabase** - Backend-as-a-Service
  - Authenticatie
  - Database (PostgreSQL)
  - File storage voor modellen & foto's
  - Real-time subscriptions

### Utilities
- **TanStack Query** - Data fetching & caching
- **React Router** - Client-side routing
- **ExifReader** - EXIF data extractie uit foto's
- **browser-image-compression** - Client-side foto compressie

## 📱 Browser Ondersteuning

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+ (iOS Safari ondersteund)
- Opera 76+

## 🎨 Features in Detail

### GPS & Locatie Tracking
De app gebruikt de Geolocation API voor real-time positiebepaling. Gebruikers moeten locatie-toegang verlenen in hun browser. Op iOS Safari zijn specifieke instellingen mogelijk nodig.

### 3D Model Rendering
3D modellen worden geladen in STL formaat en gerenderd met Three.js. De viewer ondersteunt:
- Touch gestures voor mobiel
- Auto-rotatie
- Zoom en pan controls
- Responsief design

### Caching Strategie
De app gebruikt een intelligente caching strategie:
- **Map tiles**: Gecached bij WiFi verbinding
- **3D modellen**: Vooraf geladen voor modellen binnen 500m
- **Service Worker**: Voor offline functionaliteit
- **Cache cleanup**: Oude caches worden automatisch verwijderd

### Upload Workflow
1. Kies tussen foto of 3D model upload
2. Selecteer bestand(en)
3. GPS data wordt automatisch geëxtraheerd uit foto's
4. Of selecteer handmatig locatie op kaart
5. Voeg naam en beschrijving toe
6. Upload wordt gecomprimeerd en geoptimaliseerd
7. Thumbnails worden automatisch gegenereerd

## 🤝 Bijdragen

Bijdragen zijn welkom! Om bij te dragen:

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit je wijzigingen (`git commit -m 'Add some AmazingFeature'`)
4. Push naar de branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

## 📝 Code Style

Het project gebruikt:
- ESLint voor code quality
- TypeScript strict mode
- Prettier formatting (volgt Tailwind CSS conventies)

## 🐛 Bekende Issues

- Grote STL bestanden (>20MB) kunnen traag laden
- iOS Safari vereist specifieke locatie-instellingen
- Sommige 3D modellen kunnen extra rotatie/schaling nodig hebben

## 🔐 Privacy & Security

- Gebruikerslocaties worden alleen lokaal gebruikt
- Uploads worden beveiligd via Supabase Row Level Security
- Geen tracking of analytics standaard ingebouwd
- EXIF data wordt client-side verwerkt

## 📄 Licentie

Dit project is gemaakt als onderdeel van een educatief/prototype project.

## 📧 Contact

Voor vragen of suggesties, open een issue op GitHub.

## 🙏 Dankwoord

- OpenStreetMap voor kaart data
- Supabase voor backend infrastructuur
- shadcn/ui voor component library
- Three.js community voor 3D rendering

---

**Gemaakt met ❤️ voor het ontdekken van Nederlandse kunst & cultuur**
