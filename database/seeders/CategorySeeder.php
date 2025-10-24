<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            'Electrónicos',
            'Ropa y Accesorios',
            'Hogar y Jardín',
            'Automotriz',
            'Productos para Mascotas',
            'Inmuebles y Propiedades',
            'Deportes y Ocio',
            'Oficina y Negocios',
            'Salud y Belleza',
            'Otros / Misceláneos',
        ];

        foreach ($categories as $categoryName) {
            Category::firstOrCreate(
                ['name' => $categoryName],
                ['banned' => false]
            );
        }
    }
}
