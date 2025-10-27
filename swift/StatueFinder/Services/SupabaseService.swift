//
//  SupabaseService.swift
//  StatueFinder
//
//  Service for interacting with Supabase backend
//

import Foundation
import Supabase

@MainActor
class SupabaseService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: AuthUser?
    @Published var userProfile: UserProfile?
    
    private var client: SupabaseClient
    
    init() {
        // Load configuration from Config.plist
        guard let url = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String else {
            fatalError("Missing Supabase configuration in Info.plist")
        }
        
        client = SupabaseClient(
            supabaseURL: URL(string: url)!,
            supabaseKey: key
        )
        
        Task {
            await checkAuth()
        }
    }
    
    // MARK: - Authentication
    
    func checkAuth() async {
        do {
            let session = try await client.auth.session
            self.currentUser = AuthUser(
                id: session.user.id.uuidString,
                email: session.user.email
            )
            self.isAuthenticated = true
            await fetchUserProfile()
        } catch {
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }
    
    func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
        await checkAuth()
    }
    
    func signUp(email: String, password: String) async throws {
        try await client.auth.signUp(email: email, password: password)
        await checkAuth()
    }
    
    func signOut() async throws {
        try await client.auth.signOut()
        self.isAuthenticated = false
        self.currentUser = nil
        self.userProfile = nil
    }
    
    // MARK: - User Profile
    
    func fetchUserProfile() async {
        guard let userId = currentUser?.id else { return }
        
        do {
            let profile: UserProfile = try await client.database
                .from("profiles")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            
            self.userProfile = profile
        } catch {
            print("Error fetching user profile: \(error)")
        }
    }
    
    func updateUsername(_ username: String) async throws {
        guard let userId = currentUser?.id else { return }
        
        try await client.database
            .from("profiles")
            .update(["username": username])
            .eq("id", value: userId)
            .execute()
        
        await fetchUserProfile()
    }
    
    // MARK: - Statues/Models
    
    func fetchStatues() async throws -> [Statue] {
        let statues: [Statue] = try await client.database
            .from("models")
            .select()
            .execute()
            .value
        
        return statues
    }
    
    func fetchStatue(id: String) async throws -> Statue {
        let statue: Statue = try await client.database
            .from("models")
            .select()
            .eq("id", value: id)
            .single()
            .execute()
            .value
        
        return statue
    }
    
    func uploadStatue(name: String, description: String?, latitude: Double?, longitude: Double?, modelFile: Data) async throws -> Statue {
        guard let userId = currentUser?.id else {
            throw NSError(domain: "SupabaseService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Not authenticated"])
        }
        
        // Upload the 3D model file
        let fileName = "\(UUID().uuidString).stl"
        let filePath = "models/\(userId)/\(fileName)"
        
        try await client.storage
            .from("models")
            .upload(path: filePath, file: modelFile, options: .init(contentType: "model/stl"))
        
        // Create the statue record
        let statue = Statue(
            id: UUID().uuidString,
            name: name,
            description: description,
            latitude: latitude,
            longitude: longitude,
            filePath: filePath,
            photoUrl: nil,
            thumbnailUrl: nil,
            userId: userId,
            createdAt: Date(),
            updatedAt: Date()
        )
        
        let insertedStatue: Statue = try await client.database
            .from("models")
            .insert(statue)
            .select()
            .single()
            .execute()
            .value
        
        return insertedStatue
    }
    
    // MARK: - Discoveries
    
    func fetchDiscoveries() async throws -> [Discovery] {
        guard let userId = currentUser?.id else { return [] }
        
        let discoveries: [Discovery] = try await client.database
            .from("discovered_models")
            .select("*, models(*)")
            .eq("user_id", value: userId)
            .execute()
            .value
        
        return discoveries
    }
    
    func discoverStatue(statueId: String) async throws {
        guard let userId = currentUser?.id else {
            throw NSError(domain: "SupabaseService", code: 401, userInfo: [NSLocalizedDescriptionKey: "Not authenticated"])
        }
        
        let discovery: [String: Any] = [
            "user_id": userId,
            "model_id": statueId,
            "discovered_at": ISO8601DateFormatter().string(from: Date())
        ]
        
        try await client.database
            .from("discovered_models")
            .insert(discovery)
            .execute()
    }
    
    // MARK: - Storage
    
    func getPublicURL(bucket: String, path: String) -> URL? {
        return try? client.storage.from(bucket).getPublicURL(path: path)
    }
}
