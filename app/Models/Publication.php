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
        'horario'
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
}
