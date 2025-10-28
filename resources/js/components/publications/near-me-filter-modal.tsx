import React, { useState, useEffect, useRef } from 'react';
import { MapContainer } from 'react-leaflet/MapContainer';
import { TileLayer } from 'react-leaflet/TileLayer';
import { Circle } from 'react-leaflet/Circle';
import { Marker } from 'react-leaflet/Marker';
import { useMap } from 'react-leaflet/hooks';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import GeneralModal from '@/components/ui/general-modal';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface NearMeFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (lat: number, lng: number, radius: number) => void;
  currentLat?: number;
  currentLng?: number;
  currentRadius?: number;
}

const FitCircle: React.FC<{
  center: [number, number];
  radiusKm: number;
}> = ({ center, radiusKm }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !center || radiusKm <= 0) return;

    const bounds = (L as any).latLng(center[0], center[1]).toBounds(radiusKm * 1000);

    (map as any).fitBounds(bounds, {
      padding: [40, 40],
      animate: true,
      duration: 0.5,
      maxZoom: 15,   
    });
  }, [map, center, radiusKm]);

  return null;
};

export default function NearMeFilterModal({
  isOpen,
  onClose,
  onApply,
  currentLat,
  currentLng,
  currentRadius = 10
}: NearMeFilterModalProps) {
  const [position, setPosition] = useState<[number, number]>([-0.2299, -78.5249]); // Ambato por defecto
  const [radius, setRadius] = useState(currentRadius);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (isOpen && !locationDetected) {
      getCurrentLocation();
    }
  }, [isOpen, locationDetected]);

  useEffect(() => {
    if (currentLat && currentLng) {
      setPosition([currentLat, currentLng]);
      setLocationDetected(true);
    }
  }, [currentLat, currentLng]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no está soportada por este navegador.');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const roundedLat = Math.round(latitude * 1000000) / 1000000;
        const roundedLng = Math.round(longitude * 1000000) / 1000000;
        
        setPosition([roundedLat, roundedLng]);
        setLocationDetected(true);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación actual. Usando ubicación por defecto.');
        setPosition([-0.2299, -78.5249]); 
        setLocationDetected(true);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, 
        maximumAge: 0, 
      }
    );
  };

  const handleApply = () => {
    onApply(position[0], position[1], radius);
    onClose();
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
  };

  return (
    <GeneralModal
      isOpen={isOpen}
      onClose={onClose}
      title="Buscar cerca de mí"
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Controles superiores */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">
              {locationDetected ? 'Tu ubicación actual' : 'Detectando ubicación...'}
            </span>
          </div>
          <Button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isGettingLocation ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                Detectando...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4" />
                Actualizar ubicación
              </>
            )}
          </Button>
        </div>

        {/* Mapa */}
        <div className="h-96 w-full rounded-lg border border-gray-300 overflow-hidden">
          <MapContainer
            center={position}
            zoom={13}
            className="h-full w-full"
            dragging={false}
            touchZoom={false}
            doubleClickZoom={false}
            scrollWheelZoom={false}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position} />
            <Circle
              center={position}
              {...({ radius: radius * 1000 } as any)} 
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6', 
                fillOpacity: 0.2, 
                weight: 2, 
              }}
            />
            <FitCircle center={position} radiusKm={radius} />
          </MapContainer>
        </div>

        {/* Control de radio */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Radio de búsqueda
            </label>
            <span className="text-sm font-semibold text-blue-600">
              {radius} km
            </span>
          </div>
          
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="50"
              value={radius}
              onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((radius - 1) / 49) * 100}%, #E5E7EB ${((radius - 1) / 49) * 100}%, #E5E7EB 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>
          
          <p className="text-xs text-gray-500">
            Mostrando publicaciones dentro de {radius} km de tu ubicación actual
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={!locationDetected}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            Aplicar filtro
          </Button>
        </div>
      </div>
    </GeneralModal>
  );
}