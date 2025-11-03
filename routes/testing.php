<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;

if (!app()->environment('testing')) {
    return;
}
Route::prefix('testing')->group(function () {
    Route::get('/csrf', function () {
        return response()->json(['token' => csrf_token()]);
    });
    Route::post('/user', function () {
        $userTest = User::factory()->create(request()->all());
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
});
