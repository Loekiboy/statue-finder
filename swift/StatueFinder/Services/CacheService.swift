//
//  CacheService.swift
//  StatueFinder
//
//  Service for caching data locally
//

import Foundation

@MainActor
class CacheService: ObservableObject {
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    
    init() {
        // Get the caches directory
        let paths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        cacheDirectory = paths[0].appendingPathComponent("StatueFinder", isDirectory: true)
        
        // Create cache directory if it doesn't exist
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
    
    // MARK: - Cache Management
    
    func cacheData(_ data: Data, forKey key: String) throws {
        let fileURL = cacheDirectory.appendingPathComponent(key)
        try data.write(to: fileURL)
    }
    
    func getCachedData(forKey key: String) -> Data? {
        let fileURL = cacheDirectory.appendingPathComponent(key)
        return try? Data(contentsOf: fileURL)
    }
    
    func removeCachedData(forKey key: String) throws {
        let fileURL = cacheDirectory.appendingPathComponent(key)
        try fileManager.removeItem(at: fileURL)
    }
    
    func clearCache() throws {
        let contents = try fileManager.contentsOfDirectory(
            at: cacheDirectory,
            includingPropertiesForKeys: nil
        )
        
        for file in contents {
            try fileManager.removeItem(at: file)
        }
    }
    
    func getCacheSize() -> Int64 {
        var totalSize: Int64 = 0
        
        guard let contents = try? fileManager.contentsOfDirectory(
            at: cacheDirectory,
            includingPropertiesForKeys: [.fileSizeKey]
        ) else {
            return 0
        }
        
        for file in contents {
            if let attributes = try? fileManager.attributesOfItem(atPath: file.path),
               let fileSize = attributes[.size] as? Int64 {
                totalSize += fileSize
            }
        }
        
        return totalSize
    }
    
    // MARK: - Model Caching
    
    func cacheModel(_ data: Data, modelId: String) throws {
        try cacheData(data, forKey: "model_\(modelId).stl")
    }
    
    func getCachedModel(modelId: String) -> Data? {
        return getCachedData(forKey: "model_\(modelId).stl")
    }
    
    // MARK: - Image Caching
    
    func cacheImage(_ data: Data, imageId: String) throws {
        try cacheData(data, forKey: "image_\(imageId).jpg")
    }
    
    func getCachedImage(imageId: String) -> Data? {
        return getCachedData(forKey: "image_\(imageId).jpg")
    }
}
