//
//  StatueFinderApp.swift
//  StatueFinder
//
//  Created on 2025
//  iOS app for discovering statues in the Netherlands
//

import SwiftUI

@main
struct StatueFinderApp: App {
    @StateObject private var locationService = LocationService()
    @StateObject private var supabaseService = SupabaseService()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(locationService)
                .environmentObject(supabaseService)
                .preferredColorScheme(.dark) // Optional: force dark mode, can be removed for auto
        }
    }
}
