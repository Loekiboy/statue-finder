# Xcode Project Setup Guide

Deze gids helpt je bij het opzetten van het Statue Finder iOS project in Xcode.

## Stappen voor Project Setup

### 1. Maak een nieuw Xcode Project

1. Open Xcode
2. Kies "Create a new Xcode project"
3. Selecteer "iOS" > "App"
4. Vul de project details in:
   - Product Name: `StatueFinder`
   - Team: Jouw Apple Developer Team
   - Organization Identifier: `com.yourdomain`
   - Bundle Identifier: `com.yourdomain.StatueFinder`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: None
   - Uncheck "Include Tests"

5. Sla het project op in de `swift/` directory (vervang de auto-gegenereerde bestanden)

### 2. Voeg Dependencies Toe

#### Via Swift Package Manager:

1. Ga naar File > Add Packages...
2. Voeg de Supabase Swift SDK toe:
   - URL: `https://github.com/supabase/supabase-swift.git`
   - Version: 2.5.0 of hoger

### 3. Project Structure

Organiseer de bestanden in Xcode volgens deze structuur:

```
StatueFinder/
├── App/
│   ├── StatueFinderApp.swift
│   └── Info.plist
├── Models/
│   ├── Statue.swift
│   ├── User.swift
│   └── Discovery.swift
├── Views/
│   ├── ContentView.swift
│   ├── MapView.swift
│   ├── ModelViewer.swift
│   ├── DiscoveriesView.swift
│   ├── UploadView.swift
│   ├── LeaderboardView.swift
│   └── ProfileView.swift
├── Components/
│   └── LiquidGlassTabBar.swift
├── Services/
│   ├── SupabaseService.swift
│   ├── LocationService.swift
│   └── CacheService.swift
├── Utilities/
│   ├── Constants.swift
│   └── Extensions.swift
└── Resources/
    └── nijmegenKunstwerken.json (kopieer van parent project)
```

### 4. Configureer Info.plist

Voeg de volgende keys toe aan je Info.plist:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We gebruiken je locatie om standbeelden in je buurt te tonen.</string>

<key>NSCameraUsageDescription</key>
<string>We hebben toegang tot je camera nodig om foto's te maken.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We hebben toegang tot je fotobibliotheek nodig om foto's te uploaden.</string>

<key>SUPABASE_URL</key>
<string>https://your-project.supabase.co</string>

<key>SUPABASE_ANON_KEY</key>
<string>your-anon-key-here</string>
```

### 5. Build Settings

Configureer de volgende build settings:

- **Deployment Target**: iOS 16.0 of hoger
- **Supported Devices**: iPhone
- **Orientations**: Portrait, Landscape Left, Landscape Right

### 6. Capabilities

Voeg de volgende capabilities toe in "Signing & Capabilities":

- Location (When In Use)
- Camera
- Photo Library

### 7. Kopieer JSON Data

Kopieer het bestand `../../src/data/nijmegenKunstwerken.json` naar de Resources folder in je Xcode project:

```bash
cp ../../src/data/nijmegenKunstwerken.json StatueFinder/Resources/
```

Voeg het bestand toe aan je Xcode project via de File Inspector.

### 8. Configureer Supabase

Update de Info.plist met je Supabase credentials:

1. Ga naar je Supabase project dashboard
2. Kopieer de Project URL
3. Kopieer de Anon/Public key
4. Update de waarden in Info.plist

### 9. Build en Test

1. Selecteer een iOS Simulator of aangesloten device
2. Druk op Cmd+R of klik op de Run knop
3. Test de app functionaliteit

## Troubleshooting

### "Cannot find type 'SupabaseClient' in scope"

Zorg ervoor dat je de Supabase Swift SDK hebt toegevoegd via Swift Package Manager.

### "Location permission denied"

Test op een echt device of configureer de simulator locatie via Features > Location > Custom Location

### Build fouten

- Clean build folder: Cmd+Shift+K
- Reset package caches: File > Packages > Reset Package Caches
- Rebuild: Cmd+B

## Deployment

Voor deployment naar TestFlight of App Store:

1. Configureer een App ID in Apple Developer Portal
2. Configureer Signing & Capabilities met je provisioning profile
3. Archive de app: Product > Archive
4. Upload naar App Store Connect via Organizer

## Support

Voor vragen of problemen, open een issue op GitHub.
