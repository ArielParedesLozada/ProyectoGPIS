<?php

use App\Models\Category;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;

// Permitir rutas de testing en desarrollo (testing, local, o cuando APP_DEBUG está activo)
// Estas rutas solo deben estar disponibles en desarrollo, nunca en producción
if (app()->environment('production')) {
    return;
}
Route::prefix('testing')->group(function () {
    Route::get('/csrf', function () {
        return response()->json(['token' => csrf_token()]);
    });
    Route::post('/user', function () {
        $data = request()->all();
        // Si se proporciona un password, hashearlo
        if (isset($data['password'])) {
            $data['password'] = \Illuminate\Support\Facades\Hash::make($data['password']);
        }
        // Asegurar que el usuario esté activo
        $data['is_active'] = true;
        if (!isset($data['status'])) {
            $data['status'] = \App\Enums\StatusType::HABILITADO->value;
        }
        $userTest = User::factory()->create($data);
        return response()->json($userTest);
    });
    Route::get('/users', function () {
        $users = User::all();
        return response()->json($users);
    });
    Route::get('/verification-url/{id}', function ($id) {
        $user = User::findOrFail($id);

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        return response()->json(['url' => $verificationUrl]);
    });
    Route::post('/category', function () {
        $category = Category::factory()->create(request()->all());
        return response()->json($category);
    });
    Route::get('/categories', function () {
        $categories = Category::all();
        return response()->json($categories);
    });
    Route::post('/publication', function () {
        $publication = Publication::factory()->create(request()->all());
        return response()->json($publication);
    });
    Route::get('/publications', function () {
        $publications = Publication::all();
        return response()->json($publications);
    });
    Route::post('/publication-image', function () {
        $publication = \App\Models\Publication::findOrFail(request('publication_id'));
        $image = \App\Models\PublicationImage::create([
            'publication_id' => $publication->id,
            'image_url' => request('image_url', 'publications/test-image.png'),
        ]);
        return response()->json($image);
    });
    Route::get('/publication/{id}', function ($id) {
        $publication = Publication::findOrFail($id);
        return response()->json($publication);
    });
    Route::patch('/user/{id}', function ($id) {
        $user = User::findOrFail($id);
        $user->update(request()->all());
        return response()->json($user);
    });
    Route::post('/moderation-case', function () {
        $data = request()->all();
        
        try {
            // Crear el caso SIN eventos para evitar observers/events que puedan causar hang
            $case = \App\Models\ModerationCase::withoutEvents(function () use ($data) {
                return \App\Models\ModerationCase::create([
                    'publication_id' => $data['publication_id'],
                    'source' => $data['source'] ?? 'auto',
                    'status' => $data['status'] ?? 'pending',
                    'assigned_moderator_id' => $data['assigned_moderator_id'] ?? null,
                    'assigned_at' => $data['assigned_at'] ?? now(),
                ]);
            });
            
            return response()->json($case);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    });
    Route::get('/moderation-cases', function () {
        $cases = \App\Models\ModerationCase::all();
        return response()->json($cases);
    });
    Route::post('/moderation/{id}/dismiss', function ($id) {
        $case = \App\Models\ModerationCase::with('publication')->findOrFail($id);
        $notes = request('notes', 'Caso descartado por testing');
        
        \Illuminate\Support\Facades\DB::beginTransaction();
        
        try {
            // Verificar si la publicación está oculta antes de restaurarla
            $wasHidden = $case->publication->is_hidden;
            
            // Si la publicación está oculta, restaurarla al descartar el caso
            if ($wasHidden) {
                $publication = $case->publication;
                $publication->is_hidden = false;
                $publication->save();
            }
            
            // Actualizar el caso
            $case->update([
                'status' => 'dismissed',
                'resolution_notes' => $notes,
                'resolved_at' => now(),
            ]);
            
            // Registrar la acción en el historial
            \App\Models\ModerationAction::create([
                'moderation_case_id' => $case->id,
                'moderator_id' => $case->assigned_moderator_id ?? 1, // Usar el moderador asignado o un valor por defecto
                'action_type' => 'dismiss_case',
                'action_description' => $wasHidden ? 'Caso descartado - Publicación restaurada' : 'Caso descartado',
                'metadata' => [
                    'notes' => $notes,
                    'publication_restored' => $wasHidden,
                ]
            ]);
            
            \Illuminate\Support\Facades\DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Caso descartado correctamente',
                'case' => $case->fresh(),
            ]);
            
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json([
                'success' => false,
                'error' => 'Error al descartar el caso: ' . $e->getMessage()
            ], 500);
        }
    });
    Route::post('/moderation/{id}/hide-publication', function ($id) {
        $case = \App\Models\ModerationCase::with('publication')->findOrFail($id);
        $reason = request('reason', 'Ocultada por testing');
        
        \Illuminate\Support\Facades\DB::beginTransaction();
        
        try {
            // Ocultar la publicación
            $publication = $case->publication;
            $publication->is_hidden = true;
            $publication->save();
            
            // Actualizar el caso
            $case->update([
                'status' => 'action_taken',
                'resolution_notes' => $reason,
                'resolved_at' => now(),
            ]);
            
            // Registrar la acción en el historial
            \App\Models\ModerationAction::create([
                'moderation_case_id' => $case->id,
                'moderator_id' => $case->assigned_moderator_id ?? 1, // Usar el moderador asignado o un valor por defecto
                'action_type' => 'hide_publication',
                'action_description' => 'Publicación ocultada por moderación',
                'metadata' => [
                    'publication_id' => $publication->id,
                    'publication_title' => $publication->title,
                    'reason' => $reason,
                ]
            ]);
            
            \Illuminate\Support\Facades\DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Publicación ocultada correctamente',
                'publication' => $publication->fresh(),
                'case' => $case->fresh(),
            ]);
            
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json([
                'success' => false,
                'error' => 'Error al ocultar la publicación: ' . $e->getMessage()
            ], 500);
        }
    });
    Route::post('/moderation-appeal', function () {
        $data = request()->all();
        // Mapear user_id a appealer_id si es necesario
        if (isset($data['user_id']) && !isset($data['appealer_id'])) {
            $data['appealer_id'] = $data['user_id'];
            unset($data['user_id']);
        }
        // Remover campos que no existen en la tabla
        unset($data['status'], $data['final_decision']);
        $appeal = \App\Models\ModerationAppeal::create($data);
        return response()->json($appeal);
    });
    Route::get('/moderation-appeals', function () {
        $appeals = \App\Models\ModerationAppeal::all();
        return response()->json($appeals);
    });
    Route::post('/moderation-action', function () {
        $data = request()->all();
        $action = \App\Models\ModerationAction::create($data);
        return response()->json($action);
    });
    Route::post('/reassign-cases', function () {
        $fromModeratorId = request('from_moderator_id');
        $toModeratorId = request('to_moderator_id');
        
        // Buscar casos (sin incluir eliminados por defecto)
        $cases = \App\Models\ModerationCase::where('assigned_moderator_id', $fromModeratorId)
            ->whereIn('status', ['pending', 'in_review', 'appealed'])
            ->get();
        
        $reassigned = 0;
        foreach ($cases as $case) {
            $case->update([
                'assigned_moderator_id' => $toModeratorId,
                'assigned_at' => now(),
            ]);
            $reassigned++;
        }
        
        return response()->json([
            'message' => "Reasignados {$reassigned} casos",
            'reassigned_count' => $reassigned,
            'found_cases' => $cases->count(),
            'from_moderator_id' => $fromModeratorId,
            'to_moderator_id' => $toModeratorId,
        ]);
    });
    Route::post('/login', function () {
        $email = request('email');
        $password = request('password');
        
        $user = \App\Models\User::where('email', $email)->first();
        
        if (!$user || !\Illuminate\Support\Facades\Hash::check($password, $user->password)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }
        
        if (!$user->is_active) {
            return response()->json(['error' => 'User is inactive'], 403);
        }
        
        \Illuminate\Support\Facades\Auth::login($user);
        request()->session()->regenerate();
        
        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
        ]);
    });
    Route::post('/reset-db', function () {
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', [
            '--seed' => request()->has('seed'),
            '--env' => 'testing',
        ]);
        return response()->json(['message' => 'Database reset successfully']);
    });
});
