<?php

use App\Models\Category;
use App\Models\Favorite;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

require_once __DIR__.'/publication-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    ensureViteEntries(['publications/favorites']);
});

test('PUB-FAV-001: Lista de favoritos incluye publicaciones transformadas', function () {
    $user = makeUser();
    $seller = makeUser();
    $category = makeCategory();

    $first = createPublicationFor($seller, $category, [
        'title' => 'Monitor UltraWide',
        'type' => 'producto',
    ]);

    $second = createPublicationFor($seller, $category, [
        'title' => 'Servicio de reparación',
        'type' => 'servicio',
    ]);

    Favorite::create(['user_id' => $user->id, 'publication_id' => $first->id]);
    Favorite::create(['user_id' => $user->id, 'publication_id' => $second->id]);

    $response = $this->actingAs($user)->get(route('favorites'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('favorites.data', function ($data) use ($first, $second) {
            $titles = collect($data)->pluck('title');
            return $titles->contains($first->title) && $titles->contains($second->title);
        })
        ->where('categories', fn ($categories) => count($categories) > 0)
        ->etc()
    );
});

test('PUB-FAV-002: Agrega publicación a favoritos', function () {
    $user = makeUser();
    $seller = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($seller, $category);

    $response = $this->actingAs($user)->post(route('favorites.add', $publication->id));

    $response->assertRedirect();
    $this->assertDatabaseHas('favorites', [
        'user_id' => $user->id,
        'publication_id' => $publication->id,
    ]);
});

test('PUB-FAV-003: Evita duplicados al agregar favoritos', function () {
    $user = makeUser();
    $seller = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($seller, $category);

    Favorite::create(['user_id' => $user->id, 'publication_id' => $publication->id]);

    $response = $this->actingAs($user)->post(route('favorites.add', $publication->id));

    $response->assertRedirect();
    $response->assertSessionHas('error', 'Ya está en favoritos');
    $this->assertDatabaseCount('favorites', 1);
});

test('PUB-FAV-004: Elimina publicación de favoritos', function () {
    $user = makeUser();
    $seller = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($seller, $category);

    Favorite::create(['user_id' => $user->id, 'publication_id' => $publication->id]);

    $response = $this->actingAs($user)->delete(route('favorites.remove', $publication->id));

    $response->assertRedirect();
    $this->assertDatabaseMissing('favorites', [
        'user_id' => $user->id,
        'publication_id' => $publication->id,
    ]);
});

test('PUB-FAV-005: Eliminar favorito inexistente genera error', function () {
    $user = makeUser();
    $seller = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($seller, $category);

    $response = $this->actingAs($user)->delete(route('favorites.remove', $publication->id));

    $response->assertRedirect();
    $response->assertSessionHas('error', 'No está en favoritos');
});

test('PUB-FAV-006: Verifica favorito vía API', function () {
    $user = makeUser();
    $seller = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($seller, $category);

    Favorite::create(['user_id' => $user->id, 'publication_id' => $publication->id]);

    $response = $this->actingAs($user)->get(route('favorites.check', $publication->id));

    $response->assertOk()->assertJson(['isFavorite' => true]);
});

