//
//  Constants.swift
//  StatueFinder
//
//  App-wide constants
//

import Foundation
import CoreLocation

struct AppConstants {
    // Discovery
    static let discoveryRadius: CLLocationDistance = 50.0 // meters
    
    // Map
    static let defaultLatitude = 51.8426
    static let defaultLongitude = 5.8578
    static let defaultZoomLevel = 0.05
    
    // Cache
    static let maxCacheSize: Int64 = 100 * 1024 * 1024 // 100 MB
    
    // Animation
    static let defaultAnimationDuration = 0.3
    
    // Colors
    struct Colors {
        static let primary = "Blue"
        static let secondary = "Purple"
        static let accent = "Green"
    }
}
