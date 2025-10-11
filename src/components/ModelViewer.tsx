import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const StlModel = () => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(
      '/models/standbeeld_weezenhof.stl',
      (geo) => {
        geo.center();
        setGeometry(geo);
      },
      undefined,
      (error) => {
        console.error('Error loading STL:', error);
      }
    );
  }, []);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="hsl(195, 85%, 45%)" metalness={0.6} roughness={0.3} />
    </mesh>
  );
};

const ModelViewer = () => {
  return (
    <div className="h-full w-full rounded-2xl overflow-hidden bg-gradient-to-br from-background to-primary/5 shadow-[var(--shadow-elevated)]">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 5]} />
        <OrbitControls enableDamping dampingFactor={0.05} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <Suspense fallback={null}>
          <StlModel />
        </Suspense>
        <gridHelper args={[10, 10, 'hsl(195, 85%, 45%)', 'hsl(215, 16%, 47%)']} />
      </Canvas>
    </div>
  );
};

export default ModelViewer;
