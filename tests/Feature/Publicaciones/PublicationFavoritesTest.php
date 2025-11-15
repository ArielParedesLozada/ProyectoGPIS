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
    // Asegurar que todos los componentes necesarios estén en el manifest
    ensureViteEntries([
        'publications/favorites',
        'publications/publication-index',
        'publications/my-publications',
        'publications/publication-view',
        'publications/my-publication-view',
        'publications/create-publication',
        'publications/edit-publication',
    ]);
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

test('PUB-FAV-007: Favoritos redirige a login cuando Auth::user() devuelve null', function () {
    \Illuminate\Support\Facades\Auth::shouldReceive('user')
        ->once()
        ->andReturn(null);

    $response = $this->withoutMiddleware()->get(route('favorites'));

    $response->assertRedirect(route('login'));
});

test('PUB-FAV-008: Favoritos maneja excepciones correctamente', function () {
    $user = makeUser();

    $mockUser = \Mockery::mock($user)->makePartial();
    $mockUser->shouldReceive('favorites')
        ->once()
        ->andThrow(new \Exception('Database error'));

    \Illuminate\Support\Facades\Auth::shouldReceive('user')
        ->once()
        ->andReturn($mockUser);

    \Illuminate\Support\Facades\Log::shouldReceive('error')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) {
            if (str_contains($message, 'Error in favorites')) {
                expect($message)->toContain('Error in favorites: Database error');
            }
            return true;
        });

    $response = $this->withoutMiddleware()->get(route('favorites'));

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('Error al cargar los favoritos');
});

test('PUB-FAV-009: Agregar a favoritos maneja excepciones correctamente', function () {
    $user = makeUser();
    $seller = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($seller, $category);
    $publicationId = $publication->id;

    \App\Models\Favorite::creating(function ($favorite) {
        throw new \Exception('Database error');
    });

    \Illuminate\Support\Facades\Log::shouldReceive('error')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) {
            if (str_contains($message, 'Error adding to favorites')) {
                expect($message)->toContain('Error adding to favorites: Database error');
            }
            return true;
        });

    $response = $this->actingAs($user)->post(route('favorites.add', $publicationId));

    $response->assertRedirect();
    $response->assertSessionHas('error', 'Error al agregar a favoritos');

    \App\Models\Favorite::unsetEventDispatcher();
});

test('PUB-FAV-010: Eliminar de favoritos maneja excepciones correctamente', function () {
    $user = makeUser();
    $seller = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($seller, $category);
    $favorite = Favorite::create(['user_id' => $user->id, 'publication_id' => $publication->id]);

    \App\Models\Favorite::deleting(function ($favorite) {
        throw new \Exception('Database error');
    });

    \Illuminate\Support\Facades\Log::shouldReceive('error')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) {
            if (str_contains($message, 'Error removing from favorites')) {
                expect($message)->toContain('Error removing from favorites: Database error');
            }
            return true;
        });

    $response = $this->actingAs($user)->delete(route('favorites.remove', $publication->id));

    $response->assertRedirect();
    $response->assertSessionHas('error', 'Error al eliminar de favoritos');

    \App\Models\Favorite::unsetEventDispatcher();
});

test('PUB-FAV-011: Verificar favorito maneja excepciones correctamente', function () {
    $user = makeUser();
    $seller = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($seller, $category);

    $originalConnection = \Illuminate\Support\Facades\DB::connection();
    
    $mockConnection = \Mockery::mock($originalConnection)->makePartial();
    $mockConnection->shouldReceive('select')
        ->andThrow(new \Exception('Database error'));
    $mockConnection->shouldReceive('getQueryGrammar')
        ->andReturn($originalConnection->getQueryGrammar());
    $mockConnection->shouldReceive('getPostProcessor')
        ->andReturn($originalConnection->getPostProcessor());
    $mockConnection->shouldReceive('getTablePrefix')
        ->andReturn($originalConnection->getTablePrefix());
    $mockConnection->shouldReceive('getName')
        ->andReturn($originalConnection->getName());
    $mockConnection->shouldReceive('getConfig')
        ->andReturn($originalConnection->getConfig());
    $mockConnection->shouldReceive('getDriverName')
        ->andReturn($originalConnection->getDriverName());

    \Illuminate\Support\Facades\DB::shouldReceive('connection')
        ->andReturn($mockConnection);

    \Illuminate\Support\Facades\Log::shouldReceive('error')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) {
            if (str_contains($message, 'Error checking favorite')) {
                expect($message)->toContain('Error checking favorite: Database error');
            }
            return true;
        });

    $response = $this->actingAs($user)->get(route('favorites.check', $publication->id));

    $response->assertOk()->assertJson(['isFavorite' => false]);
});

test('PUB-FAV-012: checkFavorite maneja excepciones cuando la consulta SQL falla', function () {
    $user = makeUser();
    $seller = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($seller, $category);

    \Illuminate\Support\Facades\DB::statement('DROP TABLE IF EXISTS favorites');

    \Illuminate\Support\Facades\Log::shouldReceive('error')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) {
            if (str_contains($message, 'Error checking favorite')) {
                expect($message)->toContain('Error checking favorite');
            }
            return true;
        });

    $response = $this->actingAs($user)->get(route('favorites.check', $publication->id));

    $response->assertOk()->assertJson(['isFavorite' => false]);
});

