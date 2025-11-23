/**
 * Downloads a file from a URL or data URI
 */
export async function downloadFile(url: string, filename: string) {
  try {
    // If it's a data URI, download directly
    if (url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For external URLs, fetch and download
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Downloads an image from a URL
 */
export async function downloadImage(imageUrl: string, imageName: string) {
  const filename = imageName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const extension = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || 'jpg';
  await downloadFile(imageUrl, `${filename}.${extension}`);
}

/**
 * Downloads a 3D model (STL file)
 */
export async function downloadModel(modelUrl: string, modelName: string) {
  const filename = modelName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const extension = modelUrl.match(/\.(stl|obj|gltf|glb)/i)?.[1] || 'stl';
  await downloadFile(modelUrl, `${filename}.${extension}`);
}
