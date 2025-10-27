//
//  DiscoveriesView.swift
//  StatueFinder
//
//  View for displaying user's discovered statues
//

import SwiftUI

struct DiscoveriesView: View {
    @EnvironmentObject var supabaseService: SupabaseService
    @State private var discoveries: [Discovery] = []
    @State private var isLoading = true
    
    var body: some View {
        NavigationView {
            ZStack {
                if isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                } else if discoveries.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "star.slash")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        
                        Text("Nog geen ontdekkingen")
                            .font(.headline)
                        
                        Text("Ga naar de kaart en ontdek standbeelden in je buurt!")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(discoveries) { discovery in
                                if let statue = discovery.statue {
                                    DiscoveryCard(discovery: discovery, statue: statue)
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Mijn Ontdekkingen")
            .navigationBarTitleDisplayMode(.large)
        }
        .task {
            await loadDiscoveries()
        }
    }
    
    private func loadDiscoveries() async {
        defer { isLoading = false }
        
        do {
            discoveries = try await supabaseService.fetchDiscoveries()
        } catch {
            print("Error loading discoveries: \(error)")
        }
    }
}

struct DiscoveryCard: View {
    let discovery: Discovery
    let statue: Statue
    
    var body: some View {
        HStack(spacing: 16) {
            // Thumbnail or icon
            if let thumbnailUrl = statue.thumbnailUrl {
                AsyncImage(url: URL(string: thumbnailUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 80, height: 80)
                .cornerRadius(12)
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [Color.blue.opacity(0.6), Color.purple.opacity(0.6)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 80, height: 80)
                    
                    Image(systemName: "figure.stand")
                        .font(.system(size: 32))
                        .foregroundColor(.white)
                }
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text(statue.name)
                    .font(.headline)
                    .lineLimit(2)
                
                Text(formatDate(discovery.discoveredAt))
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack {
                    Image(systemName: "star.fill")
                        .font(.caption)
                    Text("Ontdekt")
                        .font(.caption)
                }
                .foregroundColor(.yellow)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
        )
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        formatter.locale = Locale(identifier: "nl_NL")
        return formatter.string(from: date)
    }
}

struct DiscoveriesView_Previews: PreviewProvider {
    static var previews: some View {
        DiscoveriesView()
            .environmentObject(SupabaseService())
    }
}
