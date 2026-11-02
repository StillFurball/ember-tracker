<?php

namespace Database\Factories;

use App\Models\Habit;
use App\Models\HabitLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HabitLog>
 */
class HabitLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'habit_id' => Habit::factory(),
            'completed_at' => now(),
            'target_count' => fn (array $attributes) => Habit::query()->whereKey($attributes['habit_id'])->value('target_count'),
            'notes' => null,
        ];
    }
}
