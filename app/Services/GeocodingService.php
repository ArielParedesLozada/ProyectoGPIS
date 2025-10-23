<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeocodingService
{
    /**
     * Obtiene la dirección legible a partir de coordenadas usando Nominatim
     */
    public static function reverseGeocode(float $lat, float $lng): string
    {
        try {
            // Redondear coordenadas para mayor precisión
            $roundedLat = round($lat, 6);
            $roundedLng = round($lng, 6);
            
            Log::info('Reverse geocoding request', [
                'original' => ['lat' => $lat, 'lng' => $lng],
                'rounded' => ['lat' => $roundedLat, 'lng' => $roundedLng]
            ]);
            
            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => 'Laravel-Publication-System/1.0 (Contact: admin@example.com)'
                ])
                ->get('https://nominatim.openstreetmap.org/reverse', [
                    'format' => 'json',
                    'lat' => $roundedLat,
                    'lon' => $roundedLng,
                    'zoom' => 18,
                    'addressdetails' => 1,
                    'accept-language' => 'es,en',
                    'extratags' => 1,
                    'namedetails' => 1
                ]);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['address'])) {
                    $address = $data['address'];
                    
                    // Construir dirección más precisa
                    $locationParts = [];
                    
                    // Agregar calle si está disponible
                    if (isset($address['road']) && !empty($address['road'])) {
                        $locationParts[] = $address['road'];
                    }
                    
                    // Prioridad: ciudad > pueblo > municipio > estado
                    $mainLocation = $address['city'] ?? 
                                   $address['town'] ?? 
                                   $address['village'] ?? 
                                   $address['municipality'] ?? 
                                   $address['state'] ?? 
                                   $address['county'] ?? 
                                   null;
                    
                    if ($mainLocation) {
                        $locationParts[] = $mainLocation;
                    }
                    
                    // Agregar país si está disponible
                    if (isset($address['country']) && !empty($address['country'])) {
                        $locationParts[] = $address['country'];
                    }
                    
                    $location = !empty($locationParts) ? implode(', ', $locationParts) : 'Ubicación no disponible';
                    
                    Log::info('Reverse geocoding result', [
                        'coordinates' => ['lat' => $roundedLat, 'lng' => $roundedLng],
                        'address' => $address,
                        'result' => $location
                    ]);
                    
                    return $location;
                }
            }
            
            Log::warning('Geocoding failed for coordinates', [
                'lat' => $lat,
                'lng' => $lng,
                'response' => $response->body()
            ]);
            
        } catch (\Exception $e) {
            Log::error('Geocoding service error', [
                'lat' => $lat,
                'lng' => $lng,
                'error' => $e->getMessage()
            ]);
        }
        
        return 'Ubicación no disponible';
    }
}
