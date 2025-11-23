<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

require_once __DIR__.'/publication-test-helpers.php';

uses(RefreshDatabase::class);

test('PUB-BUY-001: Compra publicación exitosamente', function () {
    $buyer = makeUser(['role' => \App\Enums\RoleType::COMPRADOR->value]);
    $seller = makeUser(['role' => \App\Enums\RoleType::VENDEDOR->value]);
    $category = makeCategory();

    $publication = createPublicationFor($seller, $category, [
        'type' => 'producto',
        'disponibility' => true,
        'price' => 150.00,
    ]);

    $response = $this->actingAs($buyer)->post(route('publication-buy', $publication->id), [
        '_token' => csrf_token(),
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $this->assertDatabaseHas('purchases', [
        'publication_id' => $publication->id,
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'price' => 150.00,
        'status' => 'completed',
    ]);

    $this->assertDatabaseHas('publications', [
        'id' => $publication->id,
        'disponibility' => false,
    ]);
});

test('PUB-BUY-002: Rechaza compra de publicación no disponible', function () {
    $buyer = makeUser(['role' => \App\Enums\RoleType::COMPRADOR->value]);
    $seller = makeUser(['role' => \App\Enums\RoleType::VENDEDOR->value]);
    $category = makeCategory();

    $publication = createPublicationFor($seller, $category, [
        'type' => 'producto',
        'disponibility' => false,
    ]);

    $response = $this->actingAs($buyer)->post(route('publication-buy', $publication->id), [
        '_token' => csrf_token(),
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('ya no está disponible');
});

test('PUB-BUY-003: Rechaza compra de propia publicación', function () {
    $user = makeUser(['role' => \App\Enums\RoleType::VENDEDOR->value]);
    $category = makeCategory();

    $publication = createPublicationFor($user, $category, [
        'type' => 'producto',
        'disponibility' => true,
    ]);

    $response = $this->actingAs($user)->post(route('publication-buy', $publication->id), [
        '_token' => csrf_token(),
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('No puedes comprar tu propia publicación');
});

test('PUB-BUY-004: Rechaza compra cuando vendedor está deshabilitado', function () {
    $buyer = makeUser(['role' => \App\Enums\RoleType::COMPRADOR->value]);
    $seller = makeUser([
        'role' => \App\Enums\RoleType::VENDEDOR->value,
        'status' => \App\Enums\StatusType::INHABILITADO->value,
        'is_active' => false,
    ]);
    $category = makeCategory();

    $publication = createPublicationFor($seller, $category, [
        'type' => 'producto',
        'disponibility' => true,
    ]);

    $response = $this->actingAs($buyer)->post(route('publication-buy', $publication->id), [
        '_token' => csrf_token(),
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('cuenta desactivada');
});

test('PUB-BUY-005: Invitado no puede comprar', function () {
    $seller = makeUser(['role' => \App\Enums\RoleType::VENDEDOR->value]);
    $category = makeCategory();

    $publication = createPublicationFor($seller, $category, [
        'type' => 'producto',
        'disponibility' => true,
    ]);

    $response = $this->post(route('publication-buy', $publication->id), [
        '_token' => csrf_token(),
    ]);

    // El middleware de autenticación redirige al login, pero el controlador también valida
    // Verificamos que no se creó la compra
    $this->assertDatabaseMissing('purchases', [
        'publication_id' => $publication->id,
    ]);
    
    // La publicación sigue disponible
    $this->assertDatabaseHas('publications', [
        'id' => $publication->id,
        'disponibility' => true,
    ]);
});

test('PUB-BUY-006: Usuario con rol inválido no puede comprar', function () {
    $buyer = makeUser(['role' => \App\Enums\RoleType::ADMIN->value]);
    $seller = makeUser(['role' => \App\Enums\RoleType::VENDEDOR->value]);
    $category = makeCategory();

    $publication = createPublicationFor($seller, $category, [
        'type' => 'producto',
        'disponibility' => true,
    ]);

    $response = $this->actingAs($buyer)->post(route('publication-buy', $publication->id), [
        '_token' => csrf_token(),
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('Tu rol no te permite realizar compras');
});

test('PUB-BUY-007: Compra redirige cuando Auth::user() devuelve null', function () {
    $seller = makeUser(['role' => \App\Enums\RoleType::VENDEDOR->value]);
    $category = makeCategory();

    $publication = createPublicationFor($seller, $category, [
        'type' => 'producto',
        'disponibility' => true,
    ]);

    $logWarningCalled = false;
    $logWarningMessage = '';

    \Illuminate\Support\Facades\Log::shouldReceive('info')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) {
            if (str_contains($message, 'Iniciando proceso de compra')) {
                return true;
            }
            return true;
        });

    \Illuminate\Support\Facades\Log::shouldReceive('warning')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) use (&$logWarningCalled, &$logWarningMessage) {
            if (str_contains($message, 'Usuario no autenticado intentando comprar')) {
                $logWarningCalled = true;
                $logWarningMessage = $message;
                expect($message)->toContain('Usuario no autenticado intentando comprar');
            }
            return true;
        });

    \Illuminate\Support\Facades\Log::shouldReceive('error')
        ->byDefault()
        ->andReturn(true);

    \Illuminate\Support\Facades\Auth::shouldReceive('user')
        ->once()
        ->andReturn(null);

    $response = $this->from(route('publication-view', $publication->id))
        ->withoutMiddleware()
        ->post(route('publication-buy', $publication->id), [
            '_token' => csrf_token(),
        ]);

    $response->assertRedirect(route('publication-view', $publication->id));
    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('Debes iniciar sesión para comprar');
    
    expect($logWarningCalled)->toBeTrue();
    expect($logWarningMessage)->toContain('Usuario no autenticado intentando comprar');
});

test('PUB-BUY-008: Compra maneja excepciones correctamente', function () {
    $buyer = makeUser(['role' => \App\Enums\RoleType::COMPRADOR->value]);
    $seller = makeUser(['role' => \App\Enums\RoleType::VENDEDOR->value]);
    $category = makeCategory();

    $publication = createPublicationFor($seller, $category, [
        'type' => 'producto',
        'disponibility' => true,
        'price' => 150.00,
    ]);

    $publicationId = $publication->id;

    \App\Models\Purchase::creating(function ($purchase) {
        throw new \Exception('Database connection error');
    });

    \Illuminate\Support\Facades\Log::shouldReceive('info')
        ->byDefault()
        ->andReturn(true);

    $logErrorCalled = false;
    $logErrorMessage = '';

    \Illuminate\Support\Facades\Log::shouldReceive('error')
        ->byDefault()
        ->andReturnUsing(function ($message, $context = []) use (&$logErrorCalled, &$logErrorMessage) {
            if (str_contains($message, 'Error al procesar la compra')) {
                $logErrorCalled = true;
                $logErrorMessage = $message;
                expect($message)->toContain('Error al procesar la compra');
                expect($context)->toHaveKey('error');
                expect($context['error'])->toContain('Database connection error');
            }
            return true;
        });

    $response = $this->actingAs($buyer)->post(route('publication-buy', $publicationId), [
        '_token' => csrf_token(),
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect($response->getSession()->get('errors')->first('error'))
        ->toContain('Error al procesar la compra');

    expect($logErrorCalled)->toBeTrue();
    expect($logErrorMessage)->toContain('Error al procesar la compra');

    $this->assertDatabaseMissing('purchases', [
        'publication_id' => $publicationId,
        'buyer_id' => $buyer->id,
    ]);

    $this->assertDatabaseHas('publications', [
        'id' => $publicationId,
        'disponibility' => true,
    ]);

    \App\Models\Purchase::unsetEventDispatcher();
});

