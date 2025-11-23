/**
 * Converts an image URL to a low-resolution thumbnail version for faster loading
 * Supports various image hosting services and CDNs
 */
export function getLowResImageUrl(url: string | null, maxWidth: number = 150): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // Webflow assets - add size parameter
    if (urlObj.hostname.includes('webflow.com')) {
      // Webflow uses w= parameter for width
      urlObj.searchParams.set('w', maxWidth.toString());
      urlObj.searchParams.set('q', '60'); // Lower quality for faster loading
      return urlObj.toString();
    }
    
    // Supabase Storage - add transform parameters
    if (urlObj.hostname.includes('supabase.co') || urlObj.hostname.includes('supabase.in')) {
      // Supabase storage supports transform parameters
      urlObj.searchParams.set('width', maxWidth.toString());
      urlObj.searchParams.set('quality', '60');
      return urlObj.toString();
    }
    
    // Cloudinary - add transformation
    if (urlObj.hostname.includes('cloudinary.com')) {
      // Insert transformation parameters in Cloudinary URLs
      const path = urlObj.pathname;
      const newPath = path.replace(/\/upload\//, `/upload/w_${maxWidth},q_60/`);
      urlObj.pathname = newPath;
      return urlObj.toString();
    }
    
    // Imgur - use thumbnail suffix
    if (urlObj.hostname.includes('imgur.com')) {
      // Imgur uses letter suffixes for thumbnails (s, m, l, h)
      const path = urlObj.pathname;
      const newPath = path.replace(/(\.[^.]+)$/, 'm$1'); // 'm' = medium thumbnail (320x320)
      urlObj.pathname = newPath;
      return urlObj.toString();
    }
    
    // Generic approach: add width/quality parameters (works for many CDNs)
    urlObj.searchParams.set('w', maxWidth.toString());
    urlObj.searchParams.set('width', maxWidth.toString());
    urlObj.searchParams.set('q', '60');
    urlObj.searchParams.set('quality', '60');
    
    return urlObj.toString();
  } catch (e) {
    // If URL parsing fails, return original URL
    return url;
  }
}
