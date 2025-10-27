//
//  Extensions.swift
//  StatueFinder
//
//  Useful Swift extensions
//

import Foundation
import SwiftUI
import CoreLocation

// MARK: - Color Extensions

extension Color {
    static var liquidGlassBackground: Color {
        Color.white.opacity(0.1)
    }
    
    static var liquidGlassBorder: Color {
        Color.white.opacity(0.2)
    }
}

// MARK: - View Extensions

extension View {
    func liquidGlassStyle() -> some View {
        self
            .background(.ultraThinMaterial)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
    }
}

// MARK: - CLLocationCoordinate2D Extensions

extension CLLocationCoordinate2D: Equatable {
    public static func == (lhs: CLLocationCoordinate2D, rhs: CLLocationCoordinate2D) -> Bool {
        return lhs.latitude == rhs.latitude && lhs.longitude == rhs.longitude
    }
}

// MARK: - Date Extensions

extension Date {
    func timeAgo() -> String {
        let calendar = Calendar.current
        let now = Date()
        let components = calendar.dateComponents([.second, .minute, .hour, .day, .weekOfYear, .month, .year], from: self, to: now)
        
        if let year = components.year, year > 0 {
            return year == 1 ? "1 jaar geleden" : "\(year) jaar geleden"
        }
        
        if let month = components.month, month > 0 {
            return month == 1 ? "1 maand geleden" : "\(month) maanden geleden"
        }
        
        if let week = components.weekOfYear, week > 0 {
            return week == 1 ? "1 week geleden" : "\(week) weken geleden"
        }
        
        if let day = components.day, day > 0 {
            return day == 1 ? "1 dag geleden" : "\(day) dagen geleden"
        }
        
        if let hour = components.hour, hour > 0 {
            return hour == 1 ? "1 uur geleden" : "\(hour) uur geleden"
        }
        
        if let minute = components.minute, minute > 0 {
            return minute == 1 ? "1 minuut geleden" : "\(minute) minuten geleden"
        }
        
        return "Zojuist"
    }
}

// MARK: - String Extensions

extension String {
    var isValidEmail: Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: self)
    }
}
