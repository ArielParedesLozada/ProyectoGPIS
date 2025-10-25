<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublicationServiceHour extends Model
{
    use HasFactory;

    protected $fillable = [
        'publication_id',
        'day_of_week',
        'open_time',
        'close_time',
    ];

    protected $casts = [
        'open_time' => 'datetime:H:i',
        'close_time' => 'datetime:H:i',
    ];

    /**
     * Relación con Publication
     */
    public function publication(): BelongsTo
    {
        return $this->belongsTo(Publication::class);
    }

    /**
     * Obtener el nombre del día en español
     */
    public function getDayNameAttribute(): string
    {
        $days = [
            1 => 'Lunes',
            2 => 'Martes',
            3 => 'Miércoles',
            4 => 'Jueves',
            5 => 'Viernes',
            6 => 'Sábado',
            7 => 'Domingo',
        ];

        return $days[$this->day_of_week] ?? 'Desconocido';
    }

    /**
     * Obtener el nombre corto del día
     */
    public function getDayShortNameAttribute(): string
    {
        $days = [
            1 => 'Lun',
            2 => 'Mar',
            3 => 'Mié',
            4 => 'Jue',
            5 => 'Vie',
            6 => 'Sáb',
            7 => 'Dom',
        ];

        return $days[$this->day_of_week] ?? '???';
    }
}