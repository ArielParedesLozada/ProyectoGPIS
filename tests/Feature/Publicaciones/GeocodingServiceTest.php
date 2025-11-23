<?php

use App\Services\GeocodingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

test('GEO-001: reverseGeocode retorna sector+ciudad+país cuando todos están presentes', function () {
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response([
            'address' => [
                'suburb' => 'Ingahurco',
                'city' => 'Ambato',
                'country' => 'Ecuador',
            ],
        ], 200),
    ]);

    \Illuminate\Support\Facades\Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);

    $result = GeocodingService::reverseGeocode(-1.2417, -78.6197);

    expect($result)->toBe('Ingahurco, Ambato, Ecuador');
});

test('GEO-002: reverseGeocode usa municipality cuando no hay city, town ni village', function () {
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response([
            'address' => [
                'municipality' => 'Municipio Test',
                'country' => 'Ecuador',
            ],
        ], 200),
    ]);

    \Illuminate\Support\Facades\Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);

    $result = GeocodingService::reverseGeocode(-0.18, -78.47);

    expect($result)->toBe('Municipio Test, Ecuador');
});

test('GEO-003: reverseGeocode retorna provincia+país cuando no hay ciudad', function () {
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response([
            'address' => [
                'state' => 'Tungurahua',
                'country' => 'Ecuador',
            ],
        ], 200),
    ]);

    \Illuminate\Support\Facades\Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);

    $result = GeocodingService::reverseGeocode(-1.24, -78.62);

    expect($result)->toBe('Tungurahua, Ecuador');
});

test('GEO-004: reverseGeocode retorna solo país cuando no hay ciudad ni provincia', function () {
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response([
            'address' => [
                'country' => 'Ecuador',
            ],
        ], 200),
    ]);

    \Illuminate\Support\Facades\Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);

    $result = GeocodingService::reverseGeocode(-0.18, -78.47);

    expect($result)->toBe('Ecuador');
});

test('GEO-005: reverseGeocode maneja excepciones correctamente', function () {
    Http::fake(function () {
        throw new \Exception('Network timeout');
    });

    \Illuminate\Support\Facades\Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);

    $logErrorCalled = false;
    $logErrorMessage = '';

    \Illuminate\Support\Facades\Log::shouldReceive('error')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) use (&$logErrorCalled, &$logErrorMessage) {
            if (str_contains($message, 'Geocoding service error')) {
                $logErrorCalled = true;
                $logErrorMessage = $message;
                expect($message)->toContain('Geocoding service error');
                expect($context)->toHaveKey('error');
                expect($context['error'])->toContain('Network timeout');
            }
            return true;
        });

    $result = GeocodingService::reverseGeocode(-0.18, -78.47);

    expect($result)->toBe('Ubicación no disponible');
    expect($logErrorCalled)->toBeTrue();
    expect($logErrorMessage)->toContain('Geocoding service error');
});

test('GEO-006: reverseGeocode retorna valor desde cache cuando existe', function () {
    Cache::flush();
    
    $lat = -1.2417;
    $lng = -78.6197;
    $roundedLat = round($lat, 4);
    $roundedLng = round($lng, 4);
    $cacheKey = "geocode_{$roundedLat}_{$roundedLng}";
    $cachedValue = 'Ubicación desde cache, Test, Ecuador';
    
    Cache::put($cacheKey, $cachedValue, now()->addDays(30));
    
    expect(Cache::get($cacheKey))->toBe($cachedValue);
    
    $logInfoCalled = false;
    $logInfoMessage = '';
    $logInfoContext = [];
    
    Log::shouldReceive('info')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) use (&$logInfoCalled, &$logInfoMessage, &$logInfoContext, $cachedValue) {
            if (str_contains($message, 'Reverse geocoding from cache')) {
                $logInfoCalled = true;
                $logInfoMessage = $message;
                $logInfoContext = $context;
                expect($message)->toContain('Reverse geocoding from cache');
                expect($context)->toHaveKey('coordinates');
                expect($context)->toHaveKey('location');
                expect($context['location'])->toBe($cachedValue);
            }
            return true;
        });
    
    Log::shouldReceive('error')
        ->byDefault()
        ->andReturn(true);
    
    Log::shouldReceive('warning')
        ->byDefault()
        ->andReturn(true);
    
    $result = GeocodingService::reverseGeocode($lat, $lng);
    
    expect($result)->toBe($cachedValue);
    expect($logInfoCalled)->toBeTrue();
    expect($logInfoMessage)->toContain('Reverse geocoding from cache');
});

