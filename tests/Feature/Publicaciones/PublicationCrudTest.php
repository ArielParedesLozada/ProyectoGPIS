<?php

use App\Models\Category;
use App\Models\Publication;
use App\Models\PublicationImage;
use App\Models\PublicationServiceHour;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/publication-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    ensureViteEntries(['publications/publication-index']);
});

test('PUB-001: Visualiza listado de publicaciones', function () {
    $user = makeUser();

    $response = $this->actingAs($user)->get(route('publication-index'));

    $response->assertStatus(200);
});

test('PUB-002: Crea publicación correctamente', function () {
    fakeGeocoding([
        'city' => 'Ambato',
        'country' => 'Ecuador',
    ]);

    $user = makeUser();
    $category = makeCategory();

    $payload = basePublicationPayload($category, [
        'title' => 'Laptop Gamer',
        'description' => 'Equipo de alto rendimiento ideal para videojuegos.',
        'price' => 1499.99,
    ]);

    $response = $this->actingAs($user)->post(route('publications.store'), $payload);

    $response->assertRedirect(route('my-publications'));

    $this->assertDatabaseHas('publications', [
        'title' => 'Laptop Gamer',
        'description' => 'Equipo de alto rendimiento ideal para videojuegos.',
        'price' => 1499.99,
        'category_id' => $category->id,
        'type' => 'producto',
        'created_by' => $user->id,
        'location' => 'Ambato, Ecuador',
    ]);
});

test('PUB-006: Rechaza creación sin título', function () {
    $user = makeUser();
    $category = makeCategory();

    $payload = basePublicationPayload($category, [
        'title' => '',
        'description' => 'Equipo de alto rendimiento ideal para videojuegos.',
        'price' => 1499.99,
    ]);

    $response = $this->actingAs($user)->post(route('publications.store'), $payload);

    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('title field is required');
    expect(Publication::count())->toBe(0);
});

test('PUB-005: Crea servicio con horario obligatorio', function () {
    fakeGeocoding([
        'city' => 'Quito',
        'country' => 'Ecuador',
    ]);

    $user = makeUser();
    $category = makeCategory();

    $schedule = [
        ['day' => 1, 'open' => '09:00', 'close' => '18:00'],
        ['day' => 2, 'open' => '09:00', 'close' => '18:00'],
    ];

    $payload = basePublicationPayload($category, [
        'title' => 'Servicio de mantenimiento premium',
        'description' => 'Mantenimiento preventivo y correctivo para empresas.',
        'price' => 299.99,
        'type' => 'servicio',
        'lat' => -0.19,
        'lng' => -78.49,
        'schedule' => json_encode($schedule),
    ]);

    $response = $this->actingAs($user)->post(route('publications.store'), $payload);

    $response->assertRedirect(route('my-publications'));

    $publication = Publication::where('title', 'Servicio de mantenimiento premium')->first();
    $this->assertNotNull($publication);
    $this->assertSame('servicio', $publication->type);
    $this->assertSame('Quito, Ecuador', $publication->location);

    $this->assertDatabaseHas('publication_service_hours', [
        'publication_id' => $publication->id,
        'day_of_week' => 1,
        'open_time' => '09:00:00',
        'close_time' => '18:00:00',
    ]);

    $this->assertEquals(
        2,
        PublicationServiceHour::where('publication_id', $publication->id)->count()
    );
});

test('PUB-007: Rechaza servicio sin horario', function () {
    $user = makeUser();
    $category = makeCategory();

    $payload = basePublicationPayload($category, [
        'title' => 'Servicio de mantenimiento premium',
        'description' => 'Mantenimiento preventivo y correctivo para empresas.',
        'price' => 299.99,
        'type' => 'servicio',
        'lat' => -0.19,
        'lng' => -78.49,
        'schedule' => null,
    ]);

    $response = $this->actingAs($user)->post(route('publications.store'), $payload);

    $response->assertSessionHasErrors(['schedule']);
    expect(Publication::count())->toBe(0);
    expect(PublicationServiceHour::count())->toBe(0);
});

