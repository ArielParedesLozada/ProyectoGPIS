<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use App\Enums\RoleType;
use App\Notifications\CustomVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable, TwoFactorAuthenticatable, SoftDeletes;
    protected $fillable = [
        'cedula',
        'name',
        'surname',
        'email',
        'password',
        'phone',
        'address',
        'gender',
        'role',
        'status',
        'is_active',
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
            'is_active' => 'boolean',
        ];
    }

    //Custom
    public function publications(): HasMany
    {
        return $this->hasMany(Publication::class, 'created_by', 'id');
    }

    public function moderationCases(): HasMany
    {
        return $this->hasMany(ModerationCase::class, 'assigned_moderator_id');
    }

    // Role helper methods
    public function isSuperAdmin(): bool
    {
        return $this->role === RoleType::SUPER_ADMIN->value;
    }

    public function isAdmin(): bool
    {
        return $this->role === RoleType::ADMIN->value;
    }

    public function isModerator(): bool
    {
        return $this->role === RoleType::MODERADOR->value;
    }

    public function isVendor(): bool
    {
        return $this->role === RoleType::VENDEDOR->value;
    }

    public function isBuyer(): bool
    {
        return $this->role === RoleType::COMPRADOR->value;
    }

    public function isAdministrative(): bool
    {
        return in_array($this->role, [
            RoleType::SUPER_ADMIN->value,
            RoleType::ADMIN->value,
            RoleType::MODERADOR->value
        ]);
    }

    public function canManageAdmins(): bool
    {
        return $this->isSuperAdmin();
    }

    public function canManageModerators(): bool
    {
        return $this->isSuperAdmin() || $this->isAdmin();
    }

    /**
     * Send the email verification notification.
     */
    public function sendEmailVerificationNotification()
    {
        // Usar directamente nuestro mailable personalizado
        \Illuminate\Support\Facades\Mail::to($this->email)->send(
            new \App\Mail\CustomEmailVerification($this)
        );
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }
}
