//
//  LeaderboardView.swift
//  StatueFinder
//
//  View for displaying leaderboards
//

import SwiftUI

struct LeaderboardView: View {
    @EnvironmentObject var supabaseService: SupabaseService
    @State private var leaderboardData: [LeaderboardEntry] = []
    @State private var isLoading = true
    
    var body: some View {
        NavigationView {
            ZStack {
                if isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                } else if leaderboardData.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "chart.bar")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        
                        Text("Nog geen data")
                            .font(.headline)
                        
                        Text("Ontdek standbeelden om op het leaderboard te komen!")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                } else {
                    List {
                        ForEach(Array(leaderboardData.enumerated()), id: \.element.id) { index, entry in
                            LeaderboardRow(
                                rank: index + 1,
                                entry: entry,
                                isCurrentUser: entry.userId == supabaseService.currentUser?.id
                            )
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Leaderboard")
            .navigationBarTitleDisplayMode(.large)
        }
        .task {
            await loadLeaderboard()
        }
    }
    
    private func loadLeaderboard() async {
        defer { isLoading = false }
        
        // TODO: Implement actual leaderboard fetching from Supabase
        // For now, using mock data
        leaderboardData = []
    }
}

struct LeaderboardEntry: Identifiable {
    let id: String
    let userId: String
    let username: String
    let discoveryCount: Int
    let uploadCount: Int
}

struct LeaderboardRow: View {
    let rank: Int
    let entry: LeaderboardEntry
    let isCurrentUser: Bool
    
    var body: some View {
        HStack(spacing: 16) {
            // Rank badge
            ZStack {
                Circle()
                    .fill(rankColor)
                    .frame(width: 40, height: 40)
                
                Text("\(rank)")
                    .font(.headline)
                    .foregroundColor(.white)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(entry.username)
                        .font(.headline)
                    
                    if isCurrentUser {
                        Text("(Jij)")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
                
                HStack(spacing: 16) {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.caption)
                        Text("\(entry.discoveryCount)")
                            .font(.caption)
                    }
                    .foregroundColor(.yellow)
                    
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.caption)
                        Text("\(entry.uploadCount)")
                            .font(.caption)
                    }
                    .foregroundColor(.green)
                }
            }
            
            Spacer()
        }
        .padding(.vertical, 8)
        .background(isCurrentUser ? Color.blue.opacity(0.1) : Color.clear)
    }
    
    private var rankColor: Color {
        switch rank {
        case 1: return Color.yellow
        case 2: return Color.gray
        case 3: return Color.orange
        default: return Color.blue
        }
    }
}

struct LeaderboardView_Previews: PreviewProvider {
    static var previews: some View {
        LeaderboardView()
            .environmentObject(SupabaseService())
    }
}
