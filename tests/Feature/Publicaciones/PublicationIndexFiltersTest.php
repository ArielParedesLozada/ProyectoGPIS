<?php

use App\Models\Category;
use App\Models\Publication;
use App\Models\Purchase;
use App\Models\User;
use Clickbar\Magellan\Data\Geometries\Point;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

require_once __DIR__.'/publication-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    ensureViteEntries(['publications/publication-index']);
});

test('PUB-IF-001: Index aplica filtros combinados', function () {
    /** @var User $user */
    $user = makeUser();
    $categoryA = makeCategory();
    $categoryB = makeCategory();
    $categoryC = makeCategory();

    createPublicationFor($user, $categoryA, [
        'title' => 'Cámara deportiva 4K',
        'description' => 'Ideal para deportes extremos',
        'type' => 'producto',
        'price' => 150,
        'location_point' => Point::make(-78.60, -1.25),
        'published_at' => now()->subDays(1),
    ]);

    createPublicationFor($user, $categoryB, [
        'title' => 'Raqueta de tenis profesional',
        'description' => 'Perfecta para entrenamientos',
        'type' => 'producto',
        'price' => 180,
        'location_point' => Point::make(-78.61, -1.24),
        'published_at' => now()->subDays(2),
    ]);

    // Publicaciones que deben quedar fuera de los filtros
    createPublicationFor($user, $categoryC, [
        'title' => 'Libro de programación',
        'description' => 'No debería aparecer',
        'type' => 'producto',
        'price' => 120,
    ]);

    createPublicationFor($user, $categoryA, [
        'title' => 'Clases de yoga',
        'description' => 'Servicio fuera del rango',
        'type' => 'servicio',
        'price' => 200,
    ]);

    $response = $this->actingAs($user)->get(route('publication-index', [
        'categories' => $categoryA->id.','.$categoryB->id,
        'type' => 'producto',
        'min_price' => 100,
        'max_price' => 190,
        'search' => 'deport',
    ]));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publications.data', function ($data) {
            return count($data) === 1 && $data[0]['title'] === 'Cámara deportiva 4K';
        })
        ->where('selectedCategories', [$categoryA->id, $categoryB->id])
        ->etc()
    );
});

test('PUB-IF-002: Index filtra mis compras', function () {
    $buyer = makeUser();
    $seller = makeUser();
    $category = makeCategory();

    $purchased = createPublicationFor($seller, $category, [
        'title' => 'Bicicleta de ruta',
        'price' => 299.99,
    ]);

    $notPurchased = createPublicationFor($seller, $category, [
        'title' => 'Patines en línea',
        'price' => 120,
    ]);

    Purchase::create([
        'publication_id' => $purchased->id,
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'price' => 299.99,
        'status' => 'completed',
    ]);

    $response = $this->actingAs($buyer)->get(route('publication-index', [
        'my_products' => 'true',
    ]));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publications.data', function ($data) use ($purchased, $notPurchased) {
            $titles = collect($data)->pluck('title');
            return $titles->contains($purchased->title) && !$titles->contains($notPurchased->title);
        })
        ->etc()
    );
});

test('PUB-IF-003: Index filtra por radio geográfico', function () {
    $user = makeUser();
    $category = makeCategory();

    $inside = createPublicationFor($user, $category, [
        'title' => 'Gimnasio cercano',
        'location_point' => Point::make(-79.9000, -2.1500),
    ]);

    createPublicationFor($user, $category, [
        'title' => 'Spa lejano',
        'location_point' => Point::make(-78.0000, -0.5000),
    ]);

    $response = $this->actingAs($user)->get(route('publication-index', [
        'near_lat' => -2.1505,
        'near_lng' => -79.9005,
        'radius_km' => 5,
    ]));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publications.data', function ($data) use ($inside) {
            return count($data) === 1 && $data[0]['title'] === $inside->title;
        })
        ->etc()
    );
});

test('PUB-IF-004: Index ordena según sort_by', function () {
    $user = makeUser();
    $category = makeCategory();

    createPublicationFor($user, $category, [
        'title' => 'Producto barato',
        'price' => 50,
        'published_at' => now()->subDays(1),
    ]);

    createPublicationFor($user, $category, [
        'title' => 'Producto intermedio',
        'price' => 100,
        'published_at' => now()->subDays(2),
    ]);

    createPublicationFor($user, $category, [
        'title' => 'Producto caro',
        'price' => 500,
        'published_at' => now()->subHours(12),
    ]);

    $response = $this->actingAs($user)->get(route('publication-index', [
        'sort_by' => 'price_low',
    ]));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publications.data', function ($data) {
            $prices = collect($data)->pluck('price')->toArray();
            $sorted = $prices;
            sort($sorted);
            return $prices === $sorted;
        })
        ->etc()
    );
});

test('PUB-IF-005: Index mantiene query string en la paginación', function () {
    $user = makeUser();
    $category = makeCategory();

    Publication::factory()->count(12)->create([
        'created_by' => $user->id,
        'category_id' => $category->id,
        'type' => 'producto',
    ]);

    $response = $this->actingAs($user)->get(route('publication-index', [
        'sort_by' => 'price_high',
    ]));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publications.per_page', 9)
        ->where('publications.links', function ($links) {
            return collect($links)
                ->filter(fn ($link) => isset($link['url']))
                ->contains(fn ($link) => str_contains($link['url'], 'sort_by=price_high'));
        })
        ->etc()
    );
});

