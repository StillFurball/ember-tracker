<?php

namespace Database\Factories;

use App\Enums\TaskPriority;
use App\Enums\TaskRecurrence;
use App\Enums\TaskStatus;
use App\Enums\TaskType;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
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
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'type' => TaskType::Assignment,
            'priority' => fake()->randomElement(TaskPriority::cases()),
            'status' => TaskStatus::Pending,
            'recurrence' => TaskRecurrence::None,
            'due_date' => fake()->optional()->dateTimeBetween('-1 week', '+2 weeks'),
        ];
    }

    /**
     * Indicate that the task is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TaskStatus::Completed,
        ]);
    }

    /**
     * Indicate that the task repeats on the given schedule.
     */
    public function repeating(TaskRecurrence $recurrence = TaskRecurrence::Weekly): static
    {
        return $this->state(fn (array $attributes) => [
            'recurrence' => $recurrence,
        ]);
    }
}
