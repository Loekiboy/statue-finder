# Quick Start Guide - iOS App

## Snelle Start voor Ontwikkelaars

Deze gids helpt je snel aan de slag met de Statue Finder iOS app.

## Vereisten

- macOS Sonoma (14.0+) of nieuwer
- Xcode 15.0+
- Apple Developer account (voor device testing)
- Supabase account

## Stap-voor-stap Installatie

### 1. Clone de Repository

```bash
git clone https://github.com/Loekiboy/statue-finder.git
cd statue-finder/swift
```

### 2. Maak Xcode Project

Optie A: Gebruik de meegeleverde bestanden
```bash
# Alle bestanden zijn al aanwezig in de swift/ directory
# Open Xcode en maak een nieuw project in deze directory
```

Optie B: Gebruik de command line (macOS Ventura+)
```bash
# Dit commando werkt mogelijk niet op alle macOS versies
xcodebuild -create-xcodeproj
```

### 3. Open in Xcode

```bash
open StatueFinder.xcodeproj
```

Of gebruik Finder:
1. Open Finder
2. Navigeer naar `statue-finder/swift/`
3. Dubbelklik op `StatueFinder.xcodeproj` (wanneer aangemaakt)

### 4. Voeg Dependencies Toe

1. In Xcode, ga naar: **File → Add Package Dependencies...**
2. Plak deze URL: `https://github.com/supabase/supabase-swift.git`
3. Kies **Version**: `2.5.0` (of nieuwer)
4. Klik **Add Package**
5. Selecteer **Supabase** en klik **Add Package**

### 5. Configureer Supabase

