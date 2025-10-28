<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Publication extends Model
{
    use HasFactory;
    protected $fillable = [
        'code',
        'title',
        'description',
        'price',
        'location',
        'location_point',
        'disponibility',
        'category_id',
        'created_by',
        'published_at',
        'status',
        'type',
        'horario',
        'is_hidden'
    ];

    protected $casts = [
        'status' => \App\Enums\StatusType::class,
        'published_at' => 'datetime',
    ];


    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'id');
    }
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }
    public function images(): HasMany {
        return $this->hasMany(PublicationImage::class, 'publication_id', 'id');
    }

    public function moderationCases(): HasMany
    {
        return $this->hasMany(ModerationCase::class);
    }

    public function activeModerationCase(): HasMany
    {
        return $this->hasMany(ModerationCase::class)->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
    }

    public function serviceHours(): HasMany
    {
        return $this->hasMany(PublicationServiceHour::class, 'publication_id', 'id');
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    // Accessor para convertir location_point a formato JSON
    public function getLocationPointAttribute($value)
    {
        if (!$value) {
            return null;
        }

        // Si ya es un array, devolverlo tal como está
        if (is_array($value)) {
            return $value;
        }

        // Si es un objeto Point de Magellan, extraer lat y lng
        if (is_object($value) && method_exists($value, 'getLat') && method_exists($value, 'getLng')) {
            return [
                'lat' => $value->getLat(),
                'lng' => $value->getLng()
            ];
        }

        return null;
    }
}
