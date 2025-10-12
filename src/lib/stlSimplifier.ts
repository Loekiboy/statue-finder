export const simplifySTL = async (file: File, reductionRatio: number = 0.33): Promise<File> => {
  console.log('Starting STL simplification...');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Parse STL binary format
        const view = new DataView(arrayBuffer);
        const header = uint8Array.slice(0, 80);
        
        // Read number of triangles
        const numTriangles = view.getUint32(80, true);
        
        console.log(`Original triangles: ${numTriangles}`);
        console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Keep only 1/3 of triangles (remove 2/3)
        const targetTriangles = Math.max(
          Math.floor(numTriangles * reductionRatio),
          100 // Minimum aantal triangles
        );
        
        const skipRatio = Math.floor(numTriangles / targetTriangles);
        console.log(`Target triangles: ${targetTriangles}, Skip ratio: ${skipRatio}`);
        
        // Collect simplified triangles - keep every Nth triangle
        const selectedTriangles: Uint8Array[] = [];
        let currentOffset = 84; // Start of first triangle
        
        for (let i = 0; i < numTriangles; i++) {
          // Keep every skipRatio-th triangle
          if (i % skipRatio === 0 && selectedTriangles.length < targetTriangles) {
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
        newUint8.set(header, 0);
        
        // Write triangle count
        newView.setUint32(80, selectedTriangles.length, true);
        
        // Write triangles
        let writeOffset = 84;
        for (const triangle of selectedTriangles) {
          newUint8.set(triangle, writeOffset);
          writeOffset += 50;
        }
        
        const finalSizeMB = (newBuffer.byteLength / 1024 / 1024).toFixed(2);
        console.log(`New size: ${finalSizeMB} MB`);
        
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