<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeocodingService
{
    /**
     * Obtiene la dirección legible a partir de coordenadas usando Nominatim
     * Formato: <parroquia/sector>, <ciudad>, <país>
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
                    'accept-language' => 'es',
                    'extratags' => 1,
                    'namedetails' => 1
                ]);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['address'])) {
                    $address = $data['address'];
                    
                    // Extraer componentes según jerarquía
                    $sector = $address['suburb'] ?? 
                             $address['neighbourhood'] ?? 
                             $address['quarter'] ?? 
                             $address['city_district'] ?? 
                             $address['borough'] ?? 
                             $address['hamlet'] ?? 
                             null;
                    
                    $ciudad = $address['city'] ?? 
                             $address['town'] ?? 
                             $address['village'] ?? 
                             $address['municipality'] ?? 
                             null;
                    
                    $provincia = $address['state'] ?? 
                                $address['county'] ?? 
                                null;
                    
                    $pais = $address['country'] ?? null;
                    
                    // Construir ubicación según reglas de fallback
                    $locationParts = [];
                    
                    if ($sector && $ciudad && $pais) {
                        // Caso 1: sector+ciudad+país → "Ingahurco, Ambato, Ecuador"
                        $locationParts = [$sector, $ciudad, $pais];
                    } elseif ($ciudad && $pais) {
                        // Caso 2: sin sector → "Ambato, Ecuador"
                        $locationParts = [$ciudad, $pais];
                    } elseif ($provincia && $pais) {
                        // Caso 3: sin ciudad pero con provincia → "Tungurahua, Ecuador"
                        $locationParts = [$provincia, $pais];
                    } elseif ($pais) {
                        // Caso 4: solo país → "Ecuador"
                        $locationParts = [$pais];
                    }
                    
                    $location = !empty($locationParts) ? implode(', ', $locationParts) : 'Ubicación no disponible';
                    
                    Log::info('Reverse geocoding result', [
                        'coordinates' => ['lat' => $roundedLat, 'lng' => $roundedLng],
                        'components' => [
                            'sector' => $sector,
                            'ciudad' => $ciudad,
                            'provincia' => $provincia,
                            'pais' => $pais
                        ],
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
