<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
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
            // Redondear coordenadas para mayor precisión (usar 4 decimales para cache, ~11 metros de precisión)
            $roundedLat = round($lat, 4);
            $roundedLng = round($lng, 4);
            
            // Crear clave de cache basada en coordenadas redondeadas
            $cacheKey = "geocode_{$roundedLat}_{$roundedLng}";
            
            // Intentar obtener del cache primero (cache por 30 días)
            $cachedLocation = Cache::get($cacheKey);
            if ($cachedLocation !== null) {
                Log::info('Reverse geocoding from cache', [
                    'coordinates' => ['lat' => $roundedLat, 'lng' => $roundedLng],
                    'location' => $cachedLocation
                ]);
                return $cachedLocation;
            }
            
            Log::info('Reverse geocoding request', [
                'original' => ['lat' => $lat, 'lng' => $lng],
                'rounded' => ['lat' => $roundedLat, 'lng' => $roundedLng]
            ]);
            
            sleep(1);
            
            $appUrl = config('app.url', 'http://localhost');
            $contactInfo = $appUrl !== 'http://localhost' 
                ? $appUrl 
                : 'https://github.com/ArielParedesLozada/ProyectoGPIS';
            
            $userAgent = "ProyectoGPIS/1.0 (Laravel Application; +{$contactInfo})";
            
            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => $userAgent,
                    'Referer' => config('app.url', 'http://localhost'),
                    'Accept' => 'application/json',
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

            // Verificar si la respuesta indica que estamos bloqueados
            if ($response->status() === 403 || str_contains($response->body(), 'Access blocked')) {
                Log::error('Nominatim API blocked access', [
                    'lat' => $lat,
                    'lng' => $lng,
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 500) // Primeros 500 caracteres
                ]);
                // Retornar ubicación genérica basada en coordenadas si estamos bloqueados
                $fallbackLocation = self::getFallbackLocation($lat, $lng);
                // Guardar fallback en cache también para evitar peticiones repetidas
                Cache::put($cacheKey, $fallbackLocation, now()->addDays(30));
                return $fallbackLocation;
            }
            
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
                    
                    // Guardar en cache por 30 días
                    Cache::put($cacheKey, $location, now()->addDays(30));
                    
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
    
    /**
     * Obtener ubicación de fallback cuando la API está bloqueada o no disponible
     * Retorna una ubicación genérica basada en las coordenadas
     */
    private static function getFallbackLocation(float $lat, float $lng): string
    {
        // Intentar determinar el país basado en las coordenadas
        // Ecuador está aproximadamente entre lat: -4.2 a 1.5, lng: -81.0 a -75.2
        if ($lat >= -4.2 && $lat <= 1.5 && $lng >= -81.0 && $lng <= -75.2) {
            // Determinar provincia aproximada
            if ($lat >= -1.0 && $lat <= 0.5 && $lng >= -79.0 && $lng <= -78.0) {
                return 'Quito, Pichincha, Ecuador';
            } elseif ($lat >= -2.0 && $lat <= -1.0 && $lng >= -79.0 && $lng <= -78.0) {
                return 'Ambato, Tungurahua, Ecuador';
            } elseif ($lat >= -3.0 && $lat <= -2.0 && $lng >= -80.0 && $lng <= -79.0) {
                return 'Guayaquil, Guayas, Ecuador';
            }
            return 'Ecuador';
        }
        
        return 'Ubicación no disponible';
    }
}
