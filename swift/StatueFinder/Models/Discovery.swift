//
//  Discovery.swift
//  StatueFinder
//
//  Data model for discovered statues
//

import Foundation

struct Discovery: Identifiable, Codable {
    let id: String
    let userId: String
    let modelId: String
    let discoveredAt: Date
    
    // Related statue information (populated from join)
    var statue: Statue?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case modelId = "model_id"
        case discoveredAt = "discovered_at"
    }
}
