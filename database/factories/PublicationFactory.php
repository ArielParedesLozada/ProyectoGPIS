<?php

namespace Database\Factories;

use App\Enums\PublicationType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\User;
use Clickbar\Magellan\Data\Geometries\Point;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Publication>
 */
class PublicationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $categories = Category::all();
        $users = User::all();
        $type = fake()->randomElement(PublicationType::cases());
        
        // Generar ubicaciones reales de Costa Rica
        $lat = fake()->latitude(8.0, 11.0); // Costa Rica lat range
        $lng = fake()->longitude(-86.0, -82.0); // Costa Rica lng range
        
        return [
            'code' => fake()->uuid,
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(3),
            'price' => fake()->randomFloat(2, 1000, 50000),
            'location' => fake()->city . ', Costa Rica',
            'location_point' => Point::make($lng, $lat),
            'disponibility' => true,
            'category_id' => $categories->random()->id,
            'created_by' => $users->random()->id,
            'published_at' => fake()->dateTimeBetween('-30 days', 'now'),
            'status' => StatusType::HABILITADO->value,
            'type' => $type,
        ];
    }
}
