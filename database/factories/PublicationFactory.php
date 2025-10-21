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
        $author = User::where('email', 'test@example.com')->firstOrFail();
        $categories = Category::all();
        $type = fake()->randomElement(PublicationType::cases());
        return [
            'code' => fake()->uuid,
            'title' => fake()->sentence,
            'description' => fake()->paragraph,
            'price' => fake()->randomFloat(2, 10, 1000),
            'location' => Point::makeGeodetic(fake()->latitude, fake()->longitude),
            'disponibility' => true,
            'category_id' => $categories->random()->id,
            'created_by' => $author->id,
            'published_at' => today(),
            'status' => StatusType::HABILITADO->value,
            'type' => $type,
            'horario' => $type === PublicationType::SERVICE ? today() : null,
        ];
    }
}
