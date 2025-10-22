import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import StandbeeldViewer, { preloadModels } from './StandbeeldViewer';
import PhotoViewer from './PhotoViewer';
import QuickUploadDialog from './QuickUploadDialog';
import KunstwerkViewer from './KunstwerkViewer';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  isOnWiFi, 
  cacheMapTiles, 
  cacheNearbyModels, 
  clearOldCaches,
  cacheOSMStatues,
  getCachedOSMStatues,
  OSMStatue as CachedOSMStatue
} from '@/lib/cacheManager';
import { nijmegenKunstwerken, NijmegenKunstwerk } from '@/data/nijmegenKunstwerken';
import { utrechtKunstwerken, UtrechtKunstwerk } from '@/data/utrechtKunstwerken';

interface Model {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  photo_url: string | null;
}

interface OSMStatue {
  id: string;
  name: string;
  lat: number;
  lon: number;
  tags: {
    historic?: string;
    tourism?: string;
    artwork_type?: string;
  };
  distance?: number;
}

interface Profile {
  show_osm_statues: boolean;
}

interface SelectedModelInfo {
  name: string;
  description: string | null;
  file_path: string;
  photo_url?: string | null;
}

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;


const MapView = () => {
  const { t } = useLanguage();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [initialLocation, setInitialLocation] = useState<[number, number] | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [selectedModel, setSelectedModel] = useState<SelectedModelInfo | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [osmStatues, setOsmStatues] = useState<OSMStatue[]>([]);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showOsmStatues, setShowOsmStatues] = useState(true);
  const [selectedKunstwerk, setSelectedKunstwerk] = useState<{ kunstwerk: NijmegenKunstwerk | UtrechtKunstwerk, city: 'nijmegen' | 'utrecht' } | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const modelMarkersRef = useRef<L.Marker[]>([]);
  const osmMarkerRef = useRef<L.Marker[]>([]);
  const kunstwerkMarkersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);


  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch discovered models
  useEffect(() => {
    const fetchDiscoveredModels = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('discovered_models')
        .select('model_id')
        .eq('user_id', user.id);
      
      if (!error && data) {
        setDiscoveredModels(data.map(d => d.model_id));
      }
    };
    
    fetchDiscoveredModels();
  }, [user]);

  // Fetch models from database
  useEffect(() => {
    const fetchModels = async () => {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      
      if (error) {
        console.error('Error fetching models:', error);
        return;
      }
      
      setModels(data || []);
    };
    
    fetchModels();
    clearOldCaches(); // Ruim oude caches op bij opstarten
  }, []);

  // Fetch user profile settings
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('show_osm_statues')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setShowOsmStatues(data.show_osm_statues ?? true);
        }
      }
    };
    fetchProfile();
  }, []);

  // Fetch OSM statues when user location is available - progressively load closest first
  useEffect(() => {
    if (!userLocation || !showOsmStatues) {
      setOsmStatues([]);
      return;
    }

    const fetchOSMStatues = async () => {
      const [lat, lon] = userLocation;
      
      // Calculate distance between two points in meters
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const dx = (lon2 - lon1) * 111000 * Math.cos(lat1 * Math.PI / 180);
        const dy = (lat2 - lat1) * 111000;
        return Math.sqrt(dx * dx + dy * dy);
      };
      
      // Check if OSM statue is too close to existing models or kunstwerken
      const isTooCloseToExisting = (statueLat: number, statueLon: number) => {
        // Check distance to all uploaded models
        const tooCloseToModel = models.some(model => {
          if (!model.latitude || !model.longitude) return false;
          const distance = calculateDistance(statueLat, statueLon, model.latitude, model.longitude);
          return distance < 7;
        });
        
        if (tooCloseToModel) return true;
        
        // Check distance to Nijmegen kunstwerken
        const tooCloseToNijmegen = nijmegenKunstwerken.some(kunstwerk => {
          const distance = calculateDistance(statueLat, statueLon, kunstwerk.lat, kunstwerk.lon);
          return distance < 7;
        });
        
        if (tooCloseToNijmegen) return true;
        
        // Check distance to Utrecht kunstwerken
        const tooCloseToUtrecht = utrechtKunstwerken.some(kunstwerk => {
          const distance = calculateDistance(statueLat, statueLon, kunstwerk.lat, kunstwerk.lon);
          return distance < 7;
        });
        
        return tooCloseToUtrecht;
      };
      
      // Try to get cached data first
      const cachedStatues = getCachedOSMStatues(userLocation);
      if (cachedStatues) {
        // Update distances, filter out duplicates, and use cached data
        const filteredStatues = cachedStatues
          .filter(statue => !isTooCloseToExisting(statue.lat, statue.lon))
          .map(statue => ({
            ...statue,
            distance: calculateDistance(lat, lon, statue.lat, statue.lon)
          }))
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
        
        setOsmStatues(filteredStatues);
        console.log(`Using ${filteredStatues.length} cached OSM statues (filtered from ${cachedStatues.length})`);
        return;
      }
      
      // Progressive loading: start with closest, then expand radius
      const radii = [2000, 5000, 15000, 50000]; // 2km, 5km, 15km, 50km
      let allStatues: OSMStatue[] = [];
      
      for (const radius of radii) {
        const query = `
          [out:json][timeout:25];
          (
            node["historic"="memorial"]["memorial"="statue"](around:${radius},${lat},${lon});
            node["tourism"="artwork"]["artwork_type"="statue"](around:${radius},${lat},${lon});
          );
          out body;
        `;
        
        try {
          const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query,
          });
          
          const data = await response.json();
          const newStatues: OSMStatue[] = data.elements
            .filter((element: { lat: number; lon: number }) => 
              !isTooCloseToExisting(element.lat, element.lon)
            )
            .map((element: { id: number; lat: number; lon: number; tags?: { name?: string; 'name:nl'?: string } }) => ({
              id: `osm-${element.id}`,
              name: element.tags?.name || element.tags?.['name:nl'] || 'Onbekend standbeeld',
              lat: element.lat,
              lon: element.lon,
              tags: element.tags,
              distance: calculateDistance(lat, lon, element.lat, element.lon),
            }));
          
          // Filter out duplicates and sort by distance
          const uniqueStatues = newStatues.filter(
            newStatue => !allStatues.some(existing => existing.id === newStatue.id)
          );
          
          allStatues = [...allStatues, ...uniqueStatues].sort((a, b) => 
            (a.distance || 0) - (b.distance || 0)
          );
          
          // Update map with current batch (progressive rendering)
          setOsmStatues([...allStatues]);
          
          // Short delay between batches to not overload the API
          if (radius !== radii[radii.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Error fetching OSM statues at ${radius}m radius:`, error);
          // Continue with next radius even if one fails
        }
      }
      
      // Cache the final results
      if (allStatues.length > 0) {
        cacheOSMStatues(allStatues, userLocation);
      }
    };

    fetchOSMStatues();
  }, [userLocation, showOsmStatues, models]);

  // Auto-cache wanneer op WiFi
  useEffect(() => {
    if (!userLocation || models.length === 0) return;
    
    const autoCacheData = async () => {
      if (isOnWiFi()) {
        console.log('WiFi gedetecteerd - starten met caching...');
        
        // Cache kaart tiles rond gebruiker
        await cacheMapTiles(userLocation, 3);
        
        // Cache modellen binnen 500m
        await cacheNearbyModels(userLocation, models, 500);
        
        console.log('Caching voltooid!');
      }
    };
    
    // Cache na 2 seconden om niet te interfereren met app loading
    const timer = setTimeout(autoCacheData, 2000);
    
    return () => clearTimeout(timer);
  }, [userLocation, models]);

  // Preload nearby 3D models in the background for better performance
  useEffect(() => {
    if (!userLocation || models.length === 0) return;
    
    const preloadNearbyModels = async () => {
      // Get models within 1km that have 3D files
      const nearbyModelsWithFiles = models.filter(model => {
        if (!model.latitude || !model.longitude || !model.file_path) return false;
        
        const dx = (model.longitude - userLocation[1]) * 111000 * Math.cos(userLocation[0] * Math.PI / 180);
        const dy = (model.latitude - userLocation[0]) * 111000;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= 1000; // 1km radius
      });
      
      if (nearbyModelsWithFiles.length === 0) return;
      
      console.log(`Preloading ${nearbyModelsWithFiles.length} nearby 3D models...`);
      
      // Get public URLs for the models
      const modelUrls = nearbyModelsWithFiles.map(model => {
        if (model.file_path.startsWith('/')) {
          return model.file_path;
        }
        const { data } = supabase.storage.from('models').getPublicUrl(model.file_path);
        return data.publicUrl;
      });
      
      // Preload models in background (fire and forget)
      preloadModels(modelUrls).catch(err => {
        console.log('Some models failed to preload, but continuing:', err);
      });
    };
    
    // Start preloading after a short delay to not block initial render
    const timer = setTimeout(preloadNearbyModels, 3000);
    
    return () => clearTimeout(timer);
  }, [userLocation, models]);

  useEffect(() => {
    // Watch user's location continuously
    if (!navigator.geolocation) {
      toast.error(t('Geolocatie wordt niet ondersteund door je browser.', 'Geolocation is not supported by your browser.'));
      const fallback: [number, number] = [52.3676, 4.9041];
      setUserLocation(fallback);
      setInitialLocation(fallback);
      return;
    }

    let hasShownSuccess = false;
    let watchId: number | null = null;

    // First try to get current position (works better in Safari)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(coords);
        if (!initialLocation) {
          setInitialLocation(coords);
        }
        toast.success(t('Locatie gevonden!', 'Location found!'));
        hasShownSuccess = true;

        // After successful initial position, start watching for updates
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const coords: [number, number] = [
              position.coords.latitude,
              position.coords.longitude,
            ];
            setUserLocation(coords);
          },
          (error) => {
            console.error('Watch position error:', error.code, error.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 27000, // Longer timeout for Safari
            maximumAge: 5000 // Allow cached position up to 5s old
          }
        );
      },
      (error) => {
        console.error('Geolocation error:', error.code, error.message);
        let errorMessage = t('Kon locatie niet vinden.', 'Could not find location.');
        
        if (error.code === 1) {
          errorMessage = t('Locatie toegang geweigerd. Sta locatie toe in Safari instellingen.', 'Location access denied. Allow location in Safari settings.');
        } else if (error.code === 2) {
          errorMessage = t('Locatie niet beschikbaar.', 'Location unavailable.');
        } else if (error.code === 3) {
          errorMessage = t('Locatie timeout. Probeer opnieuw.', 'Location timeout. Try again.');
        }
        
        toast.error(errorMessage);
        const fallback: [number, number] = [52.3676, 4.9041];
        setUserLocation(fallback);
        if (!initialLocation) {
          setInitialLocation(fallback);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 27000, // Longer timeout for Safari
        maximumAge: 5000
      }
    );

    // Cleanup function to stop watching when component unmounts
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);


  const markModelAsDiscovered = async (modelId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('discovered_models')
      .insert({ user_id: user.id, model_id: modelId });
    
    if (!error) {
      setDiscoveredModels(prev => [...prev, modelId]);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  // Initialize map once with initial location
  useEffect(() => {
    if (!mapContainer.current || !initialLocation || showViewer) return;

    // Clean up existing map if it exists
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    // Check for map focus from localStorage before initializing
    const focusData = localStorage.getItem('mapFocus');
    let mapCenter: [number, number] = initialLocation;
    let mapZoom = 18;
    
    if (focusData) {
      try {
        const { lat, lon, zoom } = JSON.parse(focusData);
        mapCenter = [lat, lon];
        mapZoom = zoom || 18;
        localStorage.removeItem('mapFocus');
      } catch (e) {
        console.error('Error parsing mapFocus:', e);
      }
    }

    // Initialize map with high zoom for Pokémon Go style
    map.current = L.map(mapContainer.current).setView(mapCenter, mapZoom);

    // Add OpenStreetMap tile layer met cache ondersteuning
    tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      // Gebruik browser cache voor tiles
      crossOrigin: true,
    }).addTo(map.current);

    // Create custom icon for user location (blue)
    const userIcon = L.divIcon({
      className: 'custom-marker-user',
      html: `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: hsl(220, 85%, 55%);
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: white;
          "></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });


    // Add marker for user location
    userMarkerRef.current = L.marker(initialLocation, { icon: userIcon })
      .addTo(map.current);

    // Clear old model markers
    modelMarkersRef.current = [];

    // Create marker cluster group with custom icon
    if (markerClusterGroupRef.current) {
      map.current.removeLayer(markerClusterGroupRef.current);
    }
    
    markerClusterGroupRef.current = L.markerClusterGroup({
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, hsl(195, 85%, 55%), hsl(190, 75%, 65%));
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 20px;
          ">${count}</div>`,
          className: 'marker-cluster-custom',
          iconSize: L.point(60, 60)
        });
      },
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 80,
    });

    // Add markers for uploaded models
    const DISCOVERY_RADIUS = 50; // meters - discovery range
    
    models.forEach((model) => {
      if (model.latitude && model.longitude && map.current) {
        // Calculate distance between user and model
        const modelLatLng = L.latLng(model.latitude, model.longitude);
        const userLatLng = L.latLng(userLocation);
        const distance = userLatLng.distanceTo(modelLatLng);
        
        // Check if model is already discovered in database
        const isAlreadyDiscovered = discoveredModels.includes(model.id);
        // Check if model is within discovery range
        const isWithinRange = distance <= DISCOVERY_RADIUS;
        const isDiscovered = isAlreadyDiscovered || isWithinRange;
        const thumbnailUrl = model.thumbnail_url;
        
        const modelIcon = L.divIcon({
          className: 'custom-marker-model',
          html: `
            <div style="
              width: 80px;
              height: 80px;
              border-radius: 12px;
              background-color: white;
              border: 4px solid ${isDiscovered ? 'hsl(140, 75%, 45%)' : 'hsl(0, 0%, 60%)'};
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              ${thumbnailUrl && isDiscovered ? `background-image: url('${thumbnailUrl}'); background-size: cover; background-position: center;` : ''}
              ${!isDiscovered ? 'filter: grayscale(100%) opacity(0.5);' : ''}
            ">
              ${!thumbnailUrl || !isDiscovered ? `
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${isDiscovered ? 'hsl(140, 75%, 45%)' : 'hsl(0, 0%, 60%)'}" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              ` : ''}
              ${isDiscovered ? '<div style="position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; background: hsl(140, 75%, 45%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;">✓</div>' : ''}
            </div>
          `,
          iconSize: [80, 80],
          iconAnchor: [40, 40],
        });

        const modelMarker = L.marker([model.latitude, model.longitude], { icon: modelIcon })
          .bindPopup(`<b>${model.name}</b><br>${isDiscovered ? (model.description || t('Klik om 3D model te bekijken', 'Click to view 3D model')) : `🔒 ${t('Kom binnen', 'Come within')} ${Math.round(distance)}m ${t('om te ontdekken', 'to discover')}`}`)
          .on('click', async () => {
            if (isDiscovered) {
              // Mark as discovered if not already
              if (!isAlreadyDiscovered && isWithinRange && user) {
                await markModelAsDiscovered(model.id);
                toast.success(`${model.name} ${t('gevonden! 🎉', 'found! 🎉')}`);
              }
              setSelectedModel({
                name: model.name,
                description: model.description,
                file_path: model.file_path,
                photo_url: model.photo_url
              });
              
              // Check if this is a photo-only upload (no 3D model)
              if (!model.file_path && model.photo_url) {
                setShowPhotoViewer(true);
              } else {
                setShowViewer(true);
              }
            } else {
              toast.error(`${t('Je bent nog', 'You are still')} ${Math.round(distance)}m ${t('verwijderd van dit model', 'away from this model')}`);
            }
          });
        
        markerClusterGroupRef.current?.addLayer(modelMarker);
        modelMarkersRef.current.push(modelMarker);
      }
    });

    // Add markers for OSM statues (statues without 3D models from OpenStreetMap)
    if (showOsmStatues) {
      osmStatues.forEach((statue) => {
        if (map.current) {
          // Check if a model already exists at this location
          const hasModel = models.some(model => {
            if (!model.latitude || !model.longitude) return false;
            const dx = Math.abs(model.latitude - statue.lat);
            const dy = Math.abs(model.longitude - statue.lon);
            return dx < 0.0001 && dy < 0.0001; // ~10m tolerance
          });

          if (hasModel) return; // Skip if model already exists

          // Create custom icon for OSM statues (orange/amber color to indicate "no model yet")
          const osmIcon = L.divIcon({
            className: 'custom-marker-osm',
            html: `
              <div style="
                width: 70px;
                height: 70px;
                border-radius: 12px;
                background-color: white;
                border: 4px solid hsl(38, 92%, 50%);
                box-shadow: 0 4px 14px rgba(0,0,0,0.4);
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
              ">
                <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="hsl(38, 92%, 50%)" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: hsl(38, 92%, 50%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white;">!</div>
              </div>
            `,
            iconSize: [70, 70],
            iconAnchor: [35, 35],
          });

          const osmMarker = L.marker([statue.lat, statue.lon], { icon: osmIcon })
            .bindPopup(`
              <div style="text-align: center; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${statue.name}</h3>
                <p style="margin: 8px 0; color: #f59e0b; font-weight: 500;">⚠️ ${t('Dit standbeeld heeft nog geen 3D model', 'This statue doesn\'t have a 3D model yet')}</p>
                <p style="margin: 8px 0; font-size: 14px;">${t('Wees de eerste die hiervoor een model uploadt!', 'Be the first to upload a model!')}</p>
                <button 
                  onclick="window.uploadStatue(${statue.lat}, ${statue.lon}, '${statue.name.replace(/'/g, "\\'")}')"
                  style="
                    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    width: 100%;
                    margin-top: 8px;
                    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
                  "
                  onmouseover="this.style.background='linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'"
                  onmouseout="this.style.background='linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'"
                >
                  📸 ${t('Upload Foto/Model', 'Upload Photo/Model')}
                </button>
              </div>
            `);

          markerClusterGroupRef.current?.addLayer(osmMarker);
          osmMarkerRef.current.push(osmMarker);
        }
      });
    }

    // Add markers for Nijmegen kunstwerken
    nijmegenKunstwerken.forEach((kunstwerk) => {
      if (map.current) {
        // Check if a user model already exists at this location
        const hasUserModel = models.some(model => {
          if (!model.latitude || !model.longitude) return false;
          const dx = Math.abs(model.latitude - kunstwerk.lat);
          const dy = Math.abs(model.longitude - kunstwerk.lon);
          return dx < 0.0001 && dy < 0.0001; // ~10m tolerance
        });

        // Create custom icon for kunstwerken (purple/violet color)
        const kunstwerkIcon = L.divIcon({
          className: 'custom-marker-kunstwerk',
          html: `
            <div style="
              width: 70px;
              height: 70px;
              border-radius: 12px;
              background-color: white;
              border: 4px solid hsl(270, 75%, 60%);
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="hsl(270, 75%, 60%)" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              ${hasUserModel ? '<div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: hsl(140, 75%, 45%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white;">✓</div>' : ''}
            </div>
          `,
          iconSize: [70, 70],
          iconAnchor: [35, 35],
        });

        const kunstwerkMarker = L.marker([kunstwerk.lat, kunstwerk.lon], { icon: kunstwerkIcon })
          .bindPopup(`
            <div style="text-align: center; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${kunstwerk.name}</h3>
              <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${kunstwerk.artist}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">📍 ${kunstwerk.location}</p>
              ${hasUserModel ? `<p style="margin: 8px 0; color: hsl(140, 75%, 45%); font-weight: 500;">✓ ${t('Er is een 3D model beschikbaar', 'A 3D model is available')}</p>` : ''}
              <button 
                onclick="window.openKunstwerk('${kunstwerk.id}', 'nijmegen')"
                style="
                  background: linear-gradient(135deg, hsl(270, 75%, 60%) 0%, hsl(270, 65%, 50%) 100%);
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 600;
                  width: 100%;
                  margin-top: 8px;
                  box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
                "
                onmouseover="this.style.background='linear-gradient(135deg, hsl(270, 65%, 50%) 0%, hsl(270, 55%, 40%) 100%)'"
                onmouseout="this.style.background='linear-gradient(135deg, hsl(270, 75%, 60%) 0%, hsl(270, 65%, 50%) 100%)'"
              >
                🎨 ${t('Bekijk Details', 'View Details')}
              </button>
            </div>
          `, {
            maxWidth: 250,
            className: 'kunstwerk-popup'
          });

        markerClusterGroupRef.current?.addLayer(kunstwerkMarker);
        kunstwerkMarkersRef.current.push(kunstwerkMarker);
      }
    });

    // Add Utrecht kunstwerken markers with orange color
    utrechtKunstwerken.forEach((kunstwerk) => {
      if (kunstwerk.lat && kunstwerk.lon) {
        const hasUserModel = models.some(
          (model) =>
            model.latitude &&
            model.longitude &&
            Math.abs(model.latitude - kunstwerk.lat) < 0.0001 &&
            Math.abs(model.longitude - kunstwerk.lon) < 0.0001
        );

        const kunstwerkIcon = L.divIcon({
          html: `
            <div style="
              width: 70px;
              height: 70px;
              border-radius: 12px;
              background-color: white;
              border: 4px solid hsl(25, 95%, 53%);
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="hsl(25, 95%, 53%)" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              ${hasUserModel ? '<div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: hsl(140, 75%, 45%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white;">✓</div>' : ''}
            </div>
          `,
          iconSize: [70, 70],
          iconAnchor: [35, 35],
        });

        const kunstwerkMarker = L.marker([kunstwerk.lat, kunstwerk.lon], { icon: kunstwerkIcon })
          .bindPopup(`
            <div style="text-align: center; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${kunstwerk.name}</h3>
              <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${kunstwerk.artist}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">📍 ${kunstwerk.location}</p>
              ${kunstwerk.year ? `<p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">🗓️ ${kunstwerk.year}</p>` : ''}
              ${hasUserModel ? `<p style="margin: 8px 0; color: hsl(140, 75%, 45%); font-weight: 500;">✓ ${t('Er is een 3D model beschikbaar', 'A 3D model is available')}</p>` : ''}
              <button 
                onclick="window.openKunstwerk('${kunstwerk.id}', 'utrecht')"
                style="
                  background: linear-gradient(135deg, hsl(25, 95%, 53%) 0%, hsl(25, 85%, 43%) 100%);
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 600;
                  width: 100%;
                  margin-top: 8px;
                  box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3);
                "
                onmouseover="this.style.background='linear-gradient(135deg, hsl(25, 85%, 43%) 0%, hsl(25, 75%, 33%) 100%)'"
                onmouseout="this.style.background='linear-gradient(135deg, hsl(25, 95%, 53%) 0%, hsl(25, 85%, 43%) 100%)'"
              >
                🎨 ${t('Bekijk Details', 'View Details')}
              </button>
            </div>
          `, {
            maxWidth: 250,
            className: 'kunstwerk-popup'
          });

        markerClusterGroupRef.current?.addLayer(kunstwerkMarker);
        kunstwerkMarkersRef.current.push(kunstwerkMarker);
      }
    });

    // Add the cluster group to the map
    if (markerClusterGroupRef.current) {
      map.current.addLayer(markerClusterGroupRef.current);
    }

    // Add circle to show accuracy for user location (smaller for mobile)
    accuracyCircleRef.current = L.circle(initialLocation, {
      color: 'hsl(220, 85%, 55%)',
      fillColor: 'hsl(220, 85%, 55%)',
      fillOpacity: 0.1,
      radius: 50,
    }).addTo(map.current);


    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialLocation, models, showViewer, discoveredModels, user]);

  // Update user marker position when location changes
  useEffect(() => {
    if (!userLocation || !userMarkerRef.current) return;
    
    // Update marker position smoothly
    userMarkerRef.current.setLatLng(userLocation);
    
    // Update accuracy circle position
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(userLocation);
    }
  }, [userLocation]);

  // Add global functions for buttons in popups
  useEffect(() => {
    (window as any).uploadStatue = (lat: number, lon: number, name: string) => {
      localStorage.setItem('uploadLocation', JSON.stringify({ lat, lon, name }));
      window.location.href = '/upload';
    };
    
    (window as any).openKunstwerk = (id: string, city: 'nijmegen' | 'utrecht') => {
      let kunstwerk: NijmegenKunstwerk | UtrechtKunstwerk | undefined;
      
      if (city === 'nijmegen') {
        kunstwerk = nijmegenKunstwerken.find(k => k.id === id);
      } else {
        kunstwerk = utrechtKunstwerken.find(k => k.id === id);
      }
      
      if (kunstwerk) {
        setSelectedKunstwerk({ kunstwerk, city });
        // Close any open popups
        if (map.current) {
          map.current.closePopup();
        }
      }
    };
    
    return () => {
      delete (window as any).uploadStatue;
      delete (window as any).openKunstwerk;
    };
  }, []);

  return (
    <div className="relative h-screen w-full">
      <KunstwerkViewer 
        kunstwerk={selectedKunstwerk?.kunstwerk ?? null}
        city={selectedKunstwerk?.city ?? 'nijmegen'}
        onClose={() => setSelectedKunstwerk(null)} 
      />
      
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={500}
          />
        </div>
      )}
      {showPhotoViewer && selectedModel && selectedModel.photo_url ? (
        <PhotoViewer
          photoUrl={selectedModel.photo_url}
          name={selectedModel.name}
          description={selectedModel.description}
          onClose={() => setShowPhotoViewer(false)}
        />
      ) : showViewer && selectedModel ? (
        <div className="fixed inset-0 z-30 bg-background flex flex-col">
          <div className="bg-background/98 backdrop-blur-sm border-b border-border p-3 md:p-4 flex-shrink-0 safe-area-top">
            <div className="flex items-start gap-3">
              <Button 
                onClick={() => {
                  setShowViewer(false);
                  setSelectedModel(null);
                }} 
                variant="default"
                size="lg"
                className="shadow-[var(--shadow-elevated)] hover:shadow-[var(--shadow-glow)] transition-all shrink-0"
              >
                ← {t('Terug', 'Back')}
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-foreground truncate">{selectedModel.name}</h2>
                {selectedModel.description && (
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{selectedModel.description}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">👆 {t('Sleep om te roteren', 'Drag to rotate')} • 🔍 {t('Pinch om te zoomen', 'Pinch to zoom')}</p>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <StandbeeldViewer
              modelPath={selectedModel.file_path}
              onClose={() => setShowViewer(false)}
              autoRotate={true}
            />
          </div>
        </div>
      ) : (
        <>
          <div ref={mapContainer} className="absolute inset-0 pb-16 md:pb-0" />
          
          {/* Mobile-optimized info card */}
          <div className="absolute left-2 md:left-20 top-2 md:top-4 right-2 md:right-auto z-20 rounded-xl bg-card/95 px-3 md:px-4 py-2 md:py-3 shadow-[var(--shadow-elevated)] backdrop-blur-sm max-w-xs">
            <p className="text-sm md:text-lg font-bold text-foreground">📍 {t('Je Locatie', 'Your Location')}</p>
            {userLocation && (
              <p className="text-xs text-muted-foreground">
                {userLocation[0].toFixed(4)}°N, {userLocation[1].toFixed(4)}°E
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 md:mt-2">
              💡 {t('Tik op standbeeld om te bekijken', 'Tap on statue to view')}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default MapView;
