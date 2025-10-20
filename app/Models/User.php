<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable, TwoFactorAuthenticatable, Notifiable;
    protected $fillable = [
        'name',
        'surname',
        'email',
        'password',
        'phone',
        'address',
        'gender',
        'role',
        'status',
    ];
    protected $hidden = [
        'password',
        'remember_token',
        'email_verified_at'
    ];
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    //Custom
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'created_by', 'id');
    }
}
