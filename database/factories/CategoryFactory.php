<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        //Poca imaginacion
        $categoryFactories = [
            'Comida',
            'Muebles',
            'Inmuebles',
            'Ropa',
            'Servicio manual',
            'Peliculas'
        ];
        return [
            'name' => Arr::random($categoryFactories),
            'banned' => true
        ];
    }
}
