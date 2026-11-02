<?php

namespace Database\Factories;

use App\Enums\HabitFrequency;
use App\Models\Habit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Habit>
 */
class HabitFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->randomElement(['Read 10 pages', 'Drink water', 'Meditate', 'Go for a walk', 'Stretch']),
            'frequency' => HabitFrequency::Daily,
            'target_count' => 1,
        ];
    }

    /**
     * Indicate that the habit is tracked per week with the given target.
     */
    public function weekly(int $targetCount = 3): static
    {
        return $this->state(fn (array $attributes) => [
            'frequency' => HabitFrequency::Weekly,
            'target_count' => $targetCount,
        ]);
    }
}
