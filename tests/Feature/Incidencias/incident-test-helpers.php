<?php

use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationCase;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Support\Str;

function createTestPublication(User $owner, Category $category, array $attributes = []): Publication
{
    return Publication::create(array_merge([
        'code' => (string) Str::uuid(),
        'title' => 'Publicación de prueba',
        'description' => 'Contenido descriptivo',
        'price' => 100,
        'location' => 'Centro, Ambato, Ecuador',
        'disponibility' => true,
        'category_id' => $category->id,
        'created_by' => $owner->id,
        'status' => StatusType::HABILITADO->value,
        'type' => 'producto',
        'published_at' => now(),
        'is_hidden' => false,
    ], $attributes));
}

function createModerationCase(Publication $publication, array $attributes = []): ModerationCase
{
    return ModerationCase::create(array_merge([
        'publication_id' => $publication->id,
        'status' => 'pending',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => null,
        'assigned_at' => null,
        'resolved_at' => null,
    ], $attributes));
}



