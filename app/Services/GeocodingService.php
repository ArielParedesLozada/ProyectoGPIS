<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeocodingService
{
    public static function reverseGeocode(float $lat, float $lng): string
    {
        try {
            $roundedLat = round($lat, 4);
            $roundedLng = round($lng, 4);
            
            $cacheKey = "geocode_{$roundedLat}_{$roundedLng}";
            
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

            if ($response->status() === 403 || str_contains($response->body(), 'Access blocked')) {
                Log::error('Nominatim API blocked access', [
                    'lat' => $lat,
                    'lng' => $lng,
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 500)
                ]);
                $fallbackLocation = self::getFallbackLocation($lat, $lng);
                Cache::put($cacheKey, $fallbackLocation, now()->addDays(30));
                return $fallbackLocation;
            }
            
            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['address'])) {
                    $address = $data['address'];
                    
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
                    
                    $locationParts = [];
                    
                    if ($sector && $ciudad && $pais) {
                        $locationParts = [$sector, $ciudad, $pais];
                    } elseif ($ciudad && $pais) {
                        $locationParts = [$ciudad, $pais];
                    } elseif ($provincia && $pais) {
                        $locationParts = [$provincia, $pais];
                    } elseif ($pais) {
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
    
    private static function getFallbackLocation(float $lat, float $lng): string
    {
        if ($lat >= -4.2 && $lat <= 1.5 && $lng >= -81.0 && $lng <= -75.2) {
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
