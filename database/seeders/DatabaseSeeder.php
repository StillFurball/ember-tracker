<?php

namespace Database\Seeders;

use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        Task::factory(6)->for($user)->create();
        Task::factory(2)->completed()->for($user)->create();

        $dailyHabit = Habit::factory()->for($user)->create(['name' => 'Read 10 pages']);
        Habit::factory()->weekly(3)->for($user)->create(['name' => 'Go to the gym']);

        foreach (range(1, 8) as $daysAgo) {
            HabitLog::factory()->for($dailyHabit)->create(['completed_at' => now()->subDays($daysAgo)]);
        }
    }
}
