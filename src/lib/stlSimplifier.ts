export const simplifySTL = async (file: File, targetSizeRatio: number = 0.5): Promise<File> => {
  console.log('Starting STL simplification...');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Parse STL binary format
        const view = new DataView(arrayBuffer);
        let offset = 80; // Skip header
        
        // Read number of triangles
        const numTriangles = view.getUint32(offset, true);
        offset += 4;
        
        console.log(`Original triangles: ${numTriangles}`);
        console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Calculate target triangles
        const targetTriangles = Math.max(
          Math.floor(numTriangles * targetSizeRatio),
          100 // Minimum aantal triangles
        );
        
        const step = Math.max(1, Math.floor(numTriangles / targetTriangles));
        console.log(`Target triangles: ${targetTriangles}, Step: ${step}`);
        
        // Create new STL header
        const newHeader = new Uint8Array(80);
        const headerText = 'Simplified by Geo-Pin';
        for (let i = 0; i < Math.min(headerText.length, 80); i++) {
          newHeader[i] = headerText.charCodeAt(i);
        }
        
        // Collect simplified triangles
        const selectedTriangles: Uint8Array[] = [];
        let currentOffset = 84; // Start of first triangle
        
        for (let i = 0; i < numTriangles; i++) {
          if (i % step === 0 && selectedTriangles.length < targetTriangles) {
            // Copy this triangle (50 bytes each)
            const triangle = uint8Array.slice(currentOffset, currentOffset + 50);
            selectedTriangles.push(triangle);
          }
          currentOffset += 50;
        }
        
        console.log(`Selected ${selectedTriangles.length} triangles`);
        
        // Build new STL file
        const newFileSize = 80 + 4 + (selectedTriangles.length * 50);
        const newBuffer = new ArrayBuffer(newFileSize);
        const newUint8 = new Uint8Array(newBuffer);
        const newView = new DataView(newBuffer);
        
        // Write header
        newUint8.set(newHeader, 0);
        
        // Write triangle count
        newView.setUint32(80, selectedTriangles.length, true);
        
        // Write triangles
        let writeOffset = 84;
        for (const triangle of selectedTriangles) {
          newUint8.set(triangle, writeOffset);
          writeOffset += 50;
        }
        
        console.log(`New size: ${(newBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
        
        // Create new File
        const blob = new Blob([newBuffer], { type: 'application/octet-stream' });
        const newFile = new File([blob], file.name, { type: file.type });
        
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