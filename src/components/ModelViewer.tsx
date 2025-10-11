import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';

const ModelViewer = () => {
  return (
    <div className="h-full w-full rounded-2xl overflow-hidden bg-gradient-to-br from-background to-primary/5 shadow-[var(--shadow-elevated)]">
      <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
        <OrbitControls enableDamping dampingFactor={0.05} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <Suspense fallback={null}>
          {/* Placeholder geometry - STL model kan later worden toegevoegd */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="hsl(195, 85%, 45%)" metalness={0.6} roughness={0.3} />
          </mesh>
        </Suspense>
        <gridHelper args={[10, 10, 0x00aaaa, 0x666666]} />
      </Canvas>
    </div>
  );
};

export default ModelViewer;