1. Ga naar [supabase.com](https://supabase.com)
2. Log in en open je project (of maak een nieuw project)
3. Ga naar **Settings → API**
4. Kopieer:
   - **Project URL**
   - **anon/public key**

5. Open `Info.plist` in Xcode
6. Update deze waarden:
   ```xml
   <key>SUPABASE_URL</key>
   <string>PLAK_HIER_JE_PROJECT_URL</string>
   
   <key>SUPABASE_ANON_KEY</key>
   <string>PLAK_HIER_JE_ANON_KEY</string>
   ```

### 6. Kopieer Data Bestand

Kopieer het Nijmegen kunstwerken bestand:

```bash
# Vanuit de swift/ directory:
mkdir -p StatueFinder/Resources
cp ../src/data/nijmegenKunstwerken.json StatueFinder/Resources/
```

Voeg het bestand toe aan Xcode:
1. Sleep `nijmegenKunstwerken.json` naar de Resources folder in Xcode
2. Vink **Copy items if needed** aan
3. Klik **Finish**

### 7. Build en Run

1. Selecteer een iOS Simulator (bijv. iPhone 15 Pro)
2. Druk op **⌘ + R** (of klik de ▶️ knop)
3. De app moet nu builden en starten!

## Eerste Gebruik

### Locatie Testen

**Op Simulator:**
1. Menu: **Features → Location → Custom Location...**
2. Gebruik Nijmegen coördinaten:
   - Latitude: `51.8426`
   - Longitude: `5.8578`

**Op Device:**
- Geef locatie permissie als gevraagd
- De app gebruikt je echte GPS locatie

### Account Aanmaken

1. Ga naar het **Profiel** tab (laatste icon)
2. Klik **Inloggen**
3. Klik **Nog geen account? Registreer**
4. Vul email en wachtwoord in
5. Klik **Registreren**

## Project Structuur Overzicht

```
swift/
├── StatueFinder/
│   ├── App/                    # App entry point
│   │   └── StatueFinderApp.swift
│   ├── Models/                 # Data models
│   │   ├── Statue.swift
│   │   ├── User.swift
│   │   └── Discovery.swift
│   ├── Views/                  # SwiftUI views
│   │   ├── ContentView.swift   # Main tab container
│   │   ├── MapView.swift       # Interactive map
│   │   ├── ModelViewer.swift   # 3D model viewer
│   │   ├── DiscoveriesView.swift
│   │   ├── UploadView.swift
│   │   ├── LeaderboardView.swift
│   │   └── ProfileView.swift
│   ├── Components/             # Reusable components
│   │   └── LiquidGlassTabBar.swift  # Custom tab bar
│   ├── Services/               # Business logic
│   │   ├── SupabaseService.swift
│   │   ├── LocationService.swift
│   │   └── CacheService.swift
│   ├── Utilities/              # Helpers
│   │   ├── Constants.swift
│   │   └── Extensions.swift
│   └── Resources/              # Assets & data
│       └── nijmegenKunstwerken.json
├── README.md                   # Uitgebreide documentatie
├── XCODE_SETUP.md             # Gedetailleerde setup
└── Package.swift              # Dependencies
```

## Features Overzicht

### ✅ Werkende Features

1. **Kaart Tab**
   - Interactive MapKit kaart
   - GPS tracking
   - Standbeeld markers
   - Detail views

2. **Ontdekkingen Tab**
   - Lijst van ontdekte standbeelden
   - Discovery timestamps
   - Thumbnail previews

3. **Upload Tab**
   - Foto selectie
   - STL bestand upload
   - GPS locatie vastlegging
   - Naam en beschrijving

4. **Leaderboard Tab**
   - Rankings (klaar voor data)
   - User statistics

5. **Profiel Tab**
   - Authenticatie (login/signup)
   - User instellingen
   - Cache management

6. **Liquid Glass Tab Bar**
   - Custom blur effect
   - Smooth animations
   - Haptic feedback

### 🚧 Todo / Improvements

1. **3D Model Viewer**
   - Implementeer STL parser
   - Vervang placeholder geometry

2. **Offline Mode**
   - Cache downloaded models
   - Offline kaart tiles

3. **Notifications**
   - Discovery notifications
   - Nearby statue alerts

## Common Issues & Fixes

### Build Failed

```bash
# Clean build folder
⌘ + Shift + K

# Reset package caches
File → Packages → Reset Package Caches

# Rebuild
⌘ + B
```

### "Cannot find Supabase"

1. Controleer of package is toegevoegd
2. **File → Packages → Resolve Package Versions**
3. Rebuild

### Location Not Working

**Simulator:**
- Zet custom location: **Features → Location → Custom Location**

**Device:**
- **Settings → Privacy → Location Services → StatueFinder → While Using**

### App Crashes on Launch

1. Check Console voor error messages
2. Verify Info.plist is correct
3. Verify Supabase credentials

## Development Tips

### SwiftUI Previews

Gebruik previews voor snelle UI development:

```swift
struct MyView_Previews: PreviewProvider {
    static var previews: some View {
        MyView()
            .environmentObject(LocationService())
            .environmentObject(SupabaseService())
    }
}
```

### Debug Logging

Voeg print statements toe voor debugging:

```swift
print("DEBUG: User location updated: \(coordinate)")
```

### Hot Reload

SwiftUI ondersteunt live previews:
1. Open een View bestand
2. Klik **Resume** in preview pane
3. Edit code en zie live updates!

## Testing op Device

1. Sluit iPhone aan via USB
2. Selecteer je device in Xcode
3. Trust het device (eerste keer)
4. **⌘ + R** om te builden en installeren
5. Op device: **Settings → General → VPN & Device Management**
6. Trust je developer certificate

## App Distributie

### TestFlight (Beta Testing)

1. Archive: **Product → Archive**
2. Upload to App Store Connect
3. Voeg beta testers toe
4. Verzend naar TestFlight

### App Store Release

1. Prepare app in App Store Connect
2. Archive app
3. Upload via Organizer
4. Submit for review

## Support & Documentatie

- **README.md**: Volledige app documentatie
- **XCODE_SETUP.md**: Gedetailleerde project setup
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **SwiftUI Docs**: [developer.apple.com](https://developer.apple.com/documentation/swiftui/)

## Verwijdering

Om de iOS app volledig te verwijderen:

```bash
cd statue-finder
rm -rf swift/
```

De web app blijft volledig functioneel! 🎉

---

**Veel plezier met ontwikkelen! 🚀**
