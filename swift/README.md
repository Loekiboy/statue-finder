# Statue Finder iOS App

Een native iOS applicatie voor het ontdekken van standbeelden in Nederland, gebouwd met Swift en SwiftUI.

## 📱 Over deze App

Dit is een iOS versie van de Statue Finder web applicatie. De app biedt dezelfde functionaliteiten als de web versie maar dan geoptimaliseerd voor iPhone met een liquid glass bottom bar effect.

## 🎯 Functies

- **Kaart & Ontdekking**: Interactieve kaart met real-time GPS tracking
- **3D Viewer**: Bekijk standbeelden in 3D met SceneKit
- **AR Viewer**: Bekijk standbeelden in Augmented Reality (ARKit) - plaats 3D modellen in je eigen omgeving! ✨
- **Upload**: Upload foto's en 3D modellen van standbeelden
- **Profiel**: Beheer je ontdekkingen en uploads
- **Leaderboards**: Zie wie de meeste standbeelden heeft ontdekt

## 🔧 Vereisten

- **Xcode** 15.0 of hoger
- **iOS** 16.0 of hoger
- **Swift** 5.9 of hoger
- **ARKit** compatibel apparaat (iPhone 6s of nieuwer)
- GPS/locatie services voor volledige functionaliteit

## 📦 Installatie

### 1. Open het project in Xcode

```bash
cd swift
open StatueFinder.xcodeproj
```

### 2. Configureer de omgevingsvariabelen

Maak een `Config.plist` bestand aan met de volgende inhoud:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>SUPABASE_URL</key>
    <string>your_supabase_url</string>
    <key>SUPABASE_ANON_KEY</key>
    <string>your_supabase_anon_key</string>
