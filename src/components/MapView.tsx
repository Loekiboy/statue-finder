import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';

const MapView = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          setUserLocation(coords);
          toast.success('Locatie gevonden!');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Kon locatie niet vinden. Gebruik standaard locatie.');
          // Default to Amsterdam
          setUserLocation([4.9041, 52.3676]);
        }
      );
    } else {
      toast.error('Geolocatie wordt niet ondersteund door je browser.');
      setUserLocation([4.9041, 52.3676]);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !userLocation || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: userLocation,
      zoom: 15,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add custom marker for user location
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = 'hsl(195 85% 45%)';
    el.style.border = '4px solid white';
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    el.style.cursor = 'pointer';

    markerRef.current = new mapboxgl.Marker(el)
      .setLngLat(userLocation)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          '<h3 style="margin:0;font-weight:bold;">Jouw Locatie</h3><p style="margin:4px 0 0 0;">Je bent hier!</p>'
        )
      )
      .addTo(map.current);

    return () => {
      map.current?.remove();
    };
  }, [userLocation, mapboxToken]);

  if (!mapboxToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-[var(--shadow-elevated)]">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
            Mapbox Token Vereist
          </h2>
          <p className="mb-6 text-center text-muted-foreground">
            Voer je Mapbox public token in om de kaart te laden
          </p>
          <input
            type="text"
            placeholder="pk.eyJ1..."
            className="mb-4 w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={(e) => setMapboxToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Haal je token op van{' '}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Mapbox Dashboard
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      <div ref={mapContainer} className="absolute inset-0" />
      {userLocation && (
        <div className="absolute left-4 top-4 rounded-xl bg-card/95 px-4 py-3 shadow-[var(--shadow-elevated)] backdrop-blur-sm">
          <p className="text-sm font-semibold text-foreground">Jouw Locatie</p>
          <p className="text-xs text-muted-foreground">
            {userLocation[1].toFixed(4)}°N, {userLocation[0].toFixed(4)}°E
          </p>
        </div>
      )}
    </div>
  );
};

export default MapView;
