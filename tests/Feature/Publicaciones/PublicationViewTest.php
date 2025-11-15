<?php

use App\Models\Category;
use App\Models\ModerationCase;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

require_once __DIR__.'/publication-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    ensureViteEntries([
        'publications/publication-view',
        'publications/my-publication-view',
        'publications/publication-index',
        'publications/my-publications',
        'publications/favorites',
        'publications/create-publication',
        'publications/edit-publication',
    ]);
});

test('PUB-V-001: Vista pública muestra la publicación solicitada', function () {
    $owner = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($owner, $category, [
        'title' => 'Publicación visible',
        'description' => 'Disponible para todos',
    ]);

    $viewer = makeUser();

    $response = $this->actingAs($viewer)->get(route('publication-view', $publication->id));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publication.title', $publication->title)
        ->where('publication.description', $publication->description)
        ->etc()
    );
});

test('PUB-V-002: Vista privada requiere autenticación', function () {
    $owner = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($owner, $category, [
        'title' => 'Vista privada',
        'description' => 'Solo el autor puede ver la edición',
    ]);

    $response = $this->actingAs($owner)->get(route('my-publication-view', $publication->id));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publication.title', $publication->title)
        ->where('publication.has_final_moderation_decision', false)
        ->etc()
    );
});

test('PUB-V-003: Vista pública maneja publicación sin coordenadas', function () {
    $owner = makeUser();
    $category = makeCategory();
    
    $publication = createPublicationFor($owner, $category, [
        'title' => 'Publicación sin coordenadas',
        'description' => 'Sin ubicación geográfica',
    ]);
    
    \Illuminate\Support\Facades\DB::statement('UPDATE publications SET location_point = NULL WHERE id = ?', [$publication->id]);
    
    \Illuminate\Support\Facades\DB::shouldReceive('selectOne')
        ->once()
        ->andReturn(null);

    $viewer = makeUser();
    $response = $this->actingAs($viewer)->get(route('publication-view', $publication->id));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publication.title', $publication->title)
        ->has('publication.location_point')
    );
    
    $locationPoint = $response->getOriginalContent()->getData()['page']['props']['publication']['location_point'];
    expect($locationPoint)->toBeNull();
});

test('PUB-V-004: Vista privada redirige a login cuando no hay usuario autenticado', function () {
    $owner = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($owner, $category);

    $response = $this->get(route('my-publication-view', $publication->id));

    $response->assertRedirect(route('login'));
});

test('PUB-V-004b: Vista privada redirige a login cuando Auth::id() devuelve null', function () {
    $owner = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($owner, $category);

    \Illuminate\Support\Facades\Auth::shouldReceive('id')
        ->once()
        ->andReturn(null);

    $response = $this->withoutMiddleware()->get(route('my-publication-view', $publication->id));

    $response->assertRedirect(route('login'));
});

test('PUB-V-005: Vista privada maneja publicación sin coordenadas', function () {
    $owner = makeUser();
    $category = makeCategory();
    
    $publication = createPublicationFor($owner, $category, [
        'title' => 'Mi publicación sin coordenadas',
    ]);
    
    \Illuminate\Support\Facades\DB::statement('UPDATE publications SET location_point = NULL WHERE id = ?', [$publication->id]);
    
    \Illuminate\Support\Facades\DB::shouldReceive('selectOne')
        ->once()
        ->andReturn(null);

    $response = $this->actingAs($owner)->get(route('my-publication-view', $publication->id));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publication.title', $publication->title)
        ->has('publication.location_point')
        ->where('publication.has_final_moderation_decision', false)
        ->etc()
    );
    
    $locationPoint = $response->getOriginalContent()->getData()['page']['props']['publication']['location_point'];
    expect($locationPoint)->toBeNull();
});


test('PUB-V-006: Vista privada maneja excepciones correctamente', function () {
    $owner = makeUser();
    $category = makeCategory();
    
    $publication = createPublicationFor($owner, $category);
    $publicationId = $publication->id;
    
    $publication->delete();

    $response = $this->actingAs($owner)->get(route('my-publication-view', $publicationId));

    $response->assertRedirect(route('my-publications'));
    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('Error al cargar la publicación');
});

