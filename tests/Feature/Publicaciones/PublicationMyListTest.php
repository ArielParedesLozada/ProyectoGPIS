<?php

use App\Enums\StatusType;
use App\Models\Category;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

require_once __DIR__.'/publication-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    ensureViteEntries([
        'publications/my-publications',
        'publications/publication-index',
        'publications/favorites',
        'publications/publication-view',
        'publications/my-publication-view',
        'publications/create-publication',
        'publications/edit-publication',
    ]);
});

test('PUB-ML-001: Lista solo publicaciones del usuario', function () {
    $owner = makeUser();
    $other = makeUser();
    $category = makeCategory();

    $mine = createPublicationFor($owner, $category, [
        'title' => 'Mi publicación destacada',
        'status' => StatusType::HABILITADO,
    ]);

    createPublicationFor($other, $category, [
        'title' => 'Publicación de otra persona',
        'status' => StatusType::HABILITADO,
    ]);

    $response = $this->actingAs($owner)->get(route('my-publications'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publications.data', function ($data) use ($mine) {
            $titles = collect($data)->pluck('title');
            return $titles->contains($mine->title) && $titles->count() === 1;
        })
        ->etc()
    );
});

test('PUB-ML-002: Filtra mis publicaciones por estado', function () {
    $owner = makeUser();
    $category = makeCategory();

    $enabled = createPublicationFor($owner, $category, [
        'title' => 'Publicación habilitada',
        'status' => StatusType::HABILITADO,
    ]);

    createPublicationFor($owner, $category, [
        'title' => 'Publicación inhabilitada',
        'status' => StatusType::INHABILITADO,
    ]);

    $response = $this->actingAs($owner)->get(route('my-publications', [
        'status' => StatusType::HABILITADO->value,
    ]));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publications.data', function ($data) use ($enabled) {
            return count($data) === 1 && $data[0]['title'] === $enabled->title;
        })
        ->where('publications.links', function ($links) {
            return collect($links)
                ->filter(fn ($link) => isset($link['url']))
                ->contains(fn ($link) => str_contains($link['url'], 'status='));
        })
        ->etc()
    );
});

test('PUB-ML-003: Redirige a login cuando no hay usuario autenticado', function () {
    $response = $this->get(route('my-publications'));

    $response->assertRedirect(route('login'));
});

test('PUB-ML-003b: Redirige a login cuando Auth::id() devuelve null', function () {
    \Illuminate\Support\Facades\Auth::shouldReceive('id')
        ->once()
        ->andReturn(null);

    $response = $this->withoutMiddleware()->get(route('my-publications'));

    $response->assertRedirect(route('login'));
});

test('PUB-ML-004: Maneja publicaciones sin coordenadas', function () {
    $owner = makeUser();
    $category = makeCategory();

    $publication = createPublicationFor($owner, $category, [
        'title' => 'Publicación sin coordenadas',
    ]);

    \Illuminate\Support\Facades\DB::statement('UPDATE publications SET location_point = NULL WHERE id = ?', [$publication->id]);

    \Illuminate\Support\Facades\DB::shouldReceive('selectOne')
        ->once()
        ->andReturn(null);

    $response = $this->actingAs($owner)->get(route('my-publications'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('publications.data', function ($data) use ($publication) {
            return count($data) === 1 && $data[0]['title'] === $publication->title;
        })
        ->etc()
    );

    $publicationsData = $response->getOriginalContent()->getData()['page']['props']['publications']['data'];
    expect($publicationsData[0]['location_point'])->toBeNull();
});

test('PUB-ML-005: Maneja excepciones correctamente', function () {
    $owner = makeUser();
    $category = makeCategory();

    createPublicationFor($owner, $category);

    \Illuminate\Support\Facades\DB::shouldReceive('selectOne')
        ->andThrow(new \Exception('Database error'));

    $response = $this->actingAs($owner)->get(route('my-publications'));

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('Error al cargar las publicaciones');
});

