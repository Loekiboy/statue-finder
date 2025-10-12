import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const simplifySTL = async (file: File, targetSizeRatio: number = 0.5): Promise<File> => {
  console.log('Starting STL simplification...');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // Load the STL using Three.js
        const loader = new STLLoader();
        let geometry = loader.parse(arrayBuffer);
        
        console.log(`Original triangles: ${geometry.attributes.position.count / 3}`);
        console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Merge vertices that are very close together to reduce file size
        geometry = mergeVertices(geometry);
        
        // Compute normals for proper rendering
        geometry.computeVertexNormals();
        
        console.log(`Simplified triangles: ${geometry.attributes.position.count / 3}`);
        
        // Export back to STL format
        const exporter = new STLExporter();
        const mesh = new THREE.Mesh(geometry);
        const stlString = exporter.parse(mesh, { binary: true });
        
        // Convert to File
        const blob = new Blob([stlString], { type: 'application/octet-stream' });
        const newFile = new File([blob], file.name, { type: file.type });
        
        console.log(`New size: ${(newFile.size / 1024 / 1024).toFixed(2)} MB`);
        
        resolve(newFile);
      } catch (error) {
        console.error('Error simplifying STL:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};