<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

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
});
