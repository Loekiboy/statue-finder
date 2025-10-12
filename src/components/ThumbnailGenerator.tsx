import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';

interface ThumbnailGeneratorProps {
  modelPath: string;
  onThumbnailGenerated: (dataUrl: string) => void;
}

const ModelRenderer = ({ modelPath, onCapture }: { modelPath: string; onCapture: (canvas: HTMLCanvasElement) => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(
      modelPath,
      (loadedGeometry) => {
        loadedGeometry.computeVertexNormals();
        loadedGeometry.center();
        
        // Calculate bounding box and scale
        const boundingBox = new THREE.Box3().setFromBufferAttribute(
          loadedGeometry.attributes.position as THREE.BufferAttribute
        );
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        loadedGeometry.scale(scale, scale, scale);
        
        setGeometry(loadedGeometry);
        
        // Capture after geometry is set and rendered
        setTimeout(() => {
          const canvas = document.querySelector('canvas');
          if (canvas) onCapture(canvas);
        }, 300);
      },
      undefined,
      (error) => console.error('Error loading model for thumbnail:', error)
    );
  }, [modelPath, onCapture]);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color="#22c55e" metalness={0.3} roughness={0.4} />
    </mesh>
  );
};

export const ThumbnailGenerator = ({ modelPath, onThumbnailGenerated }: ThumbnailGeneratorProps) => {
  const handleCapture = (canvas: HTMLCanvasElement) => {
    const dataUrl = canvas.toDataURL('image/png');
    onThumbnailGenerated(dataUrl);
  };

  return (
    <div style={{ position: 'absolute', left: '-9999px', width: '400px', height: '400px' }}>
      <Canvas 
        camera={{ position: [3, 2, 3], fov: 50 }}
        gl={{ preserveDrawingBuffer: true, alpha: false }}
      >
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-5, -5, -5]} intensity={0.5} />
        <directionalLight position={[0, 10, 0]} intensity={0.8} />
        <ModelRenderer modelPath={modelPath} onCapture={handleCapture} />
      </Canvas>
    </div>
  );
};
