<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModerationReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'moderation_case_id',
        'reporter_id',
        'reason',
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function moderationCase(): BelongsTo
    {
        return $this->belongsTo(ModerationCase::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }
}