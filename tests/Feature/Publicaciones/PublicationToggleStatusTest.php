<?php

use App\Enums\StatusType;
use App\Models\Category;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

require_once __DIR__.'/publication-test-helpers.php';

uses(RefreshDatabase::class);

test('PUB-TS-001: Alterna publicación a estado inhabilitado', function () {
    $owner = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($owner, $category, [
        'status' => StatusType::HABILITADO,
    ]);

    $response = $this->actingAs($owner)->patch(route('publications.toggle-status', $publication->id));

    $response->assertRedirect(route('my-publications'));
    $response->assertSessionHas('success', 'Publicación inhabilitada exitosamente.');

    $publication->refresh();
    expect($publication->status)->toBe(StatusType::INHABILITADO);
});

test('PUB-TS-002: Alterna publicación nuevamente a habilitado', function () {
    $owner = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($owner, $category, [
        'status' => StatusType::INHABILITADO,
    ]);

    $response = $this->actingAs($owner)->patch(route('publications.toggle-status', $publication->id));

    $response->assertRedirect(route('my-publications'));
    $response->assertSessionHas('success', 'Publicación habilitada exitosamente.');

    $publication->refresh();
    expect($publication->status)->toBe(StatusType::HABILITADO);
});

test('PUB-TS-003: Usuario ajeno recibe 404 al alternar', function () {
    $owner = makeUser();
    $other = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($owner, $category);

    $response = $this->actingAs($other)->patch(route('publications.toggle-status', $publication->id));

    $response->assertStatus(404);
});

