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
            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => 'Laravel-Publication-System/1.0 (Contact: admin@example.com)'
                ])
                ->get('https://nominatim.openstreetmap.org/reverse', [
                    'format' => 'json',
                    'lat' => $lat,
                    'lon' => $lng,
                    'zoom' => 18,
                    'addressdetails' => 1,
                    'accept-language' => 'es,en'
                ]);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['address'])) {
                    $address = $data['address'];
                    
                    // Prioridad: ciudad > pueblo > municipio > estado
                    $location = $address['city'] ?? 
                               $address['town'] ?? 
                               $address['village'] ?? 
                               $address['municipality'] ?? 
                               $address['state'] ?? 
                               $address['county'] ?? 
                               $address['country'] ?? 
                               'Ubicación no disponible';
                    
                    // Agregar país si está disponible y no es el mismo que la ubicación
                    if (isset($address['country']) && $address['country'] !== $location) {
                        $location .= ', ' . $address['country'];
                    }
                    
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
