<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Inicializa los datos de prueba para apelaciones
 * Retorna un objeto con todas las propiedades necesarias
 * Nota: Solo moderadores y admins pueden acceder a las apelaciones (checkModeratorPermissions bloquea super_admin)
 * 
 * @return object{category: Category, owner: User, moderator: User, moderatorA: User, moderatorB: User, admin: User}
 */
function setupAppealTestData(): object
{
    $category = Category::factory()->create();

    $owner = User::factory()->create([
        'role' => RoleType::VENDEDOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $moderator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $moderatorA = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $moderatorB = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $admin = User::factory()->create([
        'role' => RoleType::ADMIN->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    return (object) [
        'category' => $category,
        'owner' => $owner,
        'moderator' => $moderator,
        'moderatorA' => $moderatorA,
        'moderatorB' => $moderatorB,
        'admin' => $admin,
    ];
}

function createHiddenPublicationForAppeal(User $owner, Category $category, array $attributes = []): Publication
{
    return Publication::create(array_merge([
        'code' => (string) Str::uuid(),
        'title' => 'Servicio suspendido',
        'description' => 'Contenido moderado',
        'price' => 120,
        'location' => 'Centro, Quito, Ecuador',
        'disponibility' => true,
        'category_id' => $category->id,
        'created_by' => $owner->id,
        'status' => StatusType::HABILITADO->value,
        'type' => 'producto',
        'published_at' => now()->subDay(),
        'is_hidden' => true,
    ], $attributes));
}

function createModerationCaseForAppeal(Publication $publication, User $originalModerator, array $attributes = []): ModerationCase
{
    $case = ModerationCase::create(array_merge([
        'publication_id' => $publication->id,
        'status' => 'action_taken',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $originalModerator->id,
        'assigned_at' => now()->subHours(2),
        'resolved_at' => now()->subHour(),
    ], $attributes));

    ModerationAction::create([
        'moderation_case_id' => $case->id,
        'moderator_id' => $originalModerator->id,
        'action_type' => 'hide_publication',
        'action_description' => 'Publicación ocultada por moderación',
        'metadata' => [
            'reason' => 'Contenido inapropiado',
        ],
    ]);

    return $case;
}