test('GEO-007: reverseGeocode usa fallback cuando API retorna 403', function () {
    Cache::flush();
    
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response('Forbidden', 403),
    ]);
    
    $logInfoCalled = false;
    $logErrorCalled = false;
    $logErrorContext = [];
    
    Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);
    
    Log::shouldReceive('error')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) use (&$logErrorCalled, &$logErrorContext) {
            if (str_contains($message, 'Nominatim API blocked access')) {
                $logErrorCalled = true;
                $logErrorContext = $context;
                expect($message)->toContain('Nominatim API blocked access');
                expect($context)->toHaveKey('status');
                expect($context['status'])->toBe(403);
            }
            return true;
        });
    
    $result = GeocodingService::reverseGeocode(-0.2299, -78.5249);
    
    expect($result)->toBe('Quito, Pichincha, Ecuador');
    expect($logErrorCalled)->toBeTrue();
    
    $roundedLat = round(-0.2299, 4);
    $roundedLng = round(-78.5249, 4);
    $cacheKey = "geocode_{$roundedLat}_{$roundedLng}";
    expect(Cache::get($cacheKey))->toBe('Quito, Pichincha, Ecuador');
});

test('GEO-008: reverseGeocode usa fallback cuando API retorna "Access blocked"', function () {
    Cache::flush();
    
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response('Access blocked by Nominatim', 200),
    ]);
    
    $logInfoCalled = false;
    $logErrorCalled = false;
    
    Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);
    
    Log::shouldReceive('error')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) use (&$logErrorCalled) {
            if (str_contains($message, 'Nominatim API blocked access')) {
                $logErrorCalled = true;
                expect($message)->toContain('Nominatim API blocked access');
            }
            return true;
        });
    
    $result = GeocodingService::reverseGeocode(-1.2417, -78.6197);
    
    expect($result)->toBe('Ambato, Tungurahua, Ecuador');
    expect($logErrorCalled)->toBeTrue();
});

test('GEO-009: getFallbackLocation retorna Quito para coordenadas de Quito', function () {
    Cache::flush();
    
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response('Access blocked', 403),
    ]);
    
    Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);
    
    Log::shouldReceive('error')
        ->byDefault()
        ->andReturn(true);
    
    $result = GeocodingService::reverseGeocode(-0.18, -78.5);
    
    expect($result)->toBe('Quito, Pichincha, Ecuador');
});

test('GEO-010: getFallbackLocation retorna Ambato para coordenadas de Ambato', function () {
    Cache::flush();
    
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response('Access blocked', 403),
    ]);
    
    Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);
    
    Log::shouldReceive('error')
        ->byDefault()
        ->andReturn(true);
    
    $result = GeocodingService::reverseGeocode(-1.5, -78.5);
    
    expect($result)->toBe('Ambato, Tungurahua, Ecuador');
});

test('GEO-011: getFallbackLocation retorna Guayaquil para coordenadas de Guayaquil', function () {
    Cache::flush();
    
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response('Access blocked', 403),
    ]);
    
    Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);
    
    Log::shouldReceive('error')
        ->byDefault()
        ->andReturn(true);
    
    $result = GeocodingService::reverseGeocode(-2.5, -79.5);
    
    expect($result)->toBe('Guayaquil, Guayas, Ecuador');
});

test('GEO-012: getFallbackLocation retorna Ecuador genérico para coordenadas dentro de Ecuador pero fuera de ciudades específicas', function () {
    Cache::flush();
    
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response('Access blocked', 403),
    ]);
    
    Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);
    
    Log::shouldReceive('error')
        ->byDefault()
        ->andReturn(true);
    
    $result = GeocodingService::reverseGeocode(-3.5, -77.0);
    
    expect($result)->toBe('Ecuador');
});

test('GEO-013: getFallbackLocation retorna "Ubicación no disponible" para coordenadas fuera de Ecuador', function () {
    Cache::flush();
    
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response('Access blocked', 403),
    ]);
    
    Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);
    
    Log::shouldReceive('error')
        ->byDefault()
        ->andReturn(true);
    
    $result = GeocodingService::reverseGeocode(4.5, -74.0);
    
    expect($result)->toBe('Ubicación no disponible');
});

test('GEO-014: reverseGeocode usa URL de GitHub cuando app.url es localhost', function () {
    Cache::flush();
    
    Config::set('app.url', 'http://localhost');
    
    Http::fake([
        'nominatim.openstreetmap.org/reverse*' => Http::response([
            'address' => [
                'city' => 'Test City',
                'country' => 'Ecuador',
            ],
        ], 200),
    ]);
    Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);
    
    Log::shouldReceive('error')
        ->byDefault()
        ->andReturn(true);
    
    Log::shouldReceive('warning')
        ->byDefault()
        ->andReturn(true);
    
    $result = GeocodingService::reverseGeocode(-0.18, -78.47);
    
    Http::assertSent(function ($request) {
        $userAgent = $request->header('User-Agent')[0] ?? '';
        return str_contains($userAgent, 'https://github.com/ArielParedesLozada/ProyectoGPIS');
    });
    
    expect($result)->toBe('Test City, Ecuador');
    
    Config::set('app.url', config('app.url'));
});

