//
//  Statue.swift
//  StatueFinder
//
//  Data model for statues/artworks
//

import Foundation
import CoreLocation

struct Statue: Identifiable, Codable {
    let id: String
    var name: String
    var description: String?
    var latitude: Double?
    var longitude: Double?
    var filePath: String
    var photoUrl: String?
    var thumbnailUrl: String?
    var userId: String
    var createdAt: Date
    var updatedAt: Date
    
    // Computed property for coordinate
    var coordinate: CLLocationCoordinate2D? {
        guard let lat = latitude, let lon = longitude else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lon)
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case latitude
        case longitude
        case filePath = "file_path"
        case photoUrl = "photo_url"
        case thumbnailUrl = "thumbnail_url"
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// Model for Nijmegen Kunstwerken JSON data
struct NijmegenKunstwerk: Codable {
    let type: String
    let geometry: Geometry
    let properties: Properties
    
    struct Geometry: Codable {
        let type: String
        let coordinates: [Double]
    }
    
    struct Properties: Codable {
        let kunstwerkId: String
        let kunstwerkNaam: String
        let kunstenaar: String?
        let lengtegraad: String
        let breedtegraad: String
        let lokatieBeeld: String?
        let websiteVerwijzing: String?
        let foto: String?
        
        enum CodingKeys: String, CodingKey {
            case kunstwerkId = "KUNSTWERKID"
            case kunstwerkNaam = "KUNSTWERKNAAM"
            case kunstenaar = "KUNSTENAAR"
            case lengtegraad = "LENGTEGRAAD"
            case breedtegraad = "BREEDTEGRAAD"
            case lokatieBeeld = "LOKATIEBEELD"
            case websiteVerwijzing = "WEBSITEVERWIJZING"
            case foto = "FOTO"
        }
    }
    
    var coordinate: CLLocationCoordinate2D? {
        guard let lat = Double(properties.breedtegraad),
              let lon = Double(properties.lengtegraad) else {
            return nil
        }
        return CLLocationCoordinate2D(latitude: lat, longitude: lon)
    }
}

struct NijmegenKunstwerkCollection: Codable {
    let type: String
    let features: [NijmegenKunstwerk]
}
