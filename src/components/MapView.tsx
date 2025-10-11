import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

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
    if (!mapContainer.current || !userLocation || map.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current).setView(userLocation, 15);

    // Add OpenStreetMap tile layer (completely free!)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Create custom marker icon
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: hsl(195, 85%, 45%);
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

    // Add marker with popup
    markerRef.current = L.marker(userLocation, { icon: customIcon })
      .addTo(map.current)
      .bindPopup('<b>Jouw Locatie</b><br>Je bent hier!')
      .openPopup();

    // Add circle to show accuracy
    L.circle(userLocation, {
      color: 'hsl(195, 85%, 45%)',
      fillColor: 'hsl(195, 85%, 45%)',
      fillOpacity: 0.1,
      radius: 100,
    }).addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [userLocation]);

  return (
    <div className="relative h-screen w-full">
      <div ref={mapContainer} className="absolute inset-0 z-0" />
      {userLocation && (
        <div className="absolute left-4 top-20 z-10 rounded-xl bg-card/95 px-4 py-3 shadow-[var(--shadow-elevated)] backdrop-blur-sm">
          <p className="text-sm font-semibold text-foreground">Jouw Locatie</p>
          <p className="text-xs text-muted-foreground">
            {userLocation[0].toFixed(4)}°N, {userLocation[1].toFixed(4)}°E
          </p>
        </div>
      )}
    </div>
  );
};

export default MapView;
