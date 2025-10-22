import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapPickerProps {
  lat?: number;
  lng?: number;
  onLocationChange: (lat: number, lng: number) => void;
  className?: string;
}

const MapEvents: React.FC<{ onLocationChange: (lat: number, lng: number) => void }> = ({ onLocationChange }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
    },
  });
  return null;
};


const MapPicker: React.FC<MapPickerProps> = ({ 
  lat = -0.2299, 
  lng = -78.5249, 
  onLocationChange, 
  className = "h-64 w-full" 
}) => {
  const [position, setPosition] = useState<[number, number]>([lat, lng]);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<L.Map>(null);

  // Actualizar posición cuando cambien las coordenadas del backend
  useEffect(() => {
    if (lat !== undefined && lng !== undefined && lat !== 0 && lng !== 0) {
      setPosition([lat, lng]);
      // Centrar el mapa cuando cambien las coordenadas
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 13);
      }
    }
  }, [lat, lng]);

  const handleLocationChange = (newLat: number, newLng: number) => {
    setPosition([newLat, newLng]);
    onLocationChange(newLat, newLng);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no está soportada por este navegador.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleLocationChange(latitude, longitude);
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 15);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación actual.');
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutos
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ubicación en el mapa
        </label>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Obteniendo...
            </>
          ) : (
            <>
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Usar mi ubicación
            </>
          )}
        </button>
      </div>
      
      <div className={`${className} rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden`}>
        <MapContainer
          center={position}
          zoom={13}
          className="h-full w-full"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} />
          <MapEvents onLocationChange={handleLocationChange} />
        </MapContainer>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Haz clic en el mapa para seleccionar una ubicación o usa el botón para obtener tu ubicación actual.
      </div>
    </div>
  );
};

export default MapPicker;
