//
//  ContentView.swift
//  StatueFinder
//
//  Main view with custom liquid glass tab bar
//

import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 0
    @EnvironmentObject var locationService: LocationService
    @EnvironmentObject var supabaseService: SupabaseService
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Main content
            Group {
                switch selectedTab {
                case 0:
                    MapView()
                case 1:
                    DiscoveriesView()
                case 2:
                    UploadView()
                case 3:
                    LeaderboardView()
                case 4:
                    ProfileView()
                default:
                    MapView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            // Liquid Glass Tab Bar
            LiquidGlassTabBar(selectedTab: $selectedTab)
        }
        .ignoresSafeArea(.keyboard)
        .onAppear {
            locationService.requestLocationPermission()
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(LocationService())
            .environmentObject(SupabaseService())
    }
}
