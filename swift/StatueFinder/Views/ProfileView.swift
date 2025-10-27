//
//  ProfileView.swift
//  StatueFinder
//
//  User profile view
//

import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var supabaseService: SupabaseService
    @StateObject private var cacheService = CacheService()
    
    @State private var showingSignIn = false
    @State private var showingEditUsername = false
    @State private var newUsername = ""
    
    var body: some View {
        NavigationView {
            List {
                if supabaseService.isAuthenticated {
                    // User info section
                    Section {
                        HStack {
                            Image(systemName: "person.circle.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.blue)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text(supabaseService.userProfile?.username ?? "Gebruiker")
                                    .font(.headline)
                                
                                if let email = supabaseService.currentUser?.email {
                                    Text(email)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            Spacer()
                            
                            Button(action: { showingEditUsername = true }) {
                                Image(systemName: "pencil")
                            }
                        }
                        .padding(.vertical, 8)
                    }
                    
                    // Statistics section
                    Section("Statistieken") {
                        HStack {
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                            Text("Ontdekkingen")
                            Spacer()
                            Text("0")
                                .foregroundColor(.secondary)
                        }
                        
                        HStack {
                            Image(systemName: "arrow.up.circle.fill")
                                .foregroundColor(.green)
                            Text("Uploads")
                            Spacer()
                            Text("0")
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    // Settings section
                    Section("Instellingen") {
                        NavigationLink(destination: SettingsView()) {
                            HStack {
                                Image(systemName: "gear")
                                Text("App Instellingen")
                            }
                        }
                        
                        HStack {
                            Image(systemName: "externaldrive")
                            Text("Cache Grootte")
                            Spacer()
                            Text(formatBytes(cacheService.getCacheSize()))
                                .foregroundColor(.secondary)
                        }
                        
                        Button(action: clearCache) {
                            HStack {
                                Image(systemName: "trash")
                                    .foregroundColor(.red)
                                Text("Wis Cache")
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    
                    // Sign out section
                    Section {
                        Button(action: signOut) {
                            HStack {
                                Spacer()
                                Text("Uitloggen")
                                    .foregroundColor(.red)
                                Spacer()
                            }
                        }
                    }
                } else {
                    // Not signed in
                    Section {
                        VStack(spacing: 20) {
                            Image(systemName: "person.crop.circle.badge.xmark")
                                .font(.system(size: 60))
                                .foregroundColor(.gray)
                            
                            Text("Niet ingelogd")
                                .font(.headline)
                            
                            Text("Log in om je ontdekkingen op te slaan en modellen te uploaden")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            Button(action: { showingSignIn = true }) {
                                Text("Inloggen")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.blue)
                                    .cornerRadius(12)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Profiel")
            .navigationBarTitleDisplayMode(.large)
        }
        .sheet(isPresented: $showingSignIn) {
            SignInView()
        }
        .sheet(isPresented: $showingEditUsername) {
            EditUsernameView(username: $newUsername)
        }
    }
    
    private func signOut() {
        Task {
            try? await supabaseService.signOut()
        }
    }
    
    private func clearCache() {
        try? cacheService.clearCache()
    }
    
    private func formatBytes(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }
}

struct SettingsView: View {
    @EnvironmentObject var supabaseService: SupabaseService
    
    var body: some View {
        Form {
            Section("Weergave") {
                Toggle("Toon OSM Standbeelden", isOn: .constant(true))
            }
            
            Section("Taal") {
                Picker("Taal", selection: .constant("nl")) {
                    Text("Nederlands").tag("nl")
                    Text("English").tag("en")
                }
            }
        }
        .navigationTitle("Instellingen")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SignInView: View {
    @EnvironmentObject var supabaseService: SupabaseService
    @Environment(\.dismiss) var dismiss
    
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                    
                    SecureField("Wachtwoord", text: $password)
                        .textContentType(.password)
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
                
                Section {
                    Button(action: authenticate) {
                        if isLoading {
                            ProgressView()
                        } else {
                            Text(isSignUp ? "Registreren" : "Inloggen")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(email.isEmpty || password.isEmpty || isLoading)
                    
                    Button(action: { isSignUp.toggle() }) {
                        Text(isSignUp ? "Al een account? Log in" : "Nog geen account? Registreer")
                            .frame(maxWidth: .infinity)
                    }
                    .foregroundColor(.blue)
                }
            }
            .navigationTitle(isSignUp ? "Registreren" : "Inloggen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Annuleren") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func authenticate() {
        isLoading = true
        errorMessage = nil
        
        Task {
            defer { isLoading = false }
            
            do {
                if isSignUp {
                    try await supabaseService.signUp(email: email, password: password)
                } else {
                    try await supabaseService.signIn(email: email, password: password)
                }
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

struct EditUsernameView: View {
    @Binding var username: String
    @EnvironmentObject var supabaseService: SupabaseService
    @Environment(\.dismiss) var dismiss
    
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextField("Gebruikersnaam", text: $username)
                }
                
                Section {
                    Button(action: saveUsername) {
                        if isLoading {
                            ProgressView()
                        } else {
                            Text("Opslaan")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(username.isEmpty || isLoading)
                }
            }
            .navigationTitle("Bewerk Gebruikersnaam")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Annuleren") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func saveUsername() {
        isLoading = true
        
        Task {
            defer { isLoading = false }
            
            try? await supabaseService.updateUsername(username)
            dismiss()
        }
    }
}

struct ProfileView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileView()
            .environmentObject(SupabaseService())
    }
}
