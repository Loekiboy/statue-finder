//
//  LocationService.swift
//  StatueFinder
//
//  Service for managing location and GPS
//

import Foundation
import CoreLocation
import Combine

@MainActor
class LocationService: NSObject, ObservableObject {
    @Published var userLocation: CLLocationCoordinate2D?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var nearbyStatues: [Statue] = []
    
    private let locationManager = CLLocationManager()
    private let discoveryRadius: CLLocationDistance = 50.0 // meters
    
    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 10 // Update every 10 meters
    }
    
    func requestLocationPermission() {
        locationManager.requestWhenInUseAuthorization()
    }
    
    func startUpdatingLocation() {
        locationManager.startUpdatingLocation()
    }
    
    func stopUpdatingLocation() {
        locationManager.stopUpdatingLocation()
    }
    
    func distance(to coordinate: CLLocationCoordinate2D) -> CLLocationDistance? {
        guard let userLocation = userLocation else { return nil }
        
        let userLocationCL = CLLocation(latitude: userLocation.latitude, longitude: userLocation.longitude)
        let targetLocation = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        
        return userLocationCL.distance(from: targetLocation)
    }
    
    func isWithinDiscoveryRange(_ coordinate: CLLocationCoordinate2D) -> Bool {
        guard let distance = distance(to: coordinate) else { return false }
        return distance <= discoveryRadius
    }
    
    func checkNearbyStatues(_ statues: [Statue]) {
        guard let userLocation = userLocation else { return }
        
        nearbyStatues = statues.filter { statue in
            guard let coordinate = statue.coordinate else { return false }
            return isWithinDiscoveryRange(coordinate)
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationService: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        Task { @MainActor in
            self.userLocation = location.coordinate
        }
    }
    
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            self.authorizationStatus = manager.authorizationStatus
            
            if manager.authorizationStatus == .authorizedWhenInUse || 
               manager.authorizationStatus == .authorizedAlways {
                self.startUpdatingLocation()
            }
        }
    }
    
    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error.localizedDescription)")
    }
}
