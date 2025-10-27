//
//  MapView.swift
//  StatueFinder
//
//  Interactive map view for discovering statues
//

import SwiftUI
import MapKit

struct MapView: View {
    @EnvironmentObject var locationService: LocationService
    @EnvironmentObject var supabaseService: SupabaseService
    @StateObject private var cacheService = CacheService()
    
    @State private var statues: [Statue] = []
    @State private var nijmegenKunstwerken: [NijmegenKunstwerk] = []
    @State private var selectedStatue: Statue?
    @State private var showStatueDetail = false
    @State private var cameraPosition: MapCameraPosition = .automatic
    @State private var isLoading = true
    
    var body: some View {
        ZStack {
            // Map
            Map(position: $cameraPosition) {
                // User location
                if let userLocation = locationService.userLocation {
                    Annotation("Je bent hier", coordinate: userLocation) {
                        ZStack {
                            Circle()
                                .fill(Color.blue.opacity(0.3))
                                .frame(width: 40, height: 40)
                            
                            Circle()
                                .fill(Color.blue)
                                .frame(width: 16, height: 16)
                        }
                    }
                }
                
                // Statue markers
                ForEach(statues) { statue in
                    if let coordinate = statue.coordinate {
                        Annotation(statue.name, coordinate: coordinate) {
                            StatueMarker(statue: statue)
                                .onTapGesture {
                                    selectedStatue = statue
                                    showStatueDetail = true
                                }
                        }
                    }
                }
                
                // Nijmegen Kunstwerken markers
                ForEach(nijmegenKunstwerken.indices, id: \.self) { index in
                    if let coordinate = nijmegenKunstwerken[index].coordinate {
                        Annotation(
                            nijmegenKunstwerken[index].properties.kunstwerkNaam,
                            coordinate: coordinate
                        ) {
                            NijmegenKunstwerkMarker()
                        }
                    }
                }
            }
            .mapStyle(.standard(elevation: .realistic))
            .ignoresSafeArea()
            
            // Top controls
            VStack {
                HStack {
                    Spacer()
                    
                    Button(action: centerOnUser) {
                        Image(systemName: "location.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.white)
                            .frame(width: 50, height: 50)
                            .background(
                                Circle()
                                    .fill(.ultraThinMaterial)
                            )
                            .shadow(radius: 5)
                    }
                    .padding()
                }
                
                Spacer()
            }
            
            // Loading indicator
            if isLoading {
                ProgressView()
                    .scaleEffect(1.5)
            }
        }
        .sheet(isPresented: $showStatueDetail) {
            if let statue = selectedStatue {
                StatueDetailView(statue: statue)
            }
        }
        .task {
            await loadData()
        }
    }
    
    private func loadData() async {
        defer { isLoading = false }
        
        // Load statues from Supabase
        do {
            statues = try await supabaseService.fetchStatues()
        } catch {
            print("Error loading statues: \(error)")
        }
        
        // Load Nijmegen Kunstwerken from local JSON
        loadNijmegenKunstwerken()
        
        // Center on user location if available
        if let userLocation = locationService.userLocation {
            cameraPosition = .region(
                MKCoordinateRegion(
                    center: userLocation,
                    span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
                )
            )
        }
    }
    
    private func loadNijmegenKunstwerken() {
        // Load from the parent project's data file
        let parentDataPath = "../../src/data/nijmegenKunstwerken.json"
        
        guard let url = Bundle.main.url(forResource: "nijmegenKunstwerken", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let collection = try? JSONDecoder().decode(NijmegenKunstwerkCollection.self, from: data) else {
            print("Could not load Nijmegen Kunstwerken")
            return
        }
        
        nijmegenKunstwerken = collection.features
    }
    
    private func centerOnUser() {
        guard let userLocation = locationService.userLocation else { return }
        
        withAnimation {
            cameraPosition = .region(
                MKCoordinateRegion(
                    center: userLocation,
                    span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                )
            )
        }
    }
}

// MARK: - Supporting Views

struct StatueMarker: View {
    let statue: Statue
    
    var body: some View {
        VStack(spacing: 0) {
            Image(systemName: "figure.stand")
                .font(.system(size: 20))
                .foregroundColor(.white)
                .frame(width: 40, height: 40)
                .background(
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.blue, Color.purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
                .overlay(
                    Circle()
                        .stroke(Color.white, lineWidth: 2)
                )
            
            // Pointer
            Triangle()
                .fill(Color.blue)
                .frame(width: 10, height: 8)
        }
        .shadow(radius: 3)
    }
}

struct NijmegenKunstwerkMarker: View {
    var body: some View {
        Image(systemName: "paintpalette.fill")
            .font(.system(size: 16))
            .foregroundColor(.white)
            .frame(width: 30, height: 30)
            .background(
                Circle()
                    .fill(Color.orange.opacity(0.8))
            )
            .overlay(
                Circle()
                    .stroke(Color.white, lineWidth: 1.5)
            )
            .shadow(radius: 2)
    }
}

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

struct StatueDetailView: View {
    let statue: Statue
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var locationService: LocationService
    @EnvironmentObject var supabaseService: SupabaseService
    
    @State private var showModelViewer = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Image or placeholder
                    if let photoUrl = statue.photoUrl {
                        AsyncImage(url: URL(string: photoUrl)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                        }
                        .frame(height: 300)
                        .clipped()
                    }
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Text(statue.name)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        if let description = statue.description {
                            Text(description)
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                        
                        // Distance info
                        if let coordinate = statue.coordinate,
                           let distance = locationService.distance(to: coordinate) {
                            HStack {
                                Image(systemName: "location.circle.fill")
                                Text(String(format: "%.0f meter van jou", distance))
                            }
                            .font(.subheadline)
                            .foregroundColor(.blue)
                        }
                        
                        // View 3D Model button
                        Button(action: { showModelViewer = true }) {
                            HStack {
                                Image(systemName: "cube.fill")
                                Text("Bekijk 3D Model")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                LinearGradient(
                                    colors: [Color.blue, Color.purple],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                        }
                        
                        // Discover button
                        if let coordinate = statue.coordinate,
                           locationService.isWithinDiscoveryRange(coordinate) {
                            Button(action: discoverStatue) {
                                HStack {
                                    Image(systemName: "star.fill")
                                    Text("Ontdek dit Standbeeld")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.green)
                                .cornerRadius(12)
                            }
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Sluiten") {
                        dismiss()
                    }
                }
            }
        }
        .sheet(isPresented: $showModelViewer) {
            ModelViewer(statue: statue)
        }
    }
    
    private func discoverStatue() {
        Task {
            do {
                try await supabaseService.discoverStatue(statueId: statue.id)
                dismiss()
            } catch {
                print("Error discovering statue: \(error)")
            }
        }
    }
}

struct MapView_Previews: PreviewProvider {
    static var previews: some View {
        MapView()
            .environmentObject(LocationService())
            .environmentObject(SupabaseService())
    }
}
