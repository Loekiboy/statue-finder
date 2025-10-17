import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StandbeeldViewerProps {
  onClose: () => void;
  modelPath?: string;
  autoRotate?: boolean;
}

const StandbeeldViewer = ({ onClose, modelPath = '/models/standbeeld_weezenhof.stl', autoRotate = false }: StandbeeldViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelUrl, setModelUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

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
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
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
    
    // Load STL model
    const loader = new STLLoader();
    setLoading(true);
    setLoadingProgress(0);
    loader.load(
      modelUrl,
      (geometry) => {
        // Center the geometry
        geometry.center();
        geometry.computeVertexNormals();
        
        // Create material with settings optimized for simplified models
        const material = new THREE.MeshPhongMaterial({
          color: 0x2ca87f,
          specular: 0x333333,
          shininess: 80,
          flatShading: false,
          side: THREE.DoubleSide, // Render both sides
          opacity: 1.0,
          transparent: false,
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        
        // Rotate to upright position (STL files often need rotation)
        mesh.rotation.x = -Math.PI / 2;
        
        // Scale if needed (adjust deze waarde als het model te groot/klein is)
        const scale = 0.05;
        mesh.scale.set(scale, scale, scale);
        
        scene.add(mesh);
        
        setLoading(false);
        console.log('STL model geladen!');
      },
      (progress) => {
        const percentComplete = progress.total > 0 
          ? (progress.loaded / progress.total * 100) 
          : 0;
        setLoadingProgress(percentComplete);
        console.log('Laden:', percentComplete.toFixed(0) + '%');
      },
      (error) => {
        console.error('Fout bij laden STL:', error);
        setLoading(false);
        // Fallback: toon kubus bij fout
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({ color: 0x2ca87f });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.y = 1;
        scene.add(cube);
      }
    );
    
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
    };
  }, [modelUrl]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full bg-gradient-to-br from-background to-muted" />
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground mb-2">3D model aan het laden...</p>
          {loadingProgress > 0 && (
            <p className="text-xs text-muted-foreground">{loadingProgress.toFixed(0)}%</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StandbeeldViewer;
