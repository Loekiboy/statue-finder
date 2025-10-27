//
//  UploadView.swift
//  StatueFinder
//
//  View for uploading photos and 3D models of statues
//

import SwiftUI
import PhotosUI

struct UploadView: View {
    @EnvironmentObject var supabaseService: SupabaseService
    @EnvironmentObject var locationService: LocationService
    
    @State private var statueName = ""
    @State private var statueDescription = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedModel: URL?
    @State private var isShowingFilePicker = false
    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var showSuccessAlert = false
    
    var body: some View {
        NavigationView {
            Form {
                Section("Standbeeld Informatie") {
                    TextField("Naam", text: $statueName)
                    
                    TextField("Beschrijving (optioneel)", text: $statueDescription, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section("Locatie") {
                    if let coordinate = locationService.userLocation {
                        HStack {
                            Image(systemName: "location.fill")
                            Text(String(format: "%.6f, %.6f", coordinate.latitude, coordinate.longitude))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } else {
                        Text("Locatie niet beschikbaar")
                            .foregroundColor(.secondary)
                    }
                }
                
                Section("Foto") {
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        HStack {
                            Image(systemName: "photo")
                            Text(selectedPhoto == nil ? "Selecteer Foto" : "Foto Geselecteerd")
                        }
                    }
                }
                
                Section("3D Model") {
                    Button(action: { isShowingFilePicker = true }) {
                        HStack {
                            Image(systemName: "cube")
                            Text(selectedModel == nil ? "Selecteer STL Bestand" : "Model Geselecteerd")
                        }
                    }
                    .foregroundColor(.primary)
                }
                
                Section {
                    Button(action: uploadStatue) {
                        if isUploading {
                            HStack {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                                Text("Uploaden...")
                            }
                        } else {
                            Text("Upload Standbeeld")
                                .bold()
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(!canUpload || isUploading)
                }
                
                if let error = uploadError {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Upload")
            .navigationBarTitleDisplayMode(.large)
        }
        .alert("Upload Succesvol!", isPresented: $showSuccessAlert) {
            Button("OK") {
                resetForm()
            }
        } message: {
            Text("Je standbeeld is succesvol geüpload!")
        }
    }
    
    private var canUpload: Bool {
        !statueName.isEmpty &&
        selectedModel != nil &&
        locationService.userLocation != nil &&
        supabaseService.isAuthenticated
    }
    
    private func uploadStatue() {
        guard canUpload else { return }
        
        isUploading = true
        uploadError = nil
        
        Task {
            defer { isUploading = false }
            
            do {
                // Read model file
                guard let modelURL = selectedModel,
                      let modelData = try? Data(contentsOf: modelURL) else {
                    uploadError = "Kon model bestand niet lezen"
                    return
                }
                
                let coordinate = locationService.userLocation
                
                // Upload to Supabase
                let _ = try await supabaseService.uploadStatue(
                    name: statueName,
                    description: statueDescription.isEmpty ? nil : statueDescription,
                    latitude: coordinate?.latitude,
                    longitude: coordinate?.longitude,
                    modelFile: modelData
                )
                
                showSuccessAlert = true
            } catch {
                uploadError = "Upload mislukt: \(error.localizedDescription)"
            }
        }
    }
    
    private func resetForm() {
        statueName = ""
        statueDescription = ""
        selectedPhoto = nil
        selectedModel = nil
        uploadError = nil
    }
}

struct UploadView_Previews: PreviewProvider {
    static var previews: some View {
        UploadView()
            .environmentObject(SupabaseService())
            .environmentObject(LocationService())
    }
}
