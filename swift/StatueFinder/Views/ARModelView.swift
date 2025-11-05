//
//  ARModelView.swift
//  StatueFinder
//
//  AR View for displaying 3D models in Augmented Reality
//

import SwiftUI
import ARKit
import SceneKit
import RealityKit

@available(iOS 16.0, *)
struct ARModelView: View {
    let statue: Statue
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var supabaseService: SupabaseService
    
    @State private var isLoading = true
    @State private var modelData: Data?
    @State private var errorMessage: String?
    @State private var arSession = ARSession()
    
    var body: some View {
        ZStack {
            if isLoading {
                VStack(spacing: 20) {
                    ProgressView("AR Model laden...")
                        .scaleEffect(1.5)
                    Text("Even geduld, we maken je AR-ervaring klaar")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            } else if let errorMessage = errorMessage {
                VStack(spacing: 20) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 60))
                        .foregroundColor(.orange)
                    
                    Text("AR Fout")
                        .font(.headline)
                    
                    Text(errorMessage)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    
                    Button("Probeer opnieuw") {
                        Task {
                            await loadModel()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }
            } else if let modelData = modelData {
                ARViewContainer(modelData: modelData, statue: statue)
                    .ignoresSafeArea()
            }
            
            // Top toolbar
            VStack {
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: 2)
                    }
                    .padding()
                    
                    Spacer()
                    
                    if !isLoading && errorMessage == nil {
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(statue.name)
                                .font(.headline)
                                .foregroundColor(.white)
                                .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: 2)
                            
                            Text("AR Modus")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.8))
                                .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: 2)
                        }
                        .padding()
                    }
                }
                
                Spacer()
                
                // Instructions at bottom
                if !isLoading && errorMessage == nil {
                    VStack(spacing: 8) {
                        HStack(spacing: 12) {
                            Image(systemName: "move.3d")
                                .font(.title2)
                            Text("Beweeg je telefoon om een vlak te vinden")
                                .font(.subheadline)
                        }
                        .foregroundColor(.white)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(.ultraThinMaterial)
                        )
                        .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)
                    }
                    .padding()
                }
            }
        }
        .task {
            await loadModel()
        }
    }
    
    private func loadModel() async {
        defer { isLoading = false }
        
        // Check if AR is supported
        guard ARWorldTrackingConfiguration.isSupported else {
            errorMessage = "AR wordt niet ondersteund op dit apparaat"
            return
        }
        
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

@available(iOS 16.0, *)
struct ARViewContainer: UIViewRepresentable {
    let modelData: Data
    let statue: Statue
    
    func makeUIView(context: Context) -> ARSCNView {
        let arView = ARSCNView()
        
        // Configure AR session
        let configuration = ARWorldTrackingConfiguration()
        configuration.planeDetection = [.horizontal, .vertical]
        configuration.environmentTexturing = .automatic
        
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.personSegmentationWithDepth) {
            configuration.frameSemantics.insert(.personSegmentationWithDepth)
        }
        
        arView.session.run(configuration)
        arView.delegate = context.coordinator
        
        // Enable default lighting
        arView.autoenablesDefaultLighting = true
        arView.automaticallyUpdatesLighting = true
        
        // Set scene background
        arView.scene.background.contents = UIColor.clear
        
        // Add debug options for development (remove in production)
        #if DEBUG
        arView.debugOptions = [.showFeaturePoints]
        #endif
        
        return arView
    }
    
    func updateUIView(_ arView: ARSCNView, context: Context) {
        // Update is handled by the coordinator
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(modelData: modelData, statue: statue)
    }
    
    class Coordinator: NSObject, ARSCNViewDelegate {
        let modelData: Data
        let statue: Statue
        var modelNode: SCNNode?
        var hasPlacedModel = false
        
        init(modelData: Data, statue: Statue) {
            self.modelData = modelData
            self.statue = statue
            super.init()
        }
        
        // ARSCNViewDelegate method - called when AR detects a plane
        func renderer(_ renderer: SCNSceneRenderer, didAdd node: SCNNode, for anchor: ARAnchor) {
            // Only place model once and only for horizontal planes
            guard !hasPlacedModel,
                  let planeAnchor = anchor as? ARPlaneAnchor,
                  planeAnchor.alignment == .horizontal else {
                return
            }
            
            hasPlacedModel = true
            
            // Create the 3D model
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.placeModel(on: node, planeAnchor: planeAnchor)
            }
        }
        
        private func placeModel(on node: SCNNode, planeAnchor: ARPlaneAnchor) {
            // Parse STL data and create geometry
            guard let geometry = parseSTLData(modelData) else {
                print("Failed to parse STL model")
                return
            }
            
            // Create material
            let material = SCNMaterial()
            material.diffuse.contents = UIColor.systemBlue
            material.specular.contents = UIColor.white
            material.shininess = 0.8
            material.lightingModel = .physicallyBased
            material.metalness.contents = 0.3
            material.roughness.contents = 0.5
            geometry.materials = [material]
            
            // Create model node
            let modelNode = SCNNode(geometry: geometry)
            
            // Calculate bounds and scale appropriately
            let (min, max) = modelNode.boundingBox
            let size = SCNVector3(
                x: max.x - min.x,
                y: max.y - min.y,
                z: max.z - min.z
            )
            
            // Scale to reasonable AR size (about 30cm)
            let maxDimension = Swift.max(size.x, Swift.max(size.y, size.z))
            let targetSize: Float = 0.3  // 30cm in meters
            let scale = targetSize / maxDimension
            modelNode.scale = SCNVector3(scale, scale, scale)
            
            // Center the model
            let center = SCNVector3(
                x: (min.x + max.x) / 2,
                y: (min.y + max.y) / 2,
                z: (min.z + max.z) / 2
            )
            modelNode.position = SCNVector3(-center.x * scale, -center.y * scale, -center.z * scale)
            
            // Position on the detected plane (center of plane)
            let planePosition = planeAnchor.center
            let containerNode = SCNNode()
            containerNode.position = SCNVector3(planePosition.x, planePosition.y, planePosition.z)
            containerNode.addChildNode(modelNode)
            
            // Add rotation animation for visual appeal
            let rotation = SCNAction.rotateBy(x: 0, y: CGFloat.pi * 2, z: 0, duration: 10)
            let repeatRotation = SCNAction.repeatForever(rotation)
            modelNode.runAction(repeatRotation)
            
            // Add to scene
            node.addChildNode(containerNode)
            self.modelNode = containerNode
            
            // Add haptic feedback
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
        }
        
        private func parseSTLData(_ data: Data) -> SCNGeometry? {
            // Use the STLParser utility
            return STLParser.parseSTL(data: data) ?? createPlaceholderGeometry()
        }
        
        private func createPlaceholderGeometry() -> SCNGeometry {
            // Create a placeholder statue-like geometry
            let box = SCNBox(width: 1, height: 2, length: 1, chamferRadius: 0.1)
            
            let material = SCNMaterial()
            material.diffuse.contents = UIColor.systemBlue
            material.specular.contents = UIColor.white
            material.shininess = 0.8
            material.lightingModel = .physicallyBased
            material.metalness.contents = 0.3
            material.roughness.contents = 0.5
            box.materials = [material]
            
            return box
        }
    }
    
    static func dismantleUIView(_ uiView: ARSCNView, coordinator: Coordinator) {
        uiView.session.pause()
    }
}

@available(iOS 16.0, *)
struct ARModelView_Previews: PreviewProvider {
    static var previews: some View {
        ARModelView(statue: Statue(
            id: "1",
            name: "Test Standbeeld",
            description: "Een test standbeeld voor AR",
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
