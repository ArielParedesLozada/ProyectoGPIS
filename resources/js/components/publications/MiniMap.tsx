import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MiniMapProps {
  lat: number;
  lng: number;
  location?: string;
  className?: string;
}

const MiniMap: React.FC<MiniMapProps> = ({ 
  lat, 
  lng, 
  location,
  className = "h-48 w-full" 
}) => {
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
    }
  }, [lat, lng]);

  return (
    <div className="space-y-2">
      {location && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Ubicación:</strong> {location}
        </div>
      )}
      
      <div className={`${className} rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden`}>
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          className="h-full w-full"
          ref={mapRef}
          zoomControl={false}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} />
        </MapContainer>
      </div>
    </div>
  );
};

export default MiniMap;
