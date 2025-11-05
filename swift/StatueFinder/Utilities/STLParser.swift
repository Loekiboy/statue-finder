//
//  STLParser.swift
//  StatueFinder
//
//  STL file parser for loading 3D models
//

import Foundation
import SceneKit

class STLParser {
    
    /// Parse STL data and return SceneKit geometry
    static func parseSTL(data: Data) -> SCNGeometry? {
        // Check if it's binary or ASCII STL
        if isBinarySTL(data: data) {
            return parseBinarySTL(data: data)
        } else {
            return parseASCIISTL(data: data)
        }
    }
    
    /// Check if STL is binary format
    private static func isBinarySTL(data: Data) -> Bool {
        // ASCII STL files start with "solid"
        // Binary STL files have an 80-byte header followed by triangle count
        guard data.count > 84 else { return false }
        
        // Check if first 5 bytes spell "solid"
        let prefix = data.prefix(5)
        let solidString = "solid".data(using: .ascii)!
        
        if prefix == solidString {
            // Might be ASCII, but binary files can also have "solid" in header
            // If file is very small, it's likely ASCII
            if data.count < 1000 { return false }
            
            // Check for triangle count at byte 80-84
            let triangleCountBytes = data.subdata(in: 80..<84)
            let triangleCount = triangleCountBytes.withUnsafeBytes { $0.load(as: UInt32.self) }
            
            // Binary STL should have: 80 (header) + 4 (count) + (count * 50) bytes
            let expectedSize = 84 + Int(triangleCount) * 50
            return data.count == expectedSize
        }
        
        return true
    }
    
    /// Parse binary STL format
    private static func parseBinarySTL(data: Data) -> SCNGeometry? {
        guard data.count > 84 else { return nil }
        
        // Read triangle count
        let triangleCountBytes = data.subdata(in: 80..<84)
        let triangleCount = triangleCountBytes.withUnsafeBytes { $0.load(as: UInt32.self) }
        
        var vertices: [SCNVector3] = []
        var normals: [SCNVector3] = []
        var indices: [Int32] = []
        
        var offset = 84
        for _ in 0..<triangleCount {
            guard offset + 50 <= data.count else { break }
            
            // Read normal vector (3 floats)
            let normalData = data.subdata(in: offset..<offset+12)
            let normal = normalData.withUnsafeBytes { ptr in
                SCNVector3(
                    x: ptr.load(fromByteOffset: 0, as: Float.self),
                    y: ptr.load(fromByteOffset: 4, as: Float.self),
                    z: ptr.load(fromByteOffset: 8, as: Float.self)
                )
            }
            
            offset += 12
            
            // Read 3 vertices (each 3 floats)
            for _ in 0..<3 {
                let vertexData = data.subdata(in: offset..<offset+12)
                let vertex = vertexData.withUnsafeBytes { ptr in
                    SCNVector3(
                        x: ptr.load(fromByteOffset: 0, as: Float.self),
                        y: ptr.load(fromByteOffset: 4, as: Float.self),
                        z: ptr.load(fromByteOffset: 8, as: Float.self)
                    )
                }
                
                vertices.append(vertex)
                normals.append(normal)
                offset += 12
            }
            
            // Skip attribute byte count
            offset += 2
        }
        
        // Create indices
        for i in 0..<vertices.count {
            indices.append(Int32(i))
        }
        
        return createGeometry(vertices: vertices, normals: normals, indices: indices)
    }
    
    /// Parse ASCII STL format
    private static func parseASCIISTL(data: Data) -> SCNGeometry? {
        guard let content = String(data: data, encoding: .ascii) ?? String(data: data, encoding: .utf8) else {
            return nil
        }
        
        var vertices: [SCNVector3] = []
        var normals: [SCNVector3] = []
        var currentNormal: SCNVector3?
        
        let lines = content.components(separatedBy: .newlines)
        
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            let components = trimmed.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
            
            guard components.count >= 4 else { continue }
            
            if components[0] == "facet" && components[1] == "normal" {
                // Parse normal
                if let x = Float(components[2]),
                   let y = Float(components[3]),
                   let z = Float(components[4]) {
                    currentNormal = SCNVector3(x: x, y: y, z: z)
                }
            } else if components[0] == "vertex" {
                // Parse vertex
                if let x = Float(components[1]),
                   let y = Float(components[2]),
                   let z = Float(components[3]) {
                    vertices.append(SCNVector3(x: x, y: y, z: z))
                    if let normal = currentNormal {
                        normals.append(normal)
                    }
                }
            }
        }
        
        // Create indices
        var indices: [Int32] = []
        for i in 0..<vertices.count {
            indices.append(Int32(i))
        }
        
        return createGeometry(vertices: vertices, normals: normals, indices: indices)
    }
    
    /// Create SceneKit geometry from vertices, normals, and indices
    private static func createGeometry(vertices: [SCNVector3], normals: [SCNVector3], indices: [Int32]) -> SCNGeometry? {
        guard !vertices.isEmpty else { return nil }
        
        // Convert to data
        let vertexData = Data(bytes: vertices, count: vertices.count * MemoryLayout<SCNVector3>.stride)
        let normalData = Data(bytes: normals, count: normals.count * MemoryLayout<SCNVector3>.stride)
        let indexData = Data(bytes: indices, count: indices.count * MemoryLayout<Int32>.stride)
        
        // Create geometry sources
        let vertexSource = SCNGeometrySource(
            data: vertexData,
            semantic: .vertex,
            vectorCount: vertices.count,
            usesFloatComponents: true,
            componentsPerVector: 3,
            bytesPerComponent: MemoryLayout<Float>.stride,
            dataOffset: 0,
            dataStride: MemoryLayout<SCNVector3>.stride
        )
        
        let normalSource = SCNGeometrySource(
            data: normalData,
            semantic: .normal,
            vectorCount: normals.count,
            usesFloatComponents: true,
            componentsPerVector: 3,
            bytesPerComponent: MemoryLayout<Float>.stride,
            dataOffset: 0,
            dataStride: MemoryLayout<SCNVector3>.stride
        )
        
        // Create geometry element
        let element = SCNGeometryElement(
            data: indexData,
            primitiveType: .triangles,
            primitiveCount: indices.count / 3,
            bytesPerIndex: MemoryLayout<Int32>.stride
        )
        
        // Create geometry
        let geometry = SCNGeometry(sources: [vertexSource, normalSource], elements: [element])
        
        return geometry
    }
}
