import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { toast } from 'sonner';
import StandbeeldViewer from './StandbeeldViewer';

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
  const userMarkerRef = useRef<L.Marker | null>(null);
  const standbeeldMarkerRef = useRef<L.Marker | null>(null);

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
    map.current = L.map(mapContainer.current).setView(userLocation, 13);

    // Add OpenStreetMap tile layer (completely free!)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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

    // Create custom icon for standbeeld (green)
    const standbeeldIcon = L.divIcon({
      className: 'custom-marker-standbeeld',
      html: `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: hsl(140, 75%, 45%);
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 20px;
            height: 20px;
            color: white;
            font-weight: bold;
            font-size: 16px;
          ">S</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Add marker for user location
    userMarkerRef.current = L.marker(userLocation, { icon: userIcon })
      .addTo(map.current)
      .bindPopup('<b>Jouw Locatie</b><br>Je bent hier!')
      .openPopup();

    // Add marker for standbeeld
    standbeeldMarkerRef.current = L.marker(STANDBEELD_LOCATION, { icon: standbeeldIcon })
      .addTo(map.current)
      .bindPopup('<b>Weezenhof Standbeeld</b><br>3D model zichtbaar rechtsonder');

    // Add circle to show accuracy for user location
    L.circle(userLocation, {
      color: 'hsl(220, 85%, 55%)',
      fillColor: 'hsl(220, 85%, 55%)',
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
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Info card */}
      <div className="absolute left-20 top-4 z-10 rounded-xl bg-card/95 px-4 py-3 shadow-[var(--shadow-elevated)] backdrop-blur-sm">
        <p className="text-lg font-bold text-foreground">Je Locatie</p>
        {userLocation && (
          <p className="text-xs text-muted-foreground">
            {userLocation[0].toFixed(4)}°N, {userLocation[1].toFixed(4)}°E
          </p>
        )}
      </div>

      {/* 3D Model overlay at standbeeld location */}
      <div className="absolute right-4 bottom-4 z-10 h-80 w-80 rounded-xl bg-card shadow-2xl overflow-hidden border-2 border-border">
        <div className="h-full w-full">
          <StandbeeldViewer onClose={() => {}} />
        </div>
      </div>
    </div>
  );
};

export default MapView;
