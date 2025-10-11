import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X } from 'lucide-react';

interface StandbeeldViewerProps {
  onClose: () => void;
}

const StandbeeldViewer = ({ onClose }: StandbeeldViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(3, 3, 5);
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
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
    loader.load(
      '/models/standbeeld_weezenhof.stl',
      (geometry) => {
        // Center the geometry
        geometry.center();
        geometry.computeVertexNormals();
        
        // Create material
        const material = new THREE.MeshPhongMaterial({
          color: 0x2ca87f,
          specular: 0x333333,
          shininess: 80,
          flatShading: false,
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        
        // Rotate to upright position (STL files often need rotation)
        mesh.rotation.x = -Math.PI / 2;
        
        // Scale if needed (adjust deze waarde als het model te groot/klein is)
        const scale = 0.05;
        mesh.scale.set(scale, scale, scale);
        
        scene.add(mesh);
        
        console.log('STL model geladen!');
      },
      (progress) => {
        console.log('Laden:', (progress.loaded / progress.total * 100).toFixed(0) + '%');
      },
      (error) => {
        console.error('Fout bij laden STL:', error);
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
  }, []);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
    >
      <div className="relative h-[85vh] w-[90vw] max-w-5xl overflow-hidden rounded-2xl bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Weezenhof Standbeeld</h2>
            <p className="text-sm text-muted-foreground">Sleep om te roteren • Scroll om te zoomen</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive text-destructive-foreground transition-all hover:bg-destructive/90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* 3D Container */}
        <div ref={containerRef} className="h-[calc(100%-73px)] w-full bg-gradient-to-br from-background to-muted" />
      </div>
    </div>
  );
};

export default StandbeeldViewer;
