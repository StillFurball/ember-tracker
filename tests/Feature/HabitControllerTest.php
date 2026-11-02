<?php

use App\Enums\HabitFrequency;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $this->get(route('habits.index'))->assertRedirect(route('login'));
});

describe('index', function () {
    test('only the user\'s own habits are listed with streak, progress and history', function () {
        $this->travelTo(now()->setTime(12, 0));

        $user = User::factory()->create();
        $habit = Habit::factory()->for($user)->create();
        Habit::factory()->create();
        HabitLog::factory()->for($habit)->create(['completed_at' => now()]);
        HabitLog::factory()->for($habit)->create(['completed_at' => now()->subDay()]);

        $this->actingAs($user)
            ->get(route('habits.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('habits/index')
                ->has('habits', 1)
                ->where('habits.0.id', $habit->id)
                ->where('habits.0.streak', 2)
                ->where('habits.0.current_period_count', 1)
                ->has('habits.0.history', 28)
                ->where('habits.0.history.27', ['date' => now()->toDateString(), 'count' => 1]));
    });
});

describe('store', function () {
    test('a habit can be created', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('habits.store'), ['name' => 'Meditate', 'frequency' => 'weekly', 'target_count' => 3])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $habit = $user->habits()->sole();

        expect($habit->name)->toBe('Meditate')
            ->and($habit->frequency)->toBe(HabitFrequency::Weekly)
            ->and($habit->target_count)->toBe(3);
    });

    test('name, frequency and target count are required', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('habits.store'), [])
            ->assertSessionHasErrors(['name', 'frequency', 'target_count']);
    });

    test('a target count of zero is rejected', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('habits.store'), ['name' => 'Meditate', 'frequency' => 'daily', 'target_count' => 0])
            ->assertSessionHasErrors('target_count');
    });
});

describe('update', function () {
    test('a habit can be edited', function () {
        $user = User::factory()->create();
        $habit = Habit::factory()->for($user)->create();

        $this->actingAs($user)
            ->patch(route('habits.update', $habit), ['name' => 'Stretch', 'frequency' => 'daily', 'target_count' => 2])
            ->assertSessionHasNoErrors();

        expect($habit->refresh()->name)->toBe('Stretch')
            ->and($habit->target_count)->toBe(2);
    });

    test('raising the target applies from the current period and leaves past periods as they were', function () {
        $this->travelTo(today()->setTime(12, 0));

        $user = User::factory()->create();
        $habit = Habit::factory()->for($user)->create();
        HabitLog::factory()->for($habit)->create(['completed_at' => now()]);
        HabitLog::factory()->for($habit)->create(['completed_at' => now()->subDay()]);

        $this->actingAs($user)->patch(route('habits.update', $habit), ['name' => $habit->name, 'frequency' => 'daily', 'target_count' => 2]);

        expect($habit->refresh()->load('logs')->currentStreak())->toBe(1)
            ->and($habit->currentPeriodCount())->toBe(1);

        $this->travelTo(today()->addDay()->setTime(12, 0));

        expect($habit->load('logs')->currentStreak())->toBe(0);
    });

    test('lowering the target lets check-ins already made this period count toward the streak', function () {
        $this->travelTo(today()->setTime(12, 0));

        $user = User::factory()->create();
        $habit = Habit::factory()->for($user)->create(['target_count' => 2]);
        HabitLog::factory()->for($habit)->create(['completed_at' => now()]);

        $this->actingAs($user)->patch(route('habits.update', $habit), ['name' => $habit->name, 'frequency' => 'daily', 'target_count' => 1]);

        $this->travelTo(today()->addDay()->setTime(12, 0));

        expect($habit->refresh()->load('logs')->currentStreak())->toBe(1);
    });

    test('another user\'s habit cannot be updated', function () {
        $user = User::factory()->create();
        $habit = Habit::factory()->create(['name' => 'Original']);

        $this->actingAs($user)
            ->patch(route('habits.update', $habit), ['name' => 'Hijacked', 'frequency' => 'daily', 'target_count' => 1])
            ->assertForbidden();

        expect($habit->refresh()->name)->toBe('Original');
    });
});

describe('destroy', function () {
    test('a habit and its logs can be deleted', function () {
        $user = User::factory()->create();
        $habit = Habit::factory()->for($user)->create();
        $log = HabitLog::factory()->for($habit)->create();

        $this->actingAs($user)->delete(route('habits.destroy', $habit))->assertRedirect();

        $this->assertModelMissing($habit);
        $this->assertModelMissing($log);
    });

    test('another user\'s habit cannot be deleted', function () {
        $user = User::factory()->create();
        $habit = Habit::factory()->create();

        $this->actingAs($user)->delete(route('habits.destroy', $habit))->assertForbidden();

        $this->assertModelExists($habit);
    });
});
