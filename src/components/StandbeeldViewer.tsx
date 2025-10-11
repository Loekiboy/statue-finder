import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X } from 'lucide-react';

interface StandbeeldViewerProps {
  onClose: () => void;
  modelPath?: string;
}

const StandbeeldViewer = ({ onClose, modelPath = '/models/standbeeld_weezenhof.stl' }: StandbeeldViewerProps) => {
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
      modelPath,
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
    <div className="relative h-full w-full">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm px-3 py-2">
        <h3 className="text-sm font-bold text-foreground">Weezenhof Standbeeld</h3>
        <p className="text-xs text-muted-foreground">Sleep om te roteren</p>
      </div>
      
      {/* 3D Container */}
      <div ref={containerRef} className="h-full w-full bg-gradient-to-br from-background to-muted" />
    </div>
  );
};

export default StandbeeldViewer;
