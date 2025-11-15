<?php

use App\Services\GeocodingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

