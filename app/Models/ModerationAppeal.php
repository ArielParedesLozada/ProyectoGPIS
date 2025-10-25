<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModerationAppeal extends Model
{
    use HasFactory;

    protected $fillable = [
        'moderation_case_id',
        'appealer_id',
        'reviewing_moderator_id',
        'appeal_reason',
        'review_notes',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function moderationCase(): BelongsTo
    {
        return $this->belongsTo(ModerationCase::class);
    }

    public function appealer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'appealer_id');
    }

    public function reviewingModerator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewing_moderator_id');
    }

}