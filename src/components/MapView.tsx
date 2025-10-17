import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import StandbeeldViewer from './StandbeeldViewer';
import PhotoViewer from './PhotoViewer';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { isOnWiFi, cacheMapTiles, cacheNearbyModels, clearOldCaches } from '@/lib/cacheManager';

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

// Locatie van het Weezenhof standbeeld in Gouda (voorbeeld coördinaten)
const STANDBEELD_LOCATION: [number, number] = [52.0116, 4.7105];

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
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [user, setUser] = useState<any>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const standbeeldMarkerRef = useRef<L.Marker | null>(null);
  const modelMarkersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);


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

    // Create custom icon for standbeeld (with placeholder thumbnail)
    const standbeeldIcon = L.divIcon({
      className: 'custom-marker-standbeeld',
      html: `
        <div style="
          width: 80px;
          height: 80px;
          border-radius: 12px;
          background-color: white;
          border: 4px solid hsl(140, 75%, 45%);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background-image: url('/models/standbeeld_weezenhof.stl');
          background-size: cover;
          background-position: center;
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="hsl(140, 75%, 45%)" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
      `,
      iconSize: [80, 80],
      iconAnchor: [40, 40],
    });

    // Add marker for user location
    userMarkerRef.current = L.marker(initialLocation, { icon: userIcon })
      .addTo(map.current);

    // Add marker for standbeeld with click handler
    standbeeldMarkerRef.current = L.marker(STANDBEELD_LOCATION, { icon: standbeeldIcon })
      .addTo(map.current)
      .bindPopup(`<b>Weezenhof Standbeeld</b><br>${t('Klik om 3D model te bekijken', 'Click to view 3D model')}`)
      .on('click', () => {
        setSelectedModel({
          name: 'Weezenhof Standbeeld',
          description: 'Historisch standbeeld in Gouda',
          file_path: '/models/standbeeld_weezenhof.stl'
        });
        setShowViewer(true);
      });

    // Clear old model markers
    modelMarkersRef.current = [];

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
          .addTo(map.current)
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
        
        modelMarkersRef.current.push(modelMarker);
      }
    });

    // Add circle to show accuracy for user location (smaller for mobile)
    accuracyCircleRef.current = L.circle(initialLocation, {
      color: 'hsl(220, 85%, 55%)',
      fillColor: 'hsl(220, 85%, 55%)',
      fillOpacity: 0.1,
      radius: 50,
    }).addTo(map.current);

    // Add right-click handler to update user location (beta test feature)
    map.current.on('contextmenu', (e: L.LeafletMouseEvent) => {
      if (!map.current || !userMarkerRef.current) return;
      
      // Update user location
      const newLocation: [number, number] = [e.latlng.lat, e.latlng.lng];
      setUserLocation(newLocation);
      
      // Update marker position
      userMarkerRef.current.setLatLng(e.latlng);
      
      // Center map on new location
      map.current.setView(e.latlng, map.current.getZoom());
      
      toast.success(t('Locatie bijgewerkt!', 'Location updated!'));
    });

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

  return (
    <div className="relative h-screen w-full">
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
