<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ModerationCase extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'publication_id',
        'assigned_moderator_id',
        'status',
        'source',
        'report_count',
        'resolution_notes',
        'resolved_at',
        'assigned_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
        'assigned_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function publication(): BelongsTo
    {
        return $this->belongsTo(Publication::class);
    }

    public function assignedModerator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_moderator_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(ModerationReport::class);
    }

    public function actions(): HasMany
    {
        return $this->hasMany(ModerationAction::class);
    }

    public function appeals(): HasMany
    {
        return $this->hasMany(ModerationAppeal::class);
    }

    public function latestAppeal(): HasMany
    {
        return $this->hasMany(ModerationAppeal::class)->latest();
    }

    // Scopes
    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
    }

    public function scopeAssignedTo($query, $moderatorId)
    {
        return $query->where('assigned_moderator_id', $moderatorId);
    }

    public function scopeUnassigned($query)
    {
        return $query->whereNull('assigned_moderator_id');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeBySource($query, $source)
    {
        return $query->where('source', $source);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    public function scopeWithTrashed($query)
    {
        return $query->withTrashed();
    }

    public function scopeOnlyTrashed($query)
    {
        return $query->onlyTrashed();
    }
}