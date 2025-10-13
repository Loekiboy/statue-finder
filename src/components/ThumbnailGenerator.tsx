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
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
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
        camera={{ position: [2, 3, 2], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, alpha: false }}
      >
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 3]} intensity={1.5} />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} />
        <directionalLight position={[0, 8, 0]} intensity={0.9} />
        <ModelRenderer modelPath={modelPath} onCapture={handleCapture} />
      </Canvas>
    </div>
  );
};
