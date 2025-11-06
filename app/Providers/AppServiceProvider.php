<?php

namespace App\Providers;

use App\Models\User;
use App\Models\Publication;
use App\Observers\UserObserver;
use App\Observers\PublicationObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Registrar observers
        User::observe(UserObserver::class);
        Publication::observe(PublicationObserver::class);
    }
}