test('PUB-003: Actualiza una publicación existente', function () {
    fakeGeocoding([
        'city' => 'Quito',
        'country' => 'Ecuador',
    ]);

    $user = makeUser();
    $category = makeCategory();

    $publication = createPublicationFor($user, $category, [
        'title' => 'Servicio de carpintería',
        'description' => 'Trabajo artesanal a medida.',
        'price' => 250,
        'type' => 'producto',
    ]);

    $payload = basePublicationPayload($category, [
        'title' => 'Servicio de carpintería premium',
        'description' => 'Trabajo artesanal a medida con materiales de lujo.',
        'price' => 320,
        'lat' => -0.19,
        'lng' => -78.49,
    ]);

    $response = $this->actingAs($user)->put(route('publications.update', $publication->id), $payload);

    $response->assertRedirect(route('my-publication-view', $publication->id));

    $this->assertDatabaseHas('publications', [
        'id' => $publication->id,
        'title' => 'Servicio de carpintería premium',
        'description' => 'Trabajo artesanal a medida con materiales de lujo.',
        'price' => 320,
        'category_id' => $category->id,
        'type' => 'producto',
        'location' => 'Quito, Ecuador',
    ]);
});

test('PUB-008: Rechaza actualización sin descripción', function () {
    $user = makeUser();
    $category = makeCategory();

    $publication = createPublicationFor($user, $category, [
        'title' => 'Servicio de carpintería',
        'description' => 'Trabajo artesanal a medida.',
        'price' => 250,
        'type' => 'producto',
    ]);

    $payload = basePublicationPayload($category, [
        'title' => 'Servicio de carpintería premium',
        'description' => '',
        'price' => 320,
        'lat' => -0.19,
        'lng' => -78.49,
    ]);

    $response = $this->actingAs($user)->put(route('publications.update', $publication->id), $payload);

    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('description field is required');
    $publication->refresh();

    expect($publication->title)->toBe('Servicio de carpintería');
    expect($publication->description)->toBe('Trabajo artesanal a medida.');
    expect((float) $publication->price)->toBe(250.0);
});

test('PUB-004: Elimina una publicación', function () {
    $user = makeUser();
    $category = makeCategory();

    $publication = createPublicationFor($user, $category, [
        'type' => 'producto',
    ]);

    $response = $this->actingAs($user)->delete(route('publications.destroy', $publication->id), [
        '_token' => csrf_token(),
    ]);

    $response->assertRedirect(route('my-publications'));

    $this->assertDatabaseMissing('publications', [
        'id' => $publication->id,
    ]);
});

test('PUB-009: Index rechaza rango de precios invertido', function () {
    $user = makeUser();

    $response = $this->actingAs($user)
        ->from(route('publication-index'))
        ->get(route('publication-index', [
            'min_price' => 200,
            'max_price' => 100,
        ]));

    $response->assertRedirect(route('publication-index'));
    $response->assertSessionHas('error', 'El precio mínimo no puede ser mayor que el precio máximo.');
});

test('PUB-010: Index informa falta de precio máximo', function () {
    $user = makeUser();

    $response = $this->actingAs($user)
        ->from(route('publication-index'))
        ->get(route('publication-index', [
            'min_price' => 100,
        ]));

    $response->assertRedirect(route('publication-index'));
    $response->assertSessionHas('info', 'Para filtrar por precio, selecciona también el precio máximo.');
});

test('PUB-011: Index informa falta de precio mínimo', function () {
    $user = makeUser();

    $response = $this->actingAs($user)
        ->from(route('publication-index'))
        ->get(route('publication-index', [
            'max_price' => 100,
        ]));

    $response->assertRedirect(route('publication-index'));
    $response->assertSessionHas('info', 'Para filtrar por precio, selecciona también el precio mínimo.');
});

test('PUB-012: Creación usa fallback de geocoding', function () {
    fakeGeocoding(null, 500);

    $user = makeUser();
    $category = makeCategory();

    $payload = basePublicationPayload($category, [
        'title' => 'Producto sin ubicación precisa',
        'description' => 'Descripción de prueba',
        'price' => 49.99,
    ]);

    $response = $this->actingAs($user)->post(route('publications.store'), $payload);

    $response->assertRedirect(route('my-publications'));

    $this->assertDatabaseHas('publications', [
        'title' => 'Producto sin ubicación precisa',
        'location' => 'Ubicación no disponible',
    ]);
});

test('PUB-013: Rechaza creación con coordenadas fuera de rango', function () {
    fakeGeocoding();

    $user = makeUser();
    $category = makeCategory();

    $payload = basePublicationPayload($category, [
        'title' => 'Publicación inválida',
        'description' => 'Coordenadas inválidas',
        'price' => 10.0,
        'lat' => 95.0,
        'lng' => -78.62,
    ]);

    $response = $this->actingAs($user)->post(route('publications.store'), $payload);

    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('lat field must be between -90 and 90');
    expect(Publication::count())->toBe(0);
});

