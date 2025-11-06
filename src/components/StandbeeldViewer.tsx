import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X, Loader2, Maximize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import '@google/model-viewer';

interface StandbeeldViewerProps {
  onClose: () => void;
  modelPath?: string;
  autoRotate?: boolean;
}

// Global cache for loaded geometries to avoid reloading
const geometryCache = new Map<string, THREE.BufferGeometry>();
const loadingPromises = new Map<string, Promise<THREE.BufferGeometry>>();

const StandbeeldViewer = ({ onClose, modelPath = '/models/standbeeld_weezenhof.stl', autoRotate = false }: StandbeeldViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelUrl, setModelUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [usdzUrl, setUsdzUrl] = useState<string | null>(null);
  const [showAR, setShowAR] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const meshRef = useRef<THREE.Mesh | null>(null);

  // Check if iOS device
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
  }, []);

  // Get the correct URL for the model
  useEffect(() => {
    const getModelUrl = async () => {
      // If it's a public path (starts with /), use it directly
      if (modelPath.startsWith('/')) {
        setModelUrl(modelPath);
        return;
      }
      
      // Otherwise, it's a Supabase storage path - get the public URL
      const { data } = supabase.storage
        .from('models')
        .getPublicUrl(modelPath);
      
      setModelUrl(data.publicUrl);
    };
    
    getModelUrl();
  }, [modelPath]);

  // Preload a model in the background
  const preloadModel = async (url: string): Promise<THREE.BufferGeometry> => {
    // Check if already cached
    if (geometryCache.has(url)) {
      return geometryCache.get(url)!;
    }
    
    // Check if already loading
    if (loadingPromises.has(url)) {
      return loadingPromises.get(url)!;
    }
    
    // Start loading
    const loader = new STLLoader();
    const promise = new Promise<THREE.BufferGeometry>((resolve, reject) => {
      loader.load(
        url,
        (geometry) => {
          geometry.center();
          geometry.computeVertexNormals();
          geometryCache.set(url, geometry);
          loadingPromises.delete(url);
          resolve(geometry);
        },
        undefined,
        (error) => {
          loadingPromises.delete(url);
          reject(error);
        }
      );
    });
    
    loadingPromises.set(url, promise);
    return promise;
  };

  useEffect(() => {
    if (!containerRef.current || !modelUrl) return;

    const container = containerRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    
    // Camera setup - closer for better mobile view
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(2, 2, 3);
    
    // Renderer setup with optimizations
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    container.appendChild(renderer.domElement);
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -5, -5);
    scene.add(directionalLight2);
    
    // Grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x00aaaa, 0xcccccc);
    scene.add(gridHelper);
    
    // Load STL model with caching
    setLoading(true);
    setLoadingProgress(0);
    
    const loadModel = async () => {
      try {
        // Try to get from cache first
        let geometry: THREE.BufferGeometry;
        
        if (geometryCache.has(modelUrl)) {
          geometry = geometryCache.get(modelUrl)!.clone();
          setLoadingProgress(100);
        } else {
          // Load with progress tracking
          const loader = new STLLoader();
          geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
            loader.load(
              modelUrl,
              (loadedGeometry) => {
                loadedGeometry.center();
                loadedGeometry.computeVertexNormals();
                // Cache the geometry for future use
                geometryCache.set(modelUrl, loadedGeometry);
                resolve(loadedGeometry);
              },
              (progress) => {
                const percentComplete = progress.total > 0 
                  ? (progress.loaded / progress.total * 100) 
                  : 50; // Show 50% if total is unknown
                setLoadingProgress(percentComplete);
              },
              reject
            );
          });
        }
        
        // Create material with settings optimized for performance
        const material = new THREE.MeshPhongMaterial({
          color: 0x2ca87f,
          specular: 0x333333,
          shininess: 80,
          flatShading: false,
          side: THREE.DoubleSide,
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        meshRef.current = mesh;
        
        // Rotate to upright position
        mesh.rotation.x = -Math.PI / 2;
        
        // Scale
        const scale = 0.05;
        mesh.scale.set(scale, scale, scale);
        
        scene.add(mesh);
        
        // Export to GLB for general AR viewing
        const gltfExporter = new GLTFExporter();
        gltfExporter.parse(
          mesh,
          (gltf) => {
            const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            setGlbUrl(url);
          },
          (error) => {
            console.error('Error exporting GLB:', error);
          },
          { binary: true }
        );
        
        // Export to USDZ for iOS AR Quick Look
        const usdzExporter = new USDZExporter();
        usdzExporter.parse(mesh).then((arrayBuffer) => {
          const blob = new Blob([arrayBuffer], { type: 'model/vnd.usdz+zip' });
          const url = URL.createObjectURL(blob);
          setUsdzUrl(url);
        }).catch((error) => {
          console.error('Error exporting USDZ:', error);
        });
        
        setLoading(false);
        console.log('STL model geladen!');
      } catch (error) {
        console.error('Fout bij laden STL:', error);
        setLoading(false);
        // Fallback: toon kubus bij fout
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({ color: 0x2ca87f });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.y = 1;
        scene.add(cube);
      }
    };
    
    loadModel();
    
    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      
      // Cleanup URLs
      if (glbUrl) {
        URL.revokeObjectURL(glbUrl);
      }
      if (usdzUrl) {
        URL.revokeObjectURL(usdzUrl);
      }
    };
  }, [modelUrl, autoRotate]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {showAR && glbUrl && isIOS && usdzUrl ? (
        <div className="h-full w-full flex items-center justify-center bg-background">
          <model-viewer
            src={glbUrl}
            ios-src={usdzUrl}
            ar
            ar-modes="quick-look scene-viewer webxr"
            ar-scale="fixed"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            loading="eager"
            reveal="auto"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      ) : (
        <div ref={containerRef} className="h-full w-full bg-gradient-to-br from-background to-muted" />
      )}
      
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground mb-2">3D model aan het laden...</p>
          {loadingProgress > 0 && (
            <p className="text-xs text-muted-foreground">{loadingProgress.toFixed(0)}%</p>
          )}
        </div>
      )}
      
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {isIOS && glbUrl && usdzUrl && !loading && (
          <Button
            onClick={() => setShowAR(!showAR)}
            variant="default"
            size="icon"
            className="bg-background/80 backdrop-blur-sm hover:bg-background"
            title={showAR ? "Toon 3D Viewer" : "Toon AR"}
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        )}
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
          aria-label="Sluiten"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
      </div>
    </div>
  );
};

// Export function to preload models in the background
export const preloadModels = async (modelPaths: string[]) => {
  const loader = new STLLoader();
  
  const preloadPromises = modelPaths.map(async (path) => {
    // Skip if already cached
    if (geometryCache.has(path)) {
      return;
    }
    
    // Skip if already loading
    if (loadingPromises.has(path)) {
      return loadingPromises.get(path);
    }
    
    const promise = new Promise<THREE.BufferGeometry>((resolve, reject) => {
      loader.load(
        path,
        (geometry) => {
          geometry.center();
          geometry.computeVertexNormals();
          geometryCache.set(path, geometry);
          console.log(`Preloaded model: ${path}`);
          resolve(geometry);
        },
        undefined,
        (error) => {
          console.warn(`Failed to preload model: ${path}`, error);
          reject(error);
        }
      );
    }).finally(() => {
      loadingPromises.delete(path);
    });
    
    loadingPromises.set(path, promise);
    return promise;
  });
  
  // Load all models concurrently, but don't fail if some fail
  await Promise.allSettled(preloadPromises);
};

export default StandbeeldViewer;
