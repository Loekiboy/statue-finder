import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { toast } from 'sonner';
import StandbeeldViewer from './StandbeeldViewer';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedModel, setSelectedModel] = useState<SelectedModelInfo | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const standbeeldMarkerRef = useRef<L.Marker | null>(null);
  const modelMarkersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

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
  }, []);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(coords);
          toast.success('Locatie gevonden!');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Kon locatie niet vinden. Gebruik standaard locatie.');
          // Default to Amsterdam
          setUserLocation([52.3676, 4.9041]);
        }
      );
    } else {
      toast.error('Geolocatie wordt niet ondersteund door je browser.');
      setUserLocation([52.3676, 4.9041]);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !userLocation || showViewer) return;

    // Clean up existing map if it exists
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    // Initialize map
    map.current = L.map(mapContainer.current).setView(userLocation, 13);

    // Add OpenStreetMap tile layer (completely free!)
    tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
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
          width: 50px;
          height: 50px;
          border-radius: 8px;
          background-color: white;
          border: 3px solid hsl(140, 75%, 45%);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background-image: url('/models/standbeeld_weezenhof.stl');
          background-size: cover;
          background-position: center;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(140, 75%, 45%)" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
    });

    // Add marker for user location
    userMarkerRef.current = L.marker(userLocation, { icon: userIcon })
      .addTo(map.current)
      .bindPopup('<b>Jouw Locatie</b><br>Je bent hier!')
      .openPopup();

    // Add marker for standbeeld with click handler
    standbeeldMarkerRef.current = L.marker(STANDBEELD_LOCATION, { icon: standbeeldIcon })
      .addTo(map.current)
      .bindPopup('<b>Weezenhof Standbeeld</b><br>Klik om 3D model te bekijken')
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
    models.forEach((model) => {
      if (model.latitude && model.longitude && map.current) {
        const thumbnailUrl = model.thumbnail_url;
        
        const modelIcon = L.divIcon({
          className: 'custom-marker-model',
          html: `
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 8px;
              background-color: white;
              border: 3px solid hsl(140, 75%, 45%);
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              ${thumbnailUrl ? `background-image: url('${thumbnailUrl}'); background-size: cover; background-position: center;` : ''}
            ">
              ${!thumbnailUrl ? `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(140, 75%, 45%)" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              ` : ''}
            </div>
          `,
          iconSize: [50, 50],
          iconAnchor: [25, 25],
        });

        const modelMarker = L.marker([model.latitude, model.longitude], { icon: modelIcon })
          .addTo(map.current)
          .bindPopup(`<b>${model.name}</b><br>${model.description || 'Klik om 3D model te bekijken'}`)
          .on('click', () => {
            setSelectedModel({
              name: model.name,
              description: model.description,
              file_path: model.file_path
            });
            setShowViewer(true);
          });
        
        modelMarkersRef.current.push(modelMarker);
      }
    });

    // Add circle to show accuracy for user location
    L.circle(userLocation, {
      color: 'hsl(220, 85%, 55%)',
      fillColor: 'hsl(220, 85%, 55%)',
      fillOpacity: 0.1,
      radius: 100,
    }).addTo(map.current);

    // Add right-click handler to update user location (beta test feature)
    map.current.on('contextmenu', (e: L.LeafletMouseEvent) => {
      if (!map.current || !userMarkerRef.current) return;
      
      // Update user location
      const newLocation: [number, number] = [e.latlng.lat, e.latlng.lng];
      setUserLocation(newLocation);
      
      // Update marker position
      userMarkerRef.current.setLatLng(e.latlng);
      userMarkerRef.current.bindPopup('<b>Jouw Locatie</b><br>Je bent hier!').openPopup();
      
      // Center map on new location
      map.current.setView(e.latlng, map.current.getZoom());
      
      toast.success('Locatie bijgewerkt!');
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [userLocation, models, showViewer]);

  return (
    <div className="relative h-screen w-full">
      {showViewer && selectedModel ? (
        <div className="absolute inset-0 z-50 bg-background flex flex-col">
          <div className="bg-background/95 backdrop-blur-sm border-b border-border p-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <Button 
                onClick={() => setShowViewer(false)} 
                variant="default"
                className="shadow-[var(--shadow-elevated)] hover:shadow-[var(--shadow-glow)] transition-all shrink-0"
              >
                ← Terug naar kaart
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground truncate">{selectedModel.name}</h2>
                {selectedModel.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{selectedModel.description}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Sleep om te roteren • Scroll om te zoomen</p>
          </div>
          <div className="flex-1 min-h-0">
            <StandbeeldViewer 
              modelPath={selectedModel.file_path}
              onClose={() => setShowViewer(false)} 
            />
          </div>
        </div>
      ) : (
        <>
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Info card */}
          <div className="absolute left-20 top-4 z-10 rounded-xl bg-card/95 px-4 py-3 shadow-[var(--shadow-elevated)] backdrop-blur-sm">
            <p className="text-lg font-bold text-foreground">Je Locatie</p>
            {userLocation && (
              <p className="text-xs text-muted-foreground">
                {userLocation[0].toFixed(4)}°N, {userLocation[1].toFixed(4)}°E
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              💡 Rechterklik om locatie te wijzigen
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default MapView;
