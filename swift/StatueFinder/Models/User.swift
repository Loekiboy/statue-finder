//
//  User.swift
//  StatueFinder
//
//  Data model for user profiles
//

import Foundation

struct UserProfile: Identifiable, Codable {
    let id: String
    var username: String?
    var language: String
    var showOsmStatues: Bool
    var createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case username
        case language
        case showOsmStatues = "show_osm_statues"
        case createdAt = "created_at"
    }
}

struct AuthUser: Identifiable {
    let id: String
    let email: String?
}