</dict>
</plist>
```

### 3. Build en Run

1. Selecteer een simulator of aangesloten iPhone
2. Druk op Cmd+R of klik op de Run knop
3. De app start automatisch

## 🏗️ Project Structuur

```
swift/
├── StatueFinder/
│   ├── App/
│   │   ├── StatueFinderApp.swift      # Hoofd app entry point
│   │   └── Config.plist                # Configuratie
│   ├── Models/
│   │   ├── Statue.swift                # Standbeeld data model
│   │   ├── User.swift                  # Gebruiker data model
│   │   └── Discovery.swift             # Ontdekking data model
│   ├── Views/
│   │   ├── ContentView.swift           # Hoofd view met tab bar
│   │   ├── MapView.swift               # Kaart weergave
│   │   ├── ModelViewer.swift           # 3D model viewer
│   │   ├── ARModelView.swift           # AR viewer (ARKit) ✨ NIEUW
│   │   ├── UploadView.swift            # Upload interface
│   │   ├── ProfileView.swift           # Profiel pagina
│   │   ├── LeaderboardView.swift       # Leaderboard
│   │   └── DiscoveriesView.swift       # Ontdekkingen overzicht
│   ├── Components/
│   │   └── LiquidGlassTabBar.swift     # Liquid glass bottom bar
│   ├── Services/
│   │   ├── SupabaseService.swift       # Supabase integratie
│   │   ├── LocationService.swift       # Locatie services
│   │   └── CacheService.swift          # Cache management
│   └── Utilities/
│       ├── Extensions.swift            # Swift extensies
│       ├── Constants.swift             # Constanten
│       └── STLParser.swift             # STL 3D model parser ✨ NIEUW
├── Assets.xcassets/                    # App icons & afbeeldingen
├── Info.plist                          # App configuratie + AR permissies
└── Package.swift                       # Swift Package Manager
```

## 🛠️ Technologie Stack

### iOS Framework
- **SwiftUI** - Modern declarative UI framework
- **MapKit** - Kaart weergave en annotaties
- **ARKit** - Augmented Reality functionaliteit voor het plaatsen van 3D modellen in de echte wereld
- **SceneKit** - 3D model rendering (voor zowel normale 3D view als AR)
- **CoreLocation** - GPS en locatie services
- **AVFoundation** - Camera en media handling

### Backend & Storage
- **Supabase Swift SDK** - Backend-as-a-Service
  - Authenticatie
  - Database (PostgreSQL)
  - File storage voor modellen & foto's
  - Real-time subscriptions

### Dependencies (via Swift Package Manager)
- `supabase-swift` - Supabase client
- `Alamofire` - Netwerking (optioneel)

## 🎨 UI Features

### AR Viewer 🌟
De app bevat een volledig functionele AR viewer:
- **Automatische vlakdetectie**: ARKit detecteert automatisch horizontale vlakken (zoals vloeren en tafels)
- **Intelligente schaling**: 3D modellen worden automatisch geschaald naar een realistische grootte (ongeveer 30cm)
- **STL parser**: Ingebouwde parser voor het laden van STL 3D modellen
- **Realistisch licht**: Maakt gebruik van fysiek gebaseerde rendering (PBR) voor realistische belichting
- **Rotatie animatie**: Modellen roteren automatisch voor een betere kijkervaring
- **Haptic feedback**: Voelbare feedback wanneer het model geplaatst wordt

### Liquid Glass Bottom Bar
De bottom navigation bar heeft een uniek liquid glass effect met:
- Semi-transparante blur achtergrond
- Vloeiende animaties bij tab switches
- Aangepaste iconen voor elke sectie
- Haptic feedback bij interacties

### Dark Mode Support
De app ondersteunt automatisch dark mode en past zich aan aan de systeeminstellingen.

## 📱 Minimale iOS Versie

- **iOS 16.0+** voor volledige functionaliteit
- **ARKit compatibel apparaat** (iPhone 6s of nieuwer) voor AR functionaliteit
- MapKit en SceneKit integratie
- SwiftUI 4.0 features

## 🗺️ Locatie & Permissies

De app vraagt om de volgende permissies:
- **Locatie (When In Use)**: Voor het tonen van je huidige locatie op de kaart
- **Camera**: Voor AR functionaliteit en het maken van foto's van standbeelden
- **Foto Library**: Voor het uploaden van bestaande foto's
- **ARKit**: Voor het plaatsen van 3D modellen in augmented reality

### AR Apparaat Vereisten
Voor de beste AR ervaring heb je nodig:
- iPhone 6s of nieuwer
- iOS 16.0 of hoger
- Goede verlichting (AR werkt het best in goed verlichte ruimtes)
- Vlakke oppervlakken (voor het plaatsen van modellen)

## 🔐 Privacy & Security

- Gebruikerslocaties worden alleen lokaal gebruikt voor kaartweergave
- AR beelden worden niet opgeslagen tenzij je expliciet een foto maakt
- Uploads worden beveiligd via Supabase Row Level Security
- Geen tracking of analytics
- EXIF data wordt verwerkt voor locatie-informatie

## 🚀 Build voor Release

1. Selecteer "Any iOS Device" als target
2. Product > Archive
3. Volg de stappen in de Organizer voor distributie

## 📝 Ontwikkel Notes

- De app gebruikt async/await voor asynchrone operaties
- State management via @StateObject en @EnvironmentObject
- Dependency injection voor services
- AR implementatie maakt gebruik van ARKit's world tracking en plane detection
- STL bestanden worden in real-time geparsed voor gebruik in SceneKit

## 🐛 Bekende Issues

- AR werkt niet in de simulator - test op een echt apparaat
- Grote STL bestanden kunnen traag laden - overweeg model optimalisatie
- AR werkt het best in goed verlichte omgevingen
- Voor optimale AR prestaties, gebruik modellen kleiner dan 5MB

## 🗑️ Verwijderen

Om deze iOS app volledig te verwijderen, verwijder simpelweg de `swift/` map:

```bash
rm -rf swift/
```

De web app blijft volledig functioneel.

## 📧 Contact

Voor vragen of suggesties, open een issue op GitHub.

---

**Gemaakt met ❤️ voor het ontdekken van Nederlandse kunst & cultuur**