test('PUB-014: Crea publicación con múltiples imágenes', function () {
    fakeGeocoding([
        'city' => 'Guayaquil',
        'country' => 'Ecuador',
    ]);

    Storage::fake('public');

    $user = makeUser();
    $category = makeCategory();

    $images = [
        fakePng('foto1.png'),
        fakePng('foto2.png'),
        fakePng('foto3.png'),
    ];

    $payload = basePublicationPayload($category, [
        'title' => 'Producto con galería',
        'description' => 'Incluye varias imágenes',
        'price' => 199.99,
        'lat' => -2.15,
        'lng' => -79.88,
        'images' => $images,
    ]);

    $response = $this->actingAs($user)->post(route('publications.store'), $payload);
    $response->assertRedirect(route('my-publications'));

    $publication = Publication::where('title', 'Producto con galería')->firstOrFail();

    $this->assertSame(3, $publication->images()->count());
    foreach ($publication->images as $image) {
        Storage::disk('public')->assertExists($image->image_url);
    }
});

test('PUB-015: Rechaza creación con más de cinco imágenes', function () {
    fakeGeocoding();
    Storage::fake('public');

    $user = makeUser();
    $category = makeCategory();

    $images = [];
    for ($i = 1; $i <= 6; $i++) {
        $images[] = fakePng("foto{$i}.png");
    }

    $payload = basePublicationPayload($category, [
        'title' => 'Producto con demasiadas imágenes',
        'description' => 'Seis imágenes deben fallar',
        'price' => 49.99,
        'lat' => -2.15,
        'lng' => -79.88,
        'images' => $images,
    ]);

    $response = $this->actingAs($user)->post(route('publications.store'), $payload);

    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('images field must not have more than 5 items');
    expect(Publication::count())->toBe(0);
});

test('PUB-016: Rechaza creación con imagen demasiado grande', function () {
    fakeGeocoding();
    Storage::fake('public');

    $user = makeUser();
    $category = makeCategory();

    $payload = basePublicationPayload($category, [
        'title' => 'Producto con imagen pesada',
        'description' => 'La imagen excede el límite',
        'price' => 99.99,
        'lat' => -2.15,
        'lng' => -79.88,
        'images' => [
            fakePng('pesada.png', 6000),
        ],
    ]);

    $response = $this->actingAs($user)->post(route('publications.store'), $payload);

    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('images.0 field must not be greater than 5120 kilobytes');
    expect(Publication::count())->toBe(0);
});

test('PUB-017: Actualiza imágenes manteniendo solo las seleccionadas', function () {
    fakeGeocoding([
        'city' => 'Cuenca',
        'country' => 'Ecuador',
    ]);
    Storage::fake('public');

    $user = makeUser();
    $category = makeCategory();

    $publication = createPublicationFor($user, $category, [
        'type' => 'producto',
    ]);

    $existingFiles = collect([
        fakePng('guardada1.png'),
        fakePng('guardada2.png'),
    ])->map(function ($file) use ($publication) {
        $path = $file->store('publications', 'public');
        return PublicationImage::create([
            'publication_id' => $publication->id,
            'image_url' => $path,
        ]);
    });

    $imageToKeep = $existingFiles->first();
    $imageToRemove = $existingFiles->last();

    $newImage = fakePng('nueva.png');

    $payload = basePublicationPayload($category, [
        'title' => 'Título actualizado',
        'description' => 'Descripción actualizada',
        'price' => 150,
        'lat' => -2.15,
        'lng' => -79.88,
        'existing_images' => [$imageToKeep->id],
        'images' => [$newImage],
    ]);

    $response = $this->actingAs($user)->put(route('publications.update', $publication->id), $payload);
    $response->assertRedirect(route('my-publication-view', $publication->id));

    Storage::disk('public')->assertExists($imageToKeep->image_url);
    Storage::disk('public')->assertMissing($imageToRemove->image_url);

    $updatedPublication = $publication->fresh();
    expect($updatedPublication->images()->count())->toBe(2);

    $newImageRecord = $updatedPublication->images()->where('image_url', 'like', 'publications/%')->latest()->first();
    $this->assertNotNull($newImageRecord);
    Storage::disk('public')->assertExists($newImageRecord->image_url);
});

