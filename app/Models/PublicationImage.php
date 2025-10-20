<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PublicationImage extends Model
{
    protected $table = 'publication_images';
    protected $fillable = [
        'publication_id',
        'image_url'
    ];

    public function publication()
    {
        return $this->belongsTo(Publication::class, 'publication_id', 'id');
    }
}
