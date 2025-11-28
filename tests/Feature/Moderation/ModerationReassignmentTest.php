<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;

require_once __DIR__.'/moderation-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    $testData = setupModerationTestData();
    $this->category = $testData->category;
    $this->moderator = $testData->moderator;
    $this->anotherModerator = $testData->anotherModerator;
    $this->admin = $testData->admin;
    $this->superAdmin = $testData->superAdmin;
    $this->vendor = $testData->vendor;
});

test('MOD-087: reassignInactiveModeratorCases despacha job para admin', function () {
        Bus::fake();

        $this->actingAs($this->admin);
        $response = callModerationMethod('reassignInactiveModeratorCases', [$this->moderator->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['success'])->toBeTrue();
        expect($responseData['message'])->toBe('Reasignación iniciada. Los casos se procesarán en segundo plano.');

        // Bus::fake() puede no funcionar correctamente con reflection, así que verificamos que el método se ejecutó correctamente
        // El job se despacha dentro del método, pero puede que Bus::fake() no lo capture cuando se usa reflection
        // Verificamos que la respuesta sea exitosa en su lugar
        Bus::assertDispatched(\App\Jobs\ReassignModeratorCasesJob::class);
    });

    test('MOD-088: reassignInactiveModeratorCases requiere permisos de admin o super_admin', function () {
        Bus::fake();

        $this->actingAs($this->moderator);
        $response = callModerationMethod('reassignInactiveModeratorCases', [$this->anotherModerator->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(403);
        expect($responseData['success'])->toBeFalse();
        expect($responseData['message'])->toBe('No tienes permisos para realizar esta acción');

        Bus::assertNothingDispatched();
    });

    test('MOD-089: reassignSpecificCases reasigna casos específicos', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case1 = createModerationCase($publication, [
            'status' => 'pending',
            'assigned_moderator_id' => $this->moderator->id,
        ]);
        $case2 = createModerationCase($publication, [
            'status' => 'in_review',
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        $this->actingAs($this->admin);
        $request = \Illuminate\Http\Request::create('/', 'POST', [
            'case_ids' => [$case1->id, $case2->id],
            'reason' => 'Reasignación manual por Admin',
        ]);
        $request->setUserResolver(fn() => $this->admin);
        $request->merge([
            'case_ids' => [$case1->id, $case2->id],
            'reason' => 'Reasignación manual por Admin',
        ]);
        $response = callModerationMethod('reassignSpecificCases', [$this->anotherModerator->id], $request);
        $responseData = json_decode($response->getContent(), true);
        
        // Si hay un error, mostrar el mensaje para debugging
        if ($response->getStatusCode() !== 200) {
            dump('Error en reassignSpecificCases:', $responseData);
        }
        
        expect($response->getStatusCode())->toBe(200);
        expect($responseData['success'])->toBeTrue();
        expect($responseData['reassigned_count'])->toBe(2);

        $case1->refresh();
        $case2->refresh();
        expect($case1->assigned_moderator_id)->toBe($this->anotherModerator->id);
        expect($case2->assigned_moderator_id)->toBe($this->anotherModerator->id);
    });

    test('MOD-090: reassignSpecificCases requiere permisos de admin', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication);

        $this->actingAs($this->moderator);
        $request = \Illuminate\Http\Request::create('/', 'POST', [
            'case_ids' => [$case->id],
            'reason' => 'Intento no autorizado',
        ]);
        $request->setUserResolver(fn() => $this->moderator);
        $response = callModerationMethod('reassignSpecificCases', [$this->anotherModerator->id], $request);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(403);
        expect($responseData['success'])->toBeFalse();
        expect($responseData['message'])->toBe('Solo el Admin puede realizar reasignaciones manuales');
    });

    test('MOD-091: reassignSpecificCases valida que el moderador esté activo', function () {
        $inactiveModerator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::INHABILITADO->value,
            'is_active' => false,
        ]);

        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication);

        $this->actingAs($this->admin);
        $request = \Illuminate\Http\Request::create('/', 'POST', [
            'case_ids' => [$case->id],
            'reason' => 'Intento con moderador inactivo',
        ]);
        $request->setUserResolver(fn() => $this->admin);
        $response = callModerationMethod('reassignSpecificCases', [$inactiveModerator->id], $request);
        $responseData = json_decode($response->getContent(), true);
        
        expect($response->getStatusCode())->toBe(400);
        expect($responseData['success'])->toBeFalse();
        expect($responseData['message'])->toBe('El moderador debe estar activo para recibir casos');
    });

    test('MOD-092: reassignSpecificCases rechaza casos con estado inválido', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case1 = createModerationCase($publication, ['status' => 'pending']);
        $case2 = createModerationCase($publication, ['status' => 'closed']);

        $this->actingAs($this->admin);
        $request = \Illuminate\Http\Request::create('/', 'POST', [
            'case_ids' => [$case1->id, $case2->id],
            'reason' => 'Reasignación con caso cerrado',
        ]);
        $request->setUserResolver(fn() => $this->admin);
        $request->merge([
            'case_ids' => [$case1->id, $case2->id],
            'reason' => 'Reasignación con caso cerrado',
        ]);
        $response = callModerationMethod('reassignSpecificCases', [$this->anotherModerator->id], $request);
        $responseData = json_decode($response->getContent(), true);
        
        // Si hay un error, mostrar el mensaje para debugging
        if ($response->getStatusCode() !== 200) {
            dump('Error en reassignSpecificCases:', $responseData);
        }
        
        expect($response->getStatusCode())->toBe(200);
        expect($responseData['success'])->toBeTrue();
        expect($responseData['reassigned_count'])->toBe(1); // Solo case1 se reasigna
        expect($responseData['errors'])->toBeArray();
        expect(count($responseData['errors']))->toBe(1); // case2 tiene error
        expect($responseData['errors'][0])->toContain('no puede ser reasignado');
    });

    test('MOD-093: getReassignedCasesFromModerator retorna casos reasignados', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->anotherModerator->id,
        ]);

        createModerationAction($case, $this->moderator, 'reassign_from_inactive_moderator', [
            'original_moderator_id' => $this->moderator->id,
        ]);

        $this->actingAs($this->admin);
        $response = callModerationMethod('getReassignedCasesFromModerator', [$this->moderator->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData)->toHaveCount(1);
        expect($responseData[0]['id'])->toBe($case->id);
    });

    test('MOD-094: reassignInactiveModeratorCases maneja excepciones', function () {
        // Forzar excepción en el dispatch del job
        Bus::fake();
        
        // Mock del job para que lance una excepción
        Bus::shouldReceive('dispatch')->andThrow(new \Exception('Job dispatch error'));

        $this->actingAs($this->admin);
        $response = callModerationMethod('reassignInactiveModeratorCases', [$this->moderator->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(500);
        expect($responseData['success'])->toBeFalse();
        expect($responseData['message'])->toContain('Error al iniciar la reasignación');
    });

    test('MOD-095: reassignSpecificCases maneja excepciones en casos individuales', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case1 = createModerationCase($publication, ['status' => 'pending']);
        $case2 = createModerationCase($publication, ['status' => 'pending']);
        
        // Eliminar case2 para forzar excepción cuando se intente reasignar
        $case2Id = $case2->id;
        $case2->delete();

        $this->actingAs($this->admin);
        $request = \Illuminate\Http\Request::create('/', 'POST', [
            'case_ids' => [$case1->id, $case2Id],
            'reason' => 'Reasignación con caso eliminado',
        ]);
        $request->setUserResolver(fn() => $this->admin);
        $request->merge([
            'case_ids' => [$case1->id, $case2Id],
            'reason' => 'Reasignación con caso eliminado',
        ]);
        $response = callModerationMethod('reassignSpecificCases', [$this->anotherModerator->id], $request);
        $responseData = json_decode($response->getContent(), true);
        
        expect($response->getStatusCode())->toBe(200);
        expect($responseData['success'])->toBeTrue();
        expect($responseData['reassigned_count'])->toBe(1); // Solo case1 se reasigna
        expect($responseData['errors'])->toBeArray();
        expect(count($responseData['errors']))->toBeGreaterThanOrEqual(1); // case2 tiene error
    });

    test('MOD-096: reassignCaseToAvailableModerator asigna caso a moderador disponible', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'status' => 'pending',
            'assigned_moderator_id' => null,
        ]);

        // Usar reflection para llamar al método privado
        $controller = new \App\Http\Controllers\ModerationController();
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('reassignCaseToAvailableModerator');
        $method->setAccessible(true);

        $result = $method->invoke($controller, $case);

        // Verificar que se asignó un moderador
        $case->refresh();
        expect($case->assigned_moderator_id)->not->toBeNull();
        expect($result)->not->toBeNull();
        expect($result->id)->toBe($case->assigned_moderator_id);
    });

    test('MOD-097: reassignCaseToAvailableModerator retorna null cuando no hay moderadores disponibles', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'status' => 'pending',
            'assigned_moderator_id' => null,
        ]);

        // Desactivar todos los moderadores
        User::whereIn('role', ['moderador', 'admin'])->update(['is_active' => false]);

        // Usar reflection para llamar al método privado
        $controller = new \App\Http\Controllers\ModerationController();
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('reassignCaseToAvailableModerator');
        $method->setAccessible(true);

        $result = $method->invoke($controller, $case);

        // Verificar que no se asignó ningún moderador
        expect($result)->toBeNull();
        $case->refresh();
    expect($case->assigned_moderator_id)->toBeNull();
});

