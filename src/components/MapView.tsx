import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import StandbeeldViewer from './StandbeeldViewer';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogOverlay } from './ui/alert-dialog';
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
}

interface SelectedModelInfo {
  name: string;
  description: string | null;
  file_path: string;
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
  const [showViewer, setShowViewer] = useState(false);
  const [selectedModel, setSelectedModel] = useState<SelectedModelInfo | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [user, setUser] = useState<any>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const standbeeldMarkerRef = useRef<L.Marker | null>(null);
  const modelMarkersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);


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

  // Initialize with default location first
  useEffect(() => {
    setUserLocation([52.3676, 4.9041]); // Default Amsterdam location
    // Show location permission dialog
    setTimeout(() => setShowLocationDialog(true), 500);
  }, []);

  // Handle location permission
  const handleLocationPermission = (granted: boolean) => {
    setShowLocationDialog(false);
    
    if (!granted) {
      toast.info(t('Je kunt de kaart bekijken met standaard locatie', 'You can view the map with default location'));
      return;
    }

    if (!navigator.geolocation) {
      toast.error(t('Geolocatie wordt niet ondersteund door je browser.', 'Geolocation is not supported by your browser.'));
      return;
    }

    // Get current position and start watching
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(coords);
        toast.success(t('Locatie gevonden!', 'Location found!'));

        // Start watching for updates
        geoWatchIdRef.current = navigator.geolocation.watchPosition(
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
            timeout: 27000,
            maximumAge: 5000
          }
        );
      },
      (error) => {
        console.error('Geolocation error:', error.code, error.message);
        let errorMessage = t('Kon locatie niet vinden.', 'Could not find location.');
        
        if (error.code === 1) {
          errorMessage = t('Locatie toegang geweigerd.', 'Location access denied.');
        } else if (error.code === 2) {
          errorMessage = t('Locatie niet beschikbaar.', 'Location unavailable.');
        } else if (error.code === 3) {
          errorMessage = t('Locatie timeout.', 'Location timeout.');
        }
        
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 27000,
        maximumAge: 5000
      }
    );
  };

  // Cleanup geolocation watcher on unmount
  useEffect(() => {
    return () => {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
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

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || !userLocation || showViewer) return;

    // Initialize map with high zoom for Pokémon Go style
    map.current = L.map(mapContainer.current).setView(userLocation, 18);
    

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
    userMarkerRef.current = L.marker(userLocation, { icon: userIcon })
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

    // Model markers are handled in a separate effect to avoid map re-creation


    // Add circle to show accuracy for user location (smaller for mobile)
    accuracyCircleRef.current = L.circle(userLocation, {
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
  }, [showViewer]);

  // Sync model markers without recreating the map
  useEffect(() => {
    if (!map.current || showViewer) return;

    // Remove existing model markers
    modelMarkersRef.current.forEach((m) => m.remove());
    modelMarkersRef.current = [];

    const DISCOVERY_RADIUS = 50; // meters - discovery range

    models.forEach((model) => {
      if (model.latitude && model.longitude && map.current) {
        // Calculate distance between user and model if we have user location
        const modelLatLng = L.latLng(model.latitude, model.longitude);
        const userLatLng = userLocation ? L.latLng(userLocation) : null;
        const distance = userLatLng ? userLatLng.distanceTo(modelLatLng) : Infinity;

        const isAlreadyDiscovered = discoveredModels.includes(model.id);
        const isWithinRange = distance <= DISCOVERY_RADIUS;
        const isDiscovered = isAlreadyDiscovered || isWithinRange;
        const thumbnailUrl = model.thumbnail_url;

        const borderColor = isDiscovered ? 'hsl(140, 75%, 45%)' : 'hsl(0, 0%, 60%)';
        const strokeColor = borderColor;
        const grayscale = !isDiscovered ? 'filter: grayscale(100%) opacity(0.5);' : '';
        const bgImage = thumbnailUrl && isDiscovered ? `background-image: url('${thumbnailUrl}'); background-size: cover; background-position: center;` : '';

        const modelIcon = L.divIcon({
          className: 'custom-marker-model',
          html: `
            <div style="
              width: 80px;
              height: 80px;
              border-radius: 12px;
              background-color: white;
              border: 4px solid ${borderColor};
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              ${bgImage}
              ${grayscale}
            ">
              ${!thumbnailUrl || !isDiscovered ? `
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2">
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
          .addTo(map.current!)
          .bindPopup(`<b>${model.name}</b><br>${isDiscovered ? (model.description || t('Klik om 3D model te bekijken', 'Click to view 3D model')) : `🔒 ${t('Kom binnen', 'Come within')} ${isFinite(distance) ? Math.round(distance) : '?'}m ${t('om te ontdekken', 'to discover')}`}`)
          .on('click', async () => {
            if (isDiscovered) {
              if (!isAlreadyDiscovered && isWithinRange && user) {
                await markModelAsDiscovered(model.id);
                toast.success(`${model.name} ${t('gevonden! 🎉', 'found! 🎉')}`);
              }
              setSelectedModel({
                name: model.name,
                description: model.description,
                file_path: model.file_path
              });
              setShowViewer(true);
            } else if (isFinite(distance)) {
              toast.error(`${t('Je bent nog', 'You are still')} ${Math.round(distance)}m ${t('verwijderd van dit model', 'away from this model')}`);
            } else {
              toast.error(t('Wacht op je locatie…', 'Waiting for your location…'));
            }
          });

        modelMarkersRef.current.push(modelMarker);
      }
    });
  }, [models, discoveredModels, userLocation, user, showViewer]);

  // Update user marker position smoothly when location changes
  useEffect(() => {
    if (!map.current || !userLocation) return;

    // Update user marker position smoothly
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLocation);
    }

    // Update accuracy circle position
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(userLocation);
    }

    // Smoothly pan map to new location
    map.current.panTo(userLocation, {
      animate: true,
      duration: 0.5,
      easeLinearity: 0.25
    });
  }, [userLocation]);

  return (
    <div className="relative h-screen w-full">
      <AlertDialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <AlertDialogOverlay className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm" />
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Locatie toestemming', 'Location Permission')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'Deze app gebruikt je locatie om 3D modellen in je omgeving te vinden. Wil je locatie toegang toestaan?',
                'This app uses your location to find 3D models in your area. Do you want to allow location access?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleLocationPermission(false)}>
              {t('Niet nu', 'Not now')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleLocationPermission(true)}>
              {t('Toestaan', 'Allow')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
      {showViewer && selectedModel ? (
        <div className="fixed inset-0 z-30 bg-background flex flex-col">
          <div className="bg-background/98 backdrop-blur-sm border-b border-border p-3 md:p-4 flex-shrink-0 safe-area-top">
            <div className="flex items-start gap-3">
              <Button 
                onClick={() => setShowViewer(false)} 
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
