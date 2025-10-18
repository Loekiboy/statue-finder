// Cache manager voor offline functionaliteit en datavermindering
const CACHE_VERSION = 'v1';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;
const MAP_CACHE_NAME = `map-tiles-${CACHE_VERSION}`;
const MODEL_CACHE_NAME = `models-${CACHE_VERSION}`;
const OSM_CACHE_KEY = 'osm-statues-cache';
const OSM_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheStats {
  isOnWifi: boolean;
  lastCacheUpdate: number;
  cachedModels: string[];
  cachedTiles: number;
}

export interface OSMStatue {
  id: string;
  name: string;
  lat: number;
  lon: number;
  tags: {
    historic?: string;
    tourism?: string;
    artwork_type?: string;
    name?: string;
    'name:nl'?: string;
  };
  distance?: number;
}

interface OSMCacheData {
  statues: OSMStatue[];
  timestamp: number;
  userLocation: [number, number];
}

// Detecteer of gebruiker op WiFi zit
export const isOnWiFi = (): boolean => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return false;
  
  // WiFi of ethernet = snel genoeg voor caching
  return connection.effectiveType === '4g' && !connection.saveData || 
         connection.type === 'wifi' || 
         connection.type === 'ethernet';
};

// Cache kaart tiles
export const cacheMapTiles = async (center: [number, number], radius: number = 2) => {
  if (!isOnWiFi()) {
    console.log('Niet op WiFi, overslaan map caching');
    return;
  }

  const cache = await caches.open(MAP_CACHE_NAME);
  const zoom = 18;
  const tilesX = Math.pow(2, zoom);
  
  // Bereken tile coordinaten
  const lat = center[0];
  const lon = center[1];
  
  const x = Math.floor((lon + 180) / 360 * tilesX);
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * tilesX);
  
  const promises = [];
  
  // Download tiles in een grid rond de gebruiker
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const tileX = x + dx;
      const tileY = y + dy;
      const url = `https://a.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
      
      promises.push(
        fetch(url).then(response => {
          if (response.ok) {
            cache.put(url, response.clone());
          }
        }).catch(err => console.error('Tile cache error:', err))
      );
    }
  }
  
  await Promise.all(promises);
  console.log(`${promises.length} map tiles gecached`);
};

// Cache model data
export const cacheModel = async (filePath: string, thumbnailUrl?: string) => {
  if (!isOnWiFi()) {
    console.log('Niet op WiFi, overslaan model caching');
    return;
  }

  const cache = await caches.open(MODEL_CACHE_NAME);
  
  try {
    // Cache STL bestand
    const modelUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/models/${filePath}`;
    const modelResponse = await fetch(modelUrl);
    if (modelResponse.ok) {
      await cache.put(modelUrl, modelResponse.clone());
    }
    
    // Cache thumbnail
    if (thumbnailUrl) {
      const thumbResponse = await fetch(thumbnailUrl);
      if (thumbResponse.ok) {
        await cache.put(thumbnailUrl, thumbResponse.clone());
      }
    }
    
    console.log(`Model gecached: ${filePath}`);
  } catch (err) {
    console.error('Model cache error:', err);
  }
};

// Cache modellen in de buurt
export const cacheNearbyModels = async (userLocation: [number, number], models: any[], maxDistance: number = 500) => {
  if (!isOnWiFi()) {
    console.log('Niet op WiFi, overslaan nearby model caching');
    return;
  }

  // Filter modellen binnen afstand
  const nearbyModels = models.filter(model => {
    if (!model.latitude || !model.longitude) return false;
    
    const dx = (model.longitude - userLocation[1]) * 111000 * Math.cos(userLocation[0] * Math.PI / 180);
    const dy = (model.latitude - userLocation[0]) * 111000;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= maxDistance;
  });

  console.log(`Caching ${nearbyModels.length} modellen in de buurt...`);
  
  // Cache elk model
  for (const model of nearbyModels) {
    await cacheModel(model.file_path, model.thumbnail_url);
  }
};

// Haal gecachte data op
export const getCachedResource = async (url: string): Promise<Response | null> => {
  const caches_list = [MAP_CACHE_NAME, MODEL_CACHE_NAME, CACHE_NAME];
  
  for (const cacheName of caches_list) {
    const cache = await caches.open(cacheName);
    const response = await cache.match(url);
    if (response) {
      return response;
    }
  }
  
  return null;
};

// Ruim oude caches op
export const clearOldCaches = async () => {
  const cacheNames = await caches.keys();
  const currentCaches = [MAP_CACHE_NAME, MODEL_CACHE_NAME, CACHE_NAME];
  
  await Promise.all(
    cacheNames
      .filter(cacheName => !currentCaches.includes(cacheName))
      .map(cacheName => caches.delete(cacheName))
  );
};

// Statistieken
export const getCacheStats = async (): Promise<CacheStats> => {
  const modelCache = await caches.open(MODEL_CACHE_NAME);
  const modelKeys = await modelCache.keys();
  
  return {
    isOnWifi: isOnWiFi(),
    lastCacheUpdate: Date.now(),
    cachedModels: modelKeys.map(req => req.url),
    cachedTiles: 0
  };
};

// Cache OSM statues in localStorage
export const cacheOSMStatues = (statues: OSMStatue[], userLocation: [number, number]) => {
  try {
    const cacheData: OSMCacheData = {
      statues,
      timestamp: Date.now(),
      userLocation
    };
    localStorage.setItem(OSM_CACHE_KEY, JSON.stringify(cacheData));
    console.log(`Cached ${statues.length} OSM statues`);
  } catch (error) {
    console.error('Error caching OSM statues:', error);
  }
};

// Get cached OSM statues from localStorage
export const getCachedOSMStatues = (
  currentLocation: [number, number],
  maxDistanceKm: number = 10
): OSMStatue[] | null => {
  try {
    const cached = localStorage.getItem(OSM_CACHE_KEY);
    if (!cached) return null;

    const cacheData: OSMCacheData = JSON.parse(cached);
    
    // Check if cache has expired
    const age = Date.now() - cacheData.timestamp;
    if (age > OSM_CACHE_EXPIRY_MS) {
      console.log('OSM cache expired, will fetch fresh data');
      return null;
    }

    // Check if user has moved too far from cached location
    const dx = (cacheData.userLocation[1] - currentLocation[1]) * 111;
    const dy = (cacheData.userLocation[0] - currentLocation[0]) * 111;
    const distanceKm = Math.sqrt(dx * dx + dy * dy);
    
    if (distanceKm > maxDistanceKm) {
      console.log(`User moved ${distanceKm.toFixed(1)}km from cached location, will fetch fresh data`);
      return null;
    }

    console.log(`Using cached OSM statues (${cacheData.statues.length} statues, age: ${Math.round(age / 1000 / 60)} minutes)`);
    return cacheData.statues;
  } catch (error) {
    console.error('Error reading cached OSM statues:', error);
    return null;
  }
};

// Clear OSM cache
export const clearOSMCache = () => {
  try {
    localStorage.removeItem(OSM_CACHE_KEY);
    console.log('OSM cache cleared');
  } catch (error) {
    console.error('Error clearing OSM cache:', error);
  }
};
