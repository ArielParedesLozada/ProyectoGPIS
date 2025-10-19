<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\User;
use Clickbar\Magellan\Data\Geometries\Point;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $author = User::where('email', 'test@example.com')->firstOrFail();
        $categories = Category::all();
        return [
            'title' => fake()->sentence,
            'description' => fake()->paragraph,
            'price' => fake()->randomFloat(2, 10, 1000),
            'location' => Point::makeGeodetic(fake()->latitude, fake()->longitude),
            'disponibility' => true,
            'category_id' => $categories->random()->id,
            'created_by' => $author->id,
            'published_at' => today(),
        ];
    }
}
