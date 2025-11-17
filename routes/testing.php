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
    Route::post('/reset-db', function () {
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', [
            '--seed' => request()->has('seed'),
            '--env' => 'testing',
        ]);
        return response()->json(['message' => 'Database reset successfully']);
    });
});
