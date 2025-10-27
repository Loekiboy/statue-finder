//
//  ModelViewer.swift
//  StatueFinder
//
//  3D Model viewer using SceneKit
//

import SwiftUI
import SceneKit

struct ModelViewer: View {
    let statue: Statue
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var supabaseService: SupabaseService
    
    @State private var isLoading = true
    @State private var modelData: Data?
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            ZStack {
                if isLoading {
                    ProgressView("Model laden...")
                        .scaleEffect(1.5)
                } else if let errorMessage = errorMessage {
                    VStack(spacing: 20) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 60))
                            .foregroundColor(.orange)
                        
                        Text("Fout bij laden")
                            .font(.headline)
                        
                        Text(errorMessage)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                } else if let modelData = modelData {
                    SceneKitModelView(modelData: modelData)
                        .ignoresSafeArea()
                }
            }
            .navigationTitle(statue.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Sluiten") {
                        dismiss()
                    }
                }
            }
        }
        .task {
            await loadModel()
        }
    }
    
    private func loadModel() async {
        defer { isLoading = false }
        
        // Get the model URL from Supabase storage
        guard let modelURL = supabaseService.getPublicURL(bucket: "models", path: statue.filePath) else {
            errorMessage = "Kon model URL niet vinden"
            return
        }
        
        // Download the model data
        do {
            let (data, _) = try await URLSession.shared.data(from: modelURL)
            modelData = data
        } catch {
            errorMessage = "Kon model niet downloaden: \(error.localizedDescription)"
        }
    }
}

struct SceneKitModelView: UIViewRepresentable {
    let modelData: Data
    
    func makeUIView(context: Context) -> SCNView {
        let scnView = SCNView()
        scnView.autoenablesDefaultLighting = true
        scnView.allowsCameraControl = true
        scnView.backgroundColor = UIColor.black
        scnView.antialiasingMode = .multisampling4X
        
        // Create scene
        let scene = SCNScene()
        scnView.scene = scene
        
        // Add camera
        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(x: 0, y: 0, z: 5)
        scene.rootNode.addChildNode(cameraNode)
        
        // Add ambient light
        let ambientLight = SCNNode()
        ambientLight.light = SCNLight()
        ambientLight.light?.type = .ambient
        ambientLight.light?.intensity = 500
        scene.rootNode.addChildNode(ambientLight)
        
        // Add directional light
        let directionalLight = SCNNode()
        directionalLight.light = SCNLight()
        directionalLight.light?.type = .directional
        directionalLight.light?.intensity = 1000
        directionalLight.position = SCNVector3(x: 2, y: 3, z: 5)
        scene.rootNode.addChildNode(directionalLight)
        
        return scnView
    }
    
    func updateUIView(_ scnView: SCNView, context: Context) {
        // Load STL model
        // Note: SceneKit doesn't natively support STL, so we'd need to convert it
        // For this implementation, we'll create a placeholder geometry
        // In production, you would use a library to parse STL files
        
        let geometry = createPlaceholderGeometry()
        let node = SCNNode(geometry: geometry)
        
        // Center the model
        let (min, max) = node.boundingBox
        let center = SCNVector3(
            x: (min.x + max.x) / 2,
            y: (min.y + max.y) / 2,
            z: (min.z + max.z) / 2
        )
        node.position = SCNVector3(-center.x, -center.y, -center.z)
        
        // Add rotation animation
        let rotation = SCNAction.rotateBy(x: 0, y: CGFloat.pi * 2, z: 0, duration: 10)
        let repeatRotation = SCNAction.repeatForever(rotation)
        node.runAction(repeatRotation)
        
        scnView.scene?.rootNode.addChildNode(node)
    }
    
    private func createPlaceholderGeometry() -> SCNGeometry {
        // Create a placeholder box geometry
        // In production, parse the STL data here
        let box = SCNBox(width: 1, height: 1, length: 1, chamferRadius: 0.1)
        
        // Apply material
        let material = SCNMaterial()
        material.diffuse.contents = UIColor.systemBlue
        material.specular.contents = UIColor.white
        material.shininess = 0.8
        box.materials = [material]
        
        return box
    }
}

struct ModelViewer_Previews: PreviewProvider {
    static var previews: some View {
        ModelViewer(statue: Statue(
            id: "1",
            name: "Test Standbeeld",
            description: "Een test standbeeld",
            latitude: 51.8,
            longitude: 5.8,
            filePath: "models/test.stl",
            photoUrl: nil,
            thumbnailUrl: nil,
            userId: "user1",
            createdAt: Date(),
            updatedAt: Date()
        ))
        .environmentObject(SupabaseService())
    }
}
