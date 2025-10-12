import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';

interface ThumbnailGeneratorProps {
  modelPath: string;
  onThumbnailGenerated: (dataUrl: string) => void;
}

const ModelRenderer = ({ modelPath, onCapture }: { modelPath: string; onCapture: (canvas: HTMLCanvasElement) => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(
      modelPath,
      (geometry) => {
        if (meshRef.current) {
          geometry.computeVertexNormals();
          geometry.center();
          
          const boundingBox = new THREE.Box3().setFromObject(meshRef.current);
          const size = boundingBox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          meshRef.current.scale.set(scale, scale, scale);
          
          // Capture after a short delay to ensure rendering is complete
          setTimeout(() => {
            const canvas = document.querySelector('canvas');
            if (canvas) onCapture(canvas);
          }, 100);
        }
      },
      undefined,
      (error) => console.error('Error loading model for thumbnail:', error)
    );
  }, [modelPath, onCapture]);

  return (
    <mesh ref={meshRef}>
      <bufferGeometry />
      <meshStandardMaterial color="#22c55e" />
    </mesh>
  );
};

export const ThumbnailGenerator = ({ modelPath, onThumbnailGenerated }: ThumbnailGeneratorProps) => {
  const handleCapture = (canvas: HTMLCanvasElement) => {
    const dataUrl = canvas.toDataURL('image/png');
    onThumbnailGenerated(dataUrl);
  };

  return (
    <div style={{ position: 'absolute', left: '-9999px', width: '200px', height: '200px' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <ModelRenderer modelPath={modelPath} onCapture={handleCapture} />
      </Canvas>
    </div>
  );
};