test('PUB-018: Destroy elimina imágenes del storage', function () {
    Storage::fake('public');
    fakeGeocoding();

    $user = makeUser();
    $category = makeCategory();

    $publication = createPublicationFor($user, $category, [
        'type' => 'producto',
    ]);

    $file = fakePng('para-borrar.png');
    $path = $file->store('publications', 'public');

    PublicationImage::create([
        'publication_id' => $publication->id,
        'image_url' => $path,
    ]);

    $this->actingAs($user)->delete(route('publications.destroy', $publication->id), [
        '_token' => csrf_token(),
    ])->assertRedirect(route('my-publications'));

    Storage::disk('public')->assertMissing($path);
    $this->assertDatabaseMissing('publications', ['id' => $publication->id]);
});

test('PUB-019: Actualización de servicio a producto elimina horarios', function () {
    fakeGeocoding([
        'city' => 'Loja',
        'country' => 'Ecuador',
    ]);

    $user = makeUser();
    $category = makeCategory();

    $publication = createPublicationFor($user, $category, [
        'type' => 'servicio',
        'schedule' => json_encode([['day' => 1, 'open' => '09:00', 'close' => '17:00']]),
    ]);

    PublicationServiceHour::create([
        'publication_id' => $publication->id,
        'day_of_week' => 1,
        'open_time' => '09:00:00',
        'close_time' => '17:00:00',
    ]);

    $payload = basePublicationPayload($category, [
        'title' => $publication->title,
        'description' => 'Servicio convertido a producto',
        'price' => 100,
        'type' => 'producto',
        'lat' => -3.99,
        'lng' => -79.20,
    ]);

    $this->actingAs($user)->put(route('publications.update', $publication->id), $payload)
        ->assertRedirect(route('my-publication-view', $publication->id));

    expect(PublicationServiceHour::where('publication_id', $publication->id)->count())->toBe(0);
});

test('PUB-020: Actualización de producto a servicio recrea horarios', function () {
    fakeGeocoding([
        'city' => 'Latacunga',
        'country' => 'Ecuador',
    ]);

    $user = makeUser();
    $category = makeCategory();

    $publication = createPublicationFor($user, $category, [
        'type' => 'producto',
    ]);

    $schedule = [
        ['day' => 2, 'open' => '10:00', 'close' => '18:00'],
        ['day' => 4, 'open' => '12:00', 'close' => '16:00'],
    ];

    $payload = basePublicationPayload($category, [
        'title' => $publication->title,
        'description' => 'Producto ahora servicio',
        'price' => 120,
        'type' => 'servicio',
        'lat' => -0.93,
        'lng' => -78.61,
        'schedule' => json_encode($schedule),
    ]);

    $this->actingAs($user)->put(route('publications.update', $publication->id), $payload)
        ->assertRedirect(route('my-publication-view', $publication->id));

    expect(PublicationServiceHour::where('publication_id', $publication->id)->count())->toBe(2);
});

test('PUB-027: Creación de servicio ignora horario inválido', function () {
    fakeGeocoding([
        'city' => 'Riobamba',
        'country' => 'Ecuador',
    ]);

    $user = makeUser();
    $category = makeCategory();

    $payload = basePublicationPayload($category, [
        'title' => 'Servicio con horario inválido',
        'description' => 'El horario no es JSON válido',
        'price' => 80,
        'type' => 'servicio',
        'lat' => -1.67,
        'lng' => -78.65,
        'schedule' => 'not-json',
    ]);

    $response = $this->actingAs($user)->post(route('publications.store'), $payload);
    $response->assertRedirect(route('my-publications'));

    $publication = Publication::where('title', 'Servicio con horario inválido')->firstOrFail();
    expect($publication->type)->toBe('servicio');
    expect(PublicationServiceHour::where('publication_id', $publication->id)->count())->toBe(0);
});

test('PUB-028: Actualización rechaza coordenadas fuera de rango', function () {
    fakeGeocoding();

    $user = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($user, $category, [
        'type' => 'producto',
    ]);

    $payload = basePublicationPayload($category, [
        'lat' => 95.5,
        'lng' => -80.0,
    ]);

    $response = $this->actingAs($user)->put(route('publications.update', $publication->id), $payload);

    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('lat field must be between -90 and 90');
});

