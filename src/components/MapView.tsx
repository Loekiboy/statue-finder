import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import StandbeeldViewer, { preloadModels } from './StandbeeldViewer';
import PhotoViewer from './PhotoViewer';
import QuickUploadDialog from './QuickUploadDialog';
import KunstwerkViewer from './KunstwerkViewer';
import { SearchBar } from './SearchBar';
import { Button } from './ui/button';
import { MapPin, RefreshCw, Loader2, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { isOnWiFi, cacheMapTiles, cacheNearbyModels, clearOldCaches, cacheOSMStatues, getCachedOSMStatues, OSMStatue as CachedOSMStatue } from '@/lib/cacheManager';
import { nijmegenKunstwerken, NijmegenKunstwerk } from '@/data/nijmegenKunstwerken';
import { utrechtKunstwerken, UtrechtKunstwerk } from '@/data/utrechtKunstwerken';
import { alkmaartKunstwerken, AlkmaarKunstwerk } from '@/data/alkmaartKunstwerken';
import { denhaagKunstwerken, DenHaagKunstwerk } from '@/data/denhaagKunstwerken';
import { delftKunstwerken, DelftKunstwerk } from '@/data/delftKunstwerken';
import { dublinKunstwerken, DublinKunstwerk } from '@/data/dublinKunstwerken';
import { antoingKunstwerken, AntoingKunstwerk } from '@/data/antoingKunstwerken';
import { importMunicipalArtworks, importDrentheArtworks } from '@/lib/importMunicipalArtworks';
import { getLowResImageUrl } from '@/lib/imageUtils';
interface Model {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  photo_url: string | null;
  artist?: string | null;
  year?: string | null;
  materials?: string | null;
  credits?: string | null;
  website_url?: string | null;
  source_city?: string | null;
  source_id?: string | null;
  is_municipal?: boolean;
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
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  photo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
const MapView = () => {
  const {
    t
  } = useLanguage();
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
  const hasLoadedFromUrl = useRef(false);
  const [user, setUser] = useState<{
    id: string;
  } | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showOsmStatues, setShowOsmStatues] = useState(true);
  const [selectedKunstwerk, setSelectedKunstwerk] = useState<{
    kunstwerk: NijmegenKunstwerk | UtrechtKunstwerk | AlkmaarKunstwerk | DenHaagKunstwerk | DelftKunstwerk | DublinKunstwerk | AntoingKunstwerk | any;
    city: 'nijmegen' | 'utrecht' | 'alkmaar' | 'denhaag' | 'delft' | 'dublin' | 'antoing' | 'drenthe';
    model?: Model;
  } | null>(null);
  const [drentheKunstwerken, setDrentheKunstwerken] = useState<any[]>([]);
  const [uploadedModels, setUploadedModels] = useState<any[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const modelMarkersRef = useRef<L.Marker[]>([]);
  const osmMarkerRef = useRef<L.Marker[]>([]);
  const kunstwerkMarkersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch discovered models
  useEffect(() => {
    const fetchDiscoveredModels = async () => {
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from('discovered_models').select('model_id').eq('user_id', user.id);
      if (!error && data) {
        setDiscoveredModels(data.map(d => d.model_id));
      }
    };
    fetchDiscoveredModels();
  }, [user]);

  // Import municipal artworks and fetch models from database
  useEffect(() => {
    const initModels = async () => {
      // Import municipal artworks first (only if they don't exist)
      await importMunicipalArtworks();
      await importDrentheArtworks();

      // Then fetch all models (municipal + user uploaded)
      const {
        data,
        error
      } = await supabase.from('models').select('*').not('latitude', 'is', null).not('longitude', 'is', null);
      if (error) {
        console.error('Error fetching models:', error);
        return;
      }
      setModels(data || []);
    };
    initModels();
    clearOldCaches(); // Ruim oude caches op bij opstarten
  }, []);

  // Fetch user profile settings
  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data
        } = await supabase.from('profiles').select('show_osm_statues').eq('user_id', user.id).single();
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
        const filteredStatues = cachedStatues.filter(statue => !isTooCloseToExisting(statue.lat, statue.lon)).map(statue => ({
          ...statue,
          distance: calculateDistance(lat, lon, statue.lat, statue.lon)
        })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setOsmStatues(filteredStatues);
        console.log(`Using ${filteredStatues.length} cached OSM statues (filtered from ${cachedStatues.length})`);
        return;
      }

      // Progressive loading: start with closest, then expand radius up to 500km
      const radii = [2000, 5000, 10000, 25000, 50000, 100000, 200000, 500000]; // 2km, 5km, 10km, 25km, 50km, 100km, 200km, 500km
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
            body: query
          });
          const data = await response.json();
          const newStatues: OSMStatue[] = data.elements.filter((element: {
            lat: number;
            lon: number;
          }) => !isTooCloseToExisting(element.lat, element.lon)).map((element: {
            id: number;
            lat: number;
            lon: number;
            tags?: {
              name?: string;
              'name:nl'?: string;
            };
          }) => ({
            id: `osm-${element.id}`,
            name: element.tags?.name || element.tags?.['name:nl'] || 'Onbekend standbeeld',
            lat: element.lat,
            lon: element.lon,
            tags: element.tags,
            distance: calculateDistance(lat, lon, element.lat, element.lon)
          }));

          // Filter out duplicates and sort by distance
          const uniqueStatues = newStatues.filter(newStatue => !allStatues.some(existing => existing.id === newStatue.id));
          allStatues = [...allStatues, ...uniqueStatues].sort((a, b) => (a.distance || 0) - (b.distance || 0));

          // Update map with current batch (progressive rendering)
          setOsmStatues([...allStatues]);
          
          console.log(`Loaded ${uniqueStatues.length} new OSM statues at ${radius/1000}km radius (total: ${allStatues.length})`);

          // Longer delay between batches to not overload the API and show progressive loading
          if (radius !== radii[radii.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 2000));
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
        const {
          data
        } = supabase.storage.from('models').getPublicUrl(model.file_path);
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

  // Load Drenthe kunstwerken
  const loadDrentheKunstwerken = async () => {
    try {
      const response = await fetch('https://kaartportaal.drenthe.nl/server/rest/services/GDB_actueel/GBI_WK_KUNST_PROVWEGEN_P/MapServer/0/query?where=1%3D1&outFields=*&f=geojson');
      const data = await response.json();
      const kunstwerken = data.features.map((feature: any) => ({
        id: `drenthe-${feature.properties.OBJECTID || feature.properties.FID || Math.random()}`,
        name: feature.properties.NAAM || feature.properties.Naam || 'Onbekend kunstwerk',
        artist: feature.properties.KUNSTENAAR || feature.properties.Kunstenaar || '',
        location: feature.properties.LOCATIE || feature.properties.Locatie || '',
        description: feature.properties.OMSCHRIJVING || feature.properties.Omschrijving || '',
        year: feature.properties.JAAR || feature.properties.Jaar || '',
        material: feature.properties.MATERIAAL || feature.properties.Materiaal || '',
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        photos: []
      }));
      setDrentheKunstwerken(kunstwerken);
      console.log(`Loaded ${kunstwerken.length} Drenthe kunstwerken`);
    } catch (error) {
      console.error('Error loading Drenthe kunstwerken:', error);
    }
  };

  // Load last known location from profile
  useEffect(() => {
    const loadLastKnownLocation = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data
        } = await supabase.from('profiles').select('last_known_latitude, last_known_longitude').eq('user_id', user.id).single();
        if (data && data.last_known_latitude && data.last_known_longitude) {
          const lastKnownLocation: [number, number] = [data.last_known_latitude, data.last_known_longitude];
          setInitialLocation(lastKnownLocation);
        }
      }
    };
    loadLastKnownLocation();
    loadDrentheKunstwerken();

    // Load uploaded models
    const loadUploadedModels = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('models').select('*');
        if (error) throw error;
        setUploadedModels(data || []);
      } catch (error) {
        console.error('Error loading uploaded models:', error);
      }
    };
    loadUploadedModels();
  }, []);
  // Detect iOS Safari
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
    ('standalone' in window.navigator && (window.navigator as any).standalone);

  // State for manual location refresh
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationButton, setShowLocationButton] = useState(() => {
    return localStorage.getItem('showLocationButton') === 'true';
  });
  const [showLocationSuggestion, setShowLocationSuggestion] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const locationFoundRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  // Listen for localStorage changes and screen resize
  useEffect(() => {
    const handleStorageChange = () => {
      setShowLocationButton(localStorage.getItem('showLocationButton') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setShowLocationButton(localStorage.getItem('showLocationButton') === 'true');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const showLocationButtonSuggestion = useCallback(() => {
    if (isMobile && !showLocationButton && localStorage.getItem('locationSuggestionDismissed') !== 'true') {
      setShowLocationSuggestion(true);
    }
  }, [isMobile, showLocationButton]);

  const enableLocationButton = useCallback(() => {
    localStorage.setItem('showLocationButton', 'true');
    setShowLocationButton(true);
    setShowLocationSuggestion(false);
    toast.success(t('Locatie-knop ingeschakeld!', 'Location button enabled!'));
  }, [t]);

  const dismissLocationSuggestion = useCallback(() => {
    localStorage.setItem('locationSuggestionDismissed', 'true');
    setShowLocationSuggestion(false);
  }, []);

  const saveLocationToProfile = useCallback(async (coords: [number, number]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          last_known_latitude: coords[0],
          last_known_longitude: coords[1],
          last_location_updated_at: new Date().toISOString()
        }).eq('user_id', user.id);
      }
    } catch (e) {
      // Silently fail
    }
  }, []);

  // Simple, robust geolocation request - works on iOS Safari
  const requestLocation = useCallback((showToast = true) => {
    if (!navigator.geolocation) {
      const msg = t('Geolocatie wordt niet ondersteund.', 'Geolocation not supported.');
      setLocationError(msg);
      if (showToast) toast.error(msg);
      setUserLocation([52.3676, 4.9041]);
      setInitialLocation([52.3676, 4.9041]);
      return;
    }

    setIsRequestingLocation(true);
    setLocationError(null);
    console.log('Requesting location... (iOS:', isIOSSafari, ')');

    // iOS Safari works best with these settings:
    // - enableHighAccuracy: false (more reliable)
    // - maximumAge: very high (use cached if available)
    // - timeout: reasonable (not too short)
    const options: PositionOptions = {
      enableHighAccuracy: false,  // FALSE works better on iOS!
      timeout: 10000,             // 10 seconds
      maximumAge: 86400000        // Accept 24-hour old cached position
    };

    const onSuccess = (position: GeolocationPosition) => {
      const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
      console.log('Location SUCCESS:', coords, 'Accuracy:', position.coords.accuracy);
      
      setUserLocation(coords);
      setInitialLocation(prev => prev || coords);
      setIsRequestingLocation(false);
      setLocationError(null);
      locationFoundRef.current = true;
      
      if (showToast) {
        toast.success(t('Locatie gevonden!', 'Location found!'));
      }
      saveLocationToProfile(coords);
    };

    const onError = (error: GeolocationPositionError) => {
      console.log('Location error:', error.code, error.message);
      
      // If first attempt fails, try with high accuracy as fallback
      if (!locationFoundRef.current) {
        console.log('Trying high accuracy fallback...');
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (fallbackError) => {
            console.log('High accuracy also failed:', fallbackError.code, fallbackError.message);
            handleFinalError(fallbackError);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      } else {
        handleFinalError(error);
      }
    };

    const handleFinalError = (error: GeolocationPositionError) => {
      setIsRequestingLocation(false);
      
      let msg: string;
      if (error.code === 1) {
        // Permission denied
        msg = isIOSSafari
          ? t('Locatie geweigerd. Open Instellingen > Privacy > Locatievoorzieningen en schakel Safari in.', 
              'Location denied. Open Settings > Privacy > Location Services and enable Safari.')
          : t('Locatie geweigerd. Sta locatietoegang toe in je browser.', 
              'Location denied. Allow location access in your browser.');
      } else if (error.code === 2) {
        // Position unavailable
        msg = t('Locatie niet beschikbaar. Zorg dat GPS/locatie aan staat op je apparaat.', 
                'Location unavailable. Make sure GPS/location is enabled on your device.');
      } else {
        // Timeout
        msg = isIOSSafari
          ? t('Locatie timeout. Tip: Voeg deze site toe aan je beginscherm voor betere locatie.', 
              'Location timeout. Tip: Add this site to home screen for better location.')
          : t('Locatie timeout. Probeer opnieuw.', 'Location timeout. Try again.');
      }
      
      setLocationError(msg);
      if (showToast) toast.error(msg);
      showLocationButtonSuggestion();
      
      // Set fallback location
      if (!userLocation) {
        setUserLocation([52.3676, 4.9041]);
        setInitialLocation(prev => prev || [52.3676, 4.9041]);
      }
    };

    // Make the request
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
  }, [isIOSSafari, t, saveLocationToProfile, showLocationButtonSuggestion, userLocation]);

  // Start watching location after initial success
  useEffect(() => {
    if (!locationFoundRef.current || !navigator.geolocation) return;
    
    // Don't use watchPosition on iOS - it's buggy
    if (isIOSSafari) {
      // Poll every 60 seconds instead
      const intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserLocation(coords);
            saveLocationToProfile(coords);
          },
          () => {}, // Silently ignore errors
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
      }, 60000);
      
      return () => clearInterval(intervalId);
    }
    
    // Standard watchPosition for other browsers
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        saveLocationToProfile(coords);
      },
      (error) => console.log('Watch error:', error.code),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isIOSSafari, saveLocationToProfile]);

  // Initial location request
  useEffect(() => {
    const timer = setTimeout(() => {
      requestLocation(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const markModelAsDiscovered = async (modelId: string) => {
    if (!user) return;
    const {
      error
    } = await supabase.from('discovered_models').insert({
      user_id: user.id,
      model_id: modelId
    });
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
        const {
          lat,
          lon,
          zoom
        } = JSON.parse(focusData);
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
      crossOrigin: true
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
      iconAnchor: [20, 20]
    });

    // Add marker for user location
    userMarkerRef.current = L.marker(initialLocation, {
      icon: userIcon
    }).addTo(map.current);

    // Clear old model markers
    modelMarkersRef.current = [];

    // Create marker cluster group with custom icon
    if (markerClusterGroupRef.current) {
      map.current.removeLayer(markerClusterGroupRef.current);
    }
    markerClusterGroupRef.current = L.markerClusterGroup({
      iconCreateFunction: function (cluster) {
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
      maxClusterRadius: 80
    });

    // Helper function to check if a model matches a kunstwerk location
    const isModelAtKunstwerkLocation = (modelLat: number, modelLon: number) => {
      // Check Nijmegen kunstwerken
      const matchesNijmegen = nijmegenKunstwerken.some(kunstwerk => {
        const dx = Math.abs(kunstwerk.lat - modelLat);
        const dy = Math.abs(kunstwerk.lon - modelLon);
        return dx < 0.0001 && dy < 0.0001; // ~10m tolerance
      });
      if (matchesNijmegen) return true;

      // Check Utrecht kunstwerken
      const matchesUtrecht = utrechtKunstwerken.some(kunstwerk => {
        const dx = Math.abs(kunstwerk.lat - modelLat);
        const dy = Math.abs(kunstwerk.lon - modelLon);
        return dx < 0.0001 && dy < 0.0001; // ~10m tolerance
      });
      if (matchesUtrecht) return true;

      // Check Alkmaar kunstwerken
      const matchesAlkmaar = alkmaartKunstwerken.some(kunstwerk => {
        const dx = Math.abs(kunstwerk.lat - modelLat);
        const dy = Math.abs(kunstwerk.lon - modelLon);
        return dx < 0.0001 && dy < 0.0001; // ~10m tolerance
      });
      if (matchesAlkmaar) return true;

      // Check Den Haag kunstwerken
      const matchesDenHaag = denhaagKunstwerken.some(kunstwerk => {
        const dx = Math.abs(kunstwerk.lat - modelLat);
        const dy = Math.abs(kunstwerk.lon - modelLon);
        return dx < 0.0001 && dy < 0.0001; // ~10m tolerance
      });
      return matchesDenHaag;
    };

    // Add markers for uploaded models (but skip those that match kunstwerken)
    const DISCOVERY_RADIUS = 50; // meters - discovery range

    models.forEach(model => {
      if (model.latitude && model.longitude && map.current) {
        // Skip if this model is at a kunstwerk location - it will be shown with the kunstwerk marker
        if (isModelAtKunstwerkLocation(model.latitude, model.longitude)) {
          return;
        }

        // Calculate distance between user and model
        const modelLatLng = L.latLng(model.latitude, model.longitude);
        const distance = userLocation 
          ? L.latLng(userLocation).distanceTo(modelLatLng)
          : Infinity;

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
          iconAnchor: [40, 40]
        });
        const modelMarker = L.marker([model.latitude, model.longitude], {
          icon: modelIcon
        }).bindPopup(`<b>${model.name}</b><br>${isDiscovered ? model.description || t('Klik om 3D model te bekijken', 'Click to view 3D model') : `🔒 ${t('Kom binnen', 'Come within')} ${Math.round(distance)}m ${t('om te ontdekken', 'to discover')}`}`).on('click', async () => {
          if (isDiscovered) {
            // Mark as discovered if not already
            if (!isAlreadyDiscovered && isWithinRange && user) {
              await markModelAsDiscovered(model.id);
              toast.success(`${model.name} ${t('gevonden! 🎉', 'found! 🎉')}`);
            }
            setSelectedModel({
              id: model.id,
              name: model.name,
              description: model.description,
              file_path: model.file_path,
              photo_url: model.photo_url,
              latitude: model.latitude,
              longitude: model.longitude
            });

            // Update URL parameter
            const url = new URL(window.location.href);
            url.searchParams.set('model', model.id);
            window.history.pushState({}, '', url.toString());

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
      osmStatues.forEach(statue => {
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
            iconAnchor: [35, 35]
          });
          const osmMarker = L.marker([statue.lat, statue.lon], {
            icon: osmIcon
          }).bindPopup(`
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
    nijmegenKunstwerken.forEach(kunstwerk => {
      if (map.current) {
        // Find matching user model at this location
        const matchingModel = models.find(model => {
          if (!model.latitude || !model.longitude) return false;
          const dx = Math.abs(model.latitude - kunstwerk.lat);
          const dy = Math.abs(model.longitude - kunstwerk.lon);
          return dx < 0.0001 && dy < 0.0001; // ~10m tolerance
        });
        const hasUserModel = !!matchingModel;
        const previewImage = matchingModel?.thumbnail_url || matchingModel?.photo_url;

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
              ${previewImage ? `<img src="${previewImage}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<svg width=\\'35\\' height=\\'35\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'hsl(270, 75%, 60%)\\' stroke-width=\\'2\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg>'"/>` : `<svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="hsl(270, 75%, 60%)" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>`}
              ${hasUserModel ? '<div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: hsl(140, 75%, 45%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white;">✓</div>' : ''}
            </div>
          `,
          iconSize: [70, 70],
          iconAnchor: [35, 35]
        });
        const kunstwerkMarker = L.marker([kunstwerk.lat, kunstwerk.lon], {
          icon: kunstwerkIcon
        }).bindPopup(`
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
    utrechtKunstwerken.forEach(kunstwerk => {
      if (kunstwerk.lat && kunstwerk.lon) {
        // Find matching user model at this location
        const matchingModel = models.find(model => model.latitude && model.longitude && Math.abs(model.latitude - kunstwerk.lat) < 0.0001 && Math.abs(model.longitude - kunstwerk.lon) < 0.0001);
        const hasUserModel = !!matchingModel;
        
        // Use low-res versions for map markers
        const originalImage = matchingModel?.thumbnail_url || matchingModel?.photo_url || (kunstwerk.photos && kunstwerk.photos.length > 0 ? kunstwerk.photos[0] : null);
        const previewImage = getLowResImageUrl(originalImage, 100);
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
              ${previewImage ? `<img src="${previewImage}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<svg width=\\'35\\' height=\\'35\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'hsl(25, 95%, 53%)\\' stroke-width=\\'2\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg>'"/>` : `<svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="hsl(25, 95%, 53%)" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>`}
              ${hasUserModel ? '<div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: hsl(140, 75%, 45%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white;">✓</div>' : ''}
            </div>
          `,
          iconSize: [70, 70],
          iconAnchor: [35, 35]
        });
        const kunstwerkMarker = L.marker([kunstwerk.lat, kunstwerk.lon], {
          icon: kunstwerkIcon
        }).bindPopup(`
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

    // Add Alkmaar kunstwerken markers with green color
    alkmaartKunstwerken.forEach(kunstwerk => {
      if (kunstwerk.lat && kunstwerk.lon) {
        const matchingModel = models.find(model => model.latitude && model.longitude && Math.abs(model.latitude - kunstwerk.lat) < 0.0001 && Math.abs(model.longitude - kunstwerk.lon) < 0.0001);
        const hasUserModel = !!matchingModel;
        
        // Use low-res versions for map markers
        const originalImage = matchingModel?.thumbnail_url || matchingModel?.photo_url || (kunstwerk.photos && kunstwerk.photos.length > 0 ? kunstwerk.photos[0] : null);
        const previewImage = getLowResImageUrl(originalImage, 100);
        const kunstwerkIcon = L.divIcon({
          html: `
            <div style="
              width: 70px;
              height: 70px;
              border-radius: 12px;
              background-color: white;
              border: 4px solid hsl(142, 76%, 36%);
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              ${previewImage ? `<img src="${previewImage}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<svg width=\\'35\\' height=\\'35\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'hsl(142, 76%, 36%)\\' stroke-width=\\'2\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg>'"/>` : `<svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="hsl(142, 76%, 36%)" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>`}
              ${hasUserModel ? '<div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: hsl(140, 75%, 45%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white;">✓</div>' : ''}
            </div>
          `,
          iconSize: [70, 70],
          iconAnchor: [35, 35]
        });
        const kunstwerkMarker = L.marker([kunstwerk.lat, kunstwerk.lon], {
          icon: kunstwerkIcon
        }).bindPopup(`
            <div style="text-align: center; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${kunstwerk.name}</h3>
              <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${kunstwerk.artist}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">📍 ${kunstwerk.location}</p>
              ${kunstwerk.year ? `<p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">🗓️ ${kunstwerk.year}</p>` : ''}
              ${hasUserModel ? `<p style="margin: 8px 0; color: hsl(140, 75%, 45%); font-weight: 500;">✓ ${t('Er is een 3D model beschikbaar', 'A 3D model is available')}</p>` : ''}
              <button 
                onclick="window.openKunstwerk('${kunstwerk.id}', 'alkmaar')"
                style="
                  background: linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 66%, 26%) 100%);
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 600;
                  width: 100%;
                  margin-top: 8px;
                  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
                "
                onmouseover="this.style.background='linear-gradient(135deg, hsl(142, 66%, 26%) 0%, hsl(142, 56%, 16%) 100%)'"
                onmouseout="this.style.background='linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 66%, 26%) 100%)'"
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

    // Add Den Haag kunstwerken markers with blue color
    denhaagKunstwerken.forEach(kunstwerk => {
      if (kunstwerk.lat && kunstwerk.lon) {
        const matchingModel = models.find(model => model.latitude && model.longitude && Math.abs(model.latitude - kunstwerk.lat) < 0.0001 && Math.abs(model.longitude - kunstwerk.lon) < 0.0001);
        const hasUserModel = !!matchingModel;
        
        // Use low-res versions for map markers
        const originalImage = matchingModel?.thumbnail_url || matchingModel?.photo_url || (kunstwerk.photos && kunstwerk.photos[0]);
        const previewImage = getLowResImageUrl(originalImage, 100);
        
        const kunstwerkIcon = L.divIcon({
          className: 'custom-marker-kunstwerk',
          html: `
            <div style="
              width: 70px;
              height: 70px;
              border-radius: 12px;
              background-color: white;
              border: 4px solid hsl(217, 91%, 60%);
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              ${previewImage ? `<img src="${previewImage}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<svg width=\\'35\\' height=\\'35\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'hsl(217, 91%, 60%)\\' stroke-width=\\'2\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg>'"/>` : `<svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="hsl(217, 91%, 60%)" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>`}
              ${hasUserModel ? '<div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: hsl(140, 75%, 45%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white;">✓</div>' : ''}
            </div>
          `,
          iconSize: [70, 70],
          iconAnchor: [35, 35]
        });
        const kunstwerkMarker = L.marker([kunstwerk.lat, kunstwerk.lon], {
          icon: kunstwerkIcon
        }).bindPopup(`
            <div style="text-align: center; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${kunstwerk.name}</h3>
              <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${kunstwerk.artist}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">📍 ${kunstwerk.location}</p>
              ${hasUserModel ? `<p style="margin: 8px 0; color: hsl(140, 75%, 45%); font-weight: 500;">✓ ${t('Er is een 3D model beschikbaar', 'A 3D model is available')}</p>` : ''}
              <button 
                onclick="window.openKunstwerk('${kunstwerk.id}', 'denhaag')"
                style="
                  background: linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(217, 81%, 50%) 100%);
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 600;
                  width: 100%;
                  margin-top: 8px;
                  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
                "
                onmouseover="this.style.background='linear-gradient(135deg, hsl(217, 81%, 50%) 0%, hsl(217, 71%, 40%) 100%)'"
                onmouseout="this.style.background='linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(217, 81%, 50%) 100%)'"
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

    // Add Drenthe kunstwerken markers with red color
    drentheKunstwerken.forEach(kunstwerk => {
      if (kunstwerk.lat && kunstwerk.lon) {
        const matchingModel = models.find(model => model.latitude && model.longitude && Math.abs(model.latitude - kunstwerk.lat) < 0.0001 && Math.abs(model.longitude - kunstwerk.lon) < 0.0001);
        const previewImage = matchingModel?.thumbnail_url || matchingModel?.photo_url;
        const kunstwerkIcon = L.divIcon({
          className: 'custom-marker-kunstwerk',
          html: `
            <div style="
              width: 70px;
              height: 70px;
              background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 11px;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
              border: 3px solid white;
              cursor: pointer;
              ${previewImage ? `background-image: url('${previewImage}'); background-size: cover; background-position: center;` : ''}
            ">
              ${!previewImage ? '🎨' : ''}
            </div>
          `,
          iconSize: [70, 70],
          iconAnchor: [35, 35]
        });
        const kunstwerkMarker = L.marker([kunstwerk.lat, kunstwerk.lon], {
          icon: kunstwerkIcon
        }).bindPopup(`
            <div style="text-align: center; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${kunstwerk.name}</h3>
              <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${kunstwerk.artist}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">${kunstwerk.location}</p>
              <button 
                onclick="window.viewKunstwerkDetails('drenthe', '${kunstwerk.id}')" 
                style="margin-top: 8px; padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;"
              >
                ${t('Bekijk details', 'View details')}
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

    // Add Delft kunstwerken markers with orange color
    delftKunstwerken.forEach(kunstwerk => {
      if (kunstwerk.lat && kunstwerk.lon) {
        const matchingModel = models.find(model => model.latitude && model.longitude && Math.abs(model.latitude - kunstwerk.lat) < 0.0001 && Math.abs(model.longitude - kunstwerk.lon) < 0.0001);
        const hasUserModel = !!matchingModel;
        
        // Use low-res versions for map markers
        const originalImage = matchingModel?.thumbnail_url || matchingModel?.photo_url;
        const previewImage = getLowResImageUrl(originalImage, 100);
        
        const kunstwerkIcon = L.divIcon({
          className: 'custom-marker-kunstwerk',
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
              ${previewImage ? `<img src="${previewImage}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<svg width=\\'35\\' height=\\'35\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'hsl(25, 95%, 53%)\\' stroke-width=\\'2\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg>'"/>` : `<svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="hsl(25, 95%, 53%)" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>`}
              ${hasUserModel ? '<div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: hsl(140, 75%, 45%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white;">✓</div>' : ''}
            </div>
          `,
          iconSize: [70, 70],
          iconAnchor: [35, 35]
        });
        const kunstwerkMarker = L.marker([kunstwerk.lat, kunstwerk.lon], {
          icon: kunstwerkIcon
        }).bindPopup(`
            <div style="text-align: center; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${kunstwerk.name}</h3>
              <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${kunstwerk.artist}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">📍 ${kunstwerk.location}</p>
              ${kunstwerk.year ? `<p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">🗓️ ${kunstwerk.year}</p>` : ''}
              ${hasUserModel ? `<p style="margin: 8px 0; color: hsl(140, 75%, 45%); font-weight: 500;">✓ ${t('Er is een 3D model beschikbaar', 'A 3D model is available')}</p>` : ''}
              <button 
                onclick="window.openKunstwerk('${kunstwerk.id}', 'delft')"
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
                  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
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
    
    // Dublin kunstwerken markers (groen)
    dublinKunstwerken.forEach(kunstwerk => {
      const hasUserModel = models.some(model => {
        if (!model.latitude || !model.longitude) return false;
        const dx = Math.abs(model.latitude - kunstwerk.lat);
        const dy = Math.abs(model.longitude - kunstwerk.lon);
        return dx < 0.0001 && dy < 0.0001;
      });
      
      // Use low-res versions for map markers
      const originalImage = kunstwerk.photos && kunstwerk.photos.length > 0 ? kunstwerk.photos[0] : null;
      const previewImage = getLowResImageUrl(originalImage, 100);
      
      const kunstwerkIcon = L.divIcon({
        html: `
          <div style="
            width: 70px;
            height: 70px;
            background: white;
            border-radius: 50%;
            border: 4px solid hsl(142, 76%, 36%);
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          ">
            ${previewImage ? `<img src="${previewImage}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<svg width=\\'35\\' height=\\'35\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'hsl(142, 76%, 36%)\\' stroke-width=\\'2\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg>'"/>` : `<svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="hsl(142, 76%, 36%)" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>`}
            ${hasUserModel ? '<div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: hsl(140, 75%, 45%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white;">✓</div>' : ''}
          </div>
        `,
        iconSize: [70, 70],
        iconAnchor: [35, 35]
      });
      
      const kunstwerkMarker = L.marker([kunstwerk.lat, kunstwerk.lon], {
        icon: kunstwerkIcon
      }).bindPopup(`
          <div style="text-align: center; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${kunstwerk.name}</h3>
            <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${kunstwerk.artist}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">📍 ${kunstwerk.location}</p>
            ${kunstwerk.year ? `<p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">🗓️ ${kunstwerk.year}</p>` : ''}
            ${hasUserModel ? `<p style="margin: 8px 0; color: hsl(140, 75%, 45%); font-weight: 500;">✓ ${t('Er is een 3D model beschikbaar', 'A 3D model is available')}</p>` : ''}
            <button 
              onclick="window.openKunstwerk('${kunstwerk.id}', 'dublin')"
              style="
                background: linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 66%, 26%) 100%);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                width: 100%;
                margin-top: 8px;
                box-shadow: 0 2px 8px rgba(34, 139, 34, 0.3);
              "
              onmouseover="this.style.background='linear-gradient(135deg, hsl(142, 66%, 26%) 0%, hsl(142, 56%, 16%) 100%)'"
              onmouseout="this.style.background='linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 66%, 26%) 100%)'"
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
    });

    // Antoing kunstwerken markers (rood)
    antoingKunstwerken.forEach(kunstwerk => {
      if (kunstwerk.lat && kunstwerk.lon) {
        const matchingModel = models.find(model => 
          model.latitude && model.longitude && 
          Math.abs(model.latitude - kunstwerk.lat) < 0.0001 && 
          Math.abs(model.longitude - kunstwerk.lon) < 0.0001
        );
        const hasUserModel = !!matchingModel;
        
        const kunstwerkIcon = L.divIcon({
          html: `
            <div style="
              width: 70px;
              height: 70px;
              background: white;
              border-radius: 50%;
              border: 4px solid hsl(0, 84%, 60%);
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="hsl(0, 84%, 60%)" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              ${hasUserModel ? '<div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: hsl(140, 75%, 45%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white;">✓</div>' : ''}
            </div>
          `,
          iconSize: [70, 70],
          iconAnchor: [35, 35]
        });
        
        const kunstwerkMarker = L.marker([kunstwerk.lat, kunstwerk.lon], {
          icon: kunstwerkIcon
        }).bindPopup(`
            <div style="text-align: center; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${kunstwerk.name}</h3>
              <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${kunstwerk.artist}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">📍 ${kunstwerk.location}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #9ca3af;">🎨 ${kunstwerk.type}</p>
              ${hasUserModel ? `<p style="margin: 8px 0; color: hsl(140, 75%, 45%); font-weight: 500;">✓ ${t('Er is een 3D model beschikbaar', 'A 3D model is available')}</p>` : ''}
              <button 
                onclick="window.openKunstwerk('${kunstwerk.id}', 'antoing')"
                style="
                  background: linear-gradient(135deg, hsl(0, 84%, 60%) 0%, hsl(0, 74%, 50%) 100%);
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 600;
                  width: 100%;
                  margin-top: 8px;
                  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
                "
                onmouseover="this.style.background='linear-gradient(135deg, hsl(0, 74%, 50%) 0%, hsl(0, 64%, 40%) 100%)'"
                onmouseout="this.style.background='linear-gradient(135deg, hsl(0, 84%, 60%) 0%, hsl(0, 74%, 50%) 100%)'"
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
      radius: 50
     }).addTo(map.current);
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialLocation, models, showViewer, discoveredModels, user, nijmegenKunstwerken, utrechtKunstwerken, alkmaartKunstwerken, denhaagKunstwerken, delftKunstwerken, dublinKunstwerken, antoingKunstwerken]);

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
      localStorage.setItem('uploadLocation', JSON.stringify({
        lat,
        lon,
        name
      }));
      window.location.href = '/upload';
    };
    (window as any).openKunstwerk = (id: string, city: 'nijmegen' | 'utrecht' | 'alkmaar' | 'denhaag' | 'delft' | 'dublin' | 'antoing' | 'drenthe') => {
      let kunstwerk: NijmegenKunstwerk | UtrechtKunstwerk | AlkmaarKunstwerk | DenHaagKunstwerk | DelftKunstwerk | DublinKunstwerk | AntoingKunstwerk | any | undefined;
      if (city === 'nijmegen') {
        kunstwerk = nijmegenKunstwerken.find(k => k.id === id);
      } else if (city === 'utrecht') {
        kunstwerk = utrechtKunstwerken.find(k => k.id === id);
      } else if (city === 'alkmaar') {
        kunstwerk = alkmaartKunstwerken.find(k => k.id === id);
      } else if (city === 'denhaag') {
        kunstwerk = denhaagKunstwerken.find(k => k.id === id);
      } else if (city === 'delft') {
        kunstwerk = delftKunstwerken.find(k => k.id === id);
      } else if (city === 'dublin') {
        kunstwerk = dublinKunstwerken.find(k => k.id === id);
      } else if (city === 'antoing') {
        kunstwerk = antoingKunstwerken.find(k => k.id === id);
      } else if (city === 'drenthe') {
        kunstwerk = drentheKunstwerken.find(k => k.id === id);
      }
      if (kunstwerk) {
        // Find matching model at this location
        const matchingModel = models.find(model => {
          if (!model.latitude || !model.longitude) return false;
          const dx = Math.abs(model.latitude - kunstwerk!.lat);
          const dy = Math.abs(model.longitude - kunstwerk!.lon);
          return dx < 0.0001 && dy < 0.0001; // ~10m tolerance
        });
        setSelectedKunstwerk({
          kunstwerk,
          city,
          model: matchingModel
        });
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('kunstwerk', `${city}-${id}`);
        window.history.pushState({}, '', url.toString());
        // Close any open popups
        if (map.current) {
          map.current.closePopup();
        }
      }
    };
    (window as any).viewKunstwerkDetails = (city: string, id: string) => {
      (window as any).openKunstwerk(id, city);
    };
    return () => {
      delete (window as any).uploadStatue;
      delete (window as any).openKunstwerk;
      delete (window as any).viewKunstwerkDetails;
    };
  }, [nijmegenKunstwerken, utrechtKunstwerken, alkmaartKunstwerken, denhaagKunstwerken, delftKunstwerken, dublinKunstwerken, antoingKunstwerken, drentheKunstwerken, models]);

  // Load kunstwerk or model from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const kunstwerkParam = urlParams.get('kunstwerk');
    const modelParam = urlParams.get('model');
    if (kunstwerkParam && !hasLoadedFromUrl.current) {
      const [city, id] = kunstwerkParam.split('-');
      if (city && id) {
        // Check if the required data is loaded
        const dataLoaded = city === 'nijmegen' && nijmegenKunstwerken.length > 0 || city === 'utrecht' && utrechtKunstwerken.length > 0 || city === 'alkmaar' && alkmaartKunstwerken.length > 0 || city === 'denhaag' && denhaagKunstwerken.length > 0 || city === 'delft' && delftKunstwerken.length > 0 || city === 'dublin' && dublinKunstwerken.length > 0 || city === 'antoing' && antoingKunstwerken.length > 0 || city === 'drenthe' && drentheKunstwerken.length > 0;
        if (dataLoaded) {
          hasLoadedFromUrl.current = true;
          // Use setTimeout to ensure the map is ready
          setTimeout(() => {
            (window as any).openKunstwerk(id, city as any);
          }, 100);
        }
      }
    }
    if (modelParam && !hasLoadedFromUrl.current && models.length > 0) {
      const model = models.find(m => m.id === modelParam);
      if (model) {
        hasLoadedFromUrl.current = true;
        setTimeout(() => {
          setSelectedModel(model);
        }, 100);
      }
    }
  }, [models, nijmegenKunstwerken, utrechtKunstwerken, alkmaartKunstwerken, denhaagKunstwerken, delftKunstwerken, dublinKunstwerken, antoingKunstwerken, drentheKunstwerken]);
  const handleSearchResultClick = (result: any) => {
    if (result.type === 'model') {
      // Open user model
      const model = models.find(m => m.id === result.id);
      if (model) {
        setSelectedModel(model);
        if (map.current && result.lat && result.lon) {
          map.current.setView([result.lat, result.lon], 16, { animate: true });
        }
      }
    } else {
      // Open municipal artwork
      (window as any).openKunstwerk(result.id, result.type);
      if (map.current && result.lat && result.lon) {
        map.current.setView([result.lat, result.lon], 16, { animate: true });
      }
    }
  };

  return <div className="relative h-screen w-full">
      {selectedKunstwerk && <KunstwerkViewer kunstwerk={selectedKunstwerk.kunstwerk} city={selectedKunstwerk.city} model={selectedKunstwerk.model} onClose={() => {
      setSelectedKunstwerk(null);
      hasLoadedFromUrl.current = false;
      // Clear URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('kunstwerk');
      window.history.pushState({}, '', url.toString());
    }} />}
      
      {showConfetti && <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} />
        </div>}
      {showPhotoViewer && selectedModel && selectedModel.photo_url ? <PhotoViewer photoUrl={selectedModel.photo_url} name={selectedModel.name} description={selectedModel.description} onClose={() => setShowPhotoViewer(false)} /> : showViewer && selectedModel ? <div className="fixed inset-0 z-30 bg-background flex flex-col">
          <div className="bg-background/98 backdrop-blur-sm border-b border-border p-3 md:p-4 flex-shrink-0 safe-area-top">
            <div className="flex items-start gap-3">
              <Button onClick={() => {
            setShowViewer(false);
            setSelectedModel(null);
            hasLoadedFromUrl.current = false;
            // Clear URL parameter
            const url = new URL(window.location.href);
            url.searchParams.delete('model');
            window.history.pushState({}, '', url.toString());
          }} variant="default" size="lg" className="shadow-[var(--shadow-elevated)] hover:shadow-[var(--shadow-glow)] transition-all shrink-0">
                ← {t('Terug', 'Back')}
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-foreground truncate">{selectedModel.name}</h2>
                {selectedModel.description && <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{selectedModel.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <p className="text-xs text-muted-foreground flex-1">👆 {t('Sleep om te roteren', 'Drag to rotate')} • 🔍 {t('Pinch om te zoomen', 'Pinch to zoom')}</p>
              {selectedModel.latitude && selectedModel.longitude && <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedModel.latitude},${selectedModel.longitude}`, '_blank')} className="gap-2 shrink-0">
                  <MapPin className="w-4 h-4" />
                  {t('Open in Google Maps', 'Open in Google Maps')}
                </Button>}
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <StandbeeldViewer modelPath={selectedModel.file_path} modelId={selectedModel.id} onClose={() => {
          setShowViewer(false);
          setSelectedModel(null);
          hasLoadedFromUrl.current = false;
          // Clear URL parameter
          const url = new URL(window.location.href);
          url.searchParams.delete('model');
          window.history.pushState({}, '', url.toString());
        }} autoRotate={true} />
          </div>
        </div> : null}

      {/* Map - always rendered */}
      <div ref={mapContainer} className="absolute inset-0 pb-16 md:pb-0 z-0" />
      
      {/* Location suggestion popup - shows when location fails on mobile */}
      {showLocationSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-primary/20">
                <Navigation className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">
                {t('Locatieproblemen?', 'Location issues?')}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t(
                'Schakel de locatie-knop in om handmatig je locatie te vernieuwen wanneer automatische detectie niet werkt.',
                'Enable the location button to manually refresh your location when automatic detection fails.'
              )}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={enableLocationButton}
                className="flex-1"
              >
                {t('Inschakelen', 'Enable')}
              </Button>
              <Button
                onClick={dismissLocationSuggestion}
                variant="outline"
                className="flex-1"
              >
                {t('Niet nu', 'Not now')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Location refresh button - only on mobile when enabled in settings */}
      {!showViewer && !selectedKunstwerk && showLocationButton && isMobile && (
        <div className="fixed bottom-20 right-4 z-20 flex flex-col gap-2">
          {locationError && (
            <div className="bg-destructive/90 text-destructive-foreground text-xs px-3 py-2 rounded-lg max-w-[250px] shadow-lg">
              {locationError}
            </div>
          )}
          <Button
            onClick={() => requestLocation(true)}
            disabled={isRequestingLocation}
            variant="secondary"
            size="icon"
            className="w-12 h-12 rounded-full shadow-lg"
            title={t('Locatie vernieuwen', 'Refresh location')}
          >
            {isRequestingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </Button>
        </div>
      )}
      
      {/* Mobile-optimized info card - only show when no kunstwerk is selected */}
      {!selectedKunstwerk}
    </div>;
};
export default MapView;