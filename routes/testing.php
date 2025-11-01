<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

if (!app()->environment('testing')) {
    return;
}
Route::prefix('testing')->group(function () {
    Route::post('/user', function () {
        $userTest = User::factory()->create(request()->all());
        return response()->json($userTest);
    });
});
