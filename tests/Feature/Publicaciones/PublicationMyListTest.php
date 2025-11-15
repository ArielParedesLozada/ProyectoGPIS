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
    ensureViteEntries(['publications/my-publications']);
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