test('PUB-029: Actualización rechaza precio negativo', function () {
    fakeGeocoding();

    $user = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($user, $category, [
        'type' => 'producto',
    ]);

    $payload = basePublicationPayload($category, [
        'price' => -10,
    ]);

    $response = $this->actingAs($user)->put(route('publications.update', $publication->id), $payload);

    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('price field must be at least 0');
});

test('PUB-030: Actualización de servicio con horario inválido elimina registros previos', function () {
    fakeGeocoding([
        'city' => 'Loja',
        'country' => 'Ecuador',
    ]);

    $user = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($user, $category, [
        'type' => 'servicio',
    ]);

    PublicationServiceHour::create([
        'publication_id' => $publication->id,
        'day_of_week' => 3,
        'open_time' => '08:00:00',
        'close_time' => '12:00:00',
    ]);

    $payload = basePublicationPayload($category, [
        'type' => 'servicio',
        'lat' => -4.0,
        'lng' => -79.20,
        'schedule' => 'invalid-json',
    ]);

    $this->actingAs($user)->put(route('publications.update', $publication->id), $payload)
        ->assertRedirect(route('my-publication-view', $publication->id));

    expect(PublicationServiceHour::where('publication_id', $publication->id)->count())->toBe(0);
});

test('PUB-031: Actualización usa fallback de geocoding ante error', function () {
    fakeGeocoding(null, 500);

    $user = makeUser();
    $category = makeCategory();
    $publication = createPublicationFor($user, $category, [
        'title' => 'Publicación con ubicación original',
        'description' => 'Descripción inicial',
        'price' => 200,
        'type' => 'producto',
    ]);

    $payload = basePublicationPayload($category, [
        'title' => 'Publicación con geocoding fallido',
        'description' => 'Descripción nueva',
        'price' => 250,
        'lat' => -2.17,
        'lng' => -79.89,
    ]);

    $this->actingAs($user)->put(route('publications.update', $publication->id), $payload)
        ->assertRedirect(route('my-publication-view', $publication->id));

    $publication->refresh();
    expect($publication->location)->toBe('Ubicación no disponible');
});

test('PUB-021: Invitado no puede crear publicaciones', function () {
    $response = $this->post(route('publications.store'), []);

    $response->assertRedirect(route('login'));
});

test('PUB-022: Invitado no puede actualizar publicaciones', function () {
    $category = makeCategory();
    $owner = makeUser();
    $publication = createPublicationFor($owner, $category);

    $response = $this->put(route('publications.update', $publication->id), []);

    $response->assertRedirect(route('login'));
});

test('PUB-023: Invitado no puede eliminar publicaciones', function () {
    $category = makeCategory();
    $owner = makeUser();
    $publication = createPublicationFor($owner, $category);

    $response = $this->delete(route('publications.destroy', $publication->id), []);

    $response->assertRedirect(route('login'));
});

test('PUB-024: Invitado no puede ver mis publicaciones', function () {
    $response = $this->get(route('my-publications'));

    $response->assertRedirect(route('login'));
});

test('PUB-025: Usuario no puede editar publicación ajena', function () {
    fakeGeocoding();

    $owner = makeUser();
    $otherUser = makeUser();
    $category = makeCategory();

    $publication = createPublicationFor($owner, $category, [
        'type' => 'producto',
    ]);

    $payload = basePublicationPayload($category, [
        'title' => 'Intento no autorizado',
        'description' => 'No debería actualizarse',
        'price' => 999,
        'lat' => -1.0,
        'lng' => -78.0,
    ]);

    $response = $this->actingAs($otherUser)
        ->from(route('my-publications'))
        ->put(route('publications.update', $publication->id), $payload);

    $response->assertRedirect(route('my-publications'));
    $response->assertSessionHasErrors(['error']);
    $publication->refresh();
    expect($publication->title)->not->toBe('Intento no autorizado');
});

test('PUB-026: Usuario no puede eliminar publicación ajena', function () {
    $owner = makeUser();
    $otherUser = makeUser();
    $category = makeCategory();

    $publication = createPublicationFor($owner, $category, [
        'type' => 'producto',
    ]);

    $response = $this->actingAs($otherUser)->delete(route('publications.destroy', $publication->id), [
        '_token' => csrf_token(),
    ]);

    $response->assertNotFound();
    $this->assertDatabaseHas('publications', [
        'id' => $publication->id,
    ]);
});

