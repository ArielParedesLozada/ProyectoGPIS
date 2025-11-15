<?php

use App\Models\Category;
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

