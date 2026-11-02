<?php

use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\User;

test('checking in logs the habit and awards XP', function () {
    $user = User::factory()->create();
    $habit = Habit::factory()->for($user)->create();

    $this->actingAs($user)
        ->post(route('habits.check-ins.store', $habit))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($habit->logs()->count())->toBe(1)
        ->and($user->refresh()->current_xp)->toBe(User::XP_PER_COMPLETION);
});

test('a check-in records the target it was made against', function () {
    $user = User::factory()->create();
    $habit = Habit::factory()->for($user)->create(['target_count' => 3]);

    $this->actingAs($user)->post(route('habits.check-ins.store', $habit));

    expect($habit->logs()->sole()->target_count)->toBe(3);
});

test('checking in beyond the target for the period is rejected without awarding XP', function () {
    $user = User::factory()->create();
    $habit = Habit::factory()->for($user)->create(['target_count' => 1]);
    HabitLog::factory()->for($habit)->create(['completed_at' => now()]);

    $this->actingAs($user)
        ->post(route('habits.check-ins.store', $habit))
        ->assertSessionHasErrors(['habit' => 'This habit is already complete for this period.']);

    expect($habit->logs()->count())->toBe(1)
        ->and($user->refresh()->current_xp)->toBe(0);
});

test('a weekly habit accepts check-ins until its weekly target is reached', function () {
    $this->travelTo(now()->startOfWeek()->addDays(3)->setTime(12, 0));

    $user = User::factory()->create();
    $habit = Habit::factory()->weekly(2)->for($user)->create();
    HabitLog::factory()->for($habit)->create(['completed_at' => now()->subDay()]);

    $this->actingAs($user)->post(route('habits.check-ins.store', $habit))->assertSessionHasNoErrors();
    $this->actingAs($user)->post(route('habits.check-ins.store', $habit))->assertSessionHasErrors('habit');

    expect($habit->logs()->count())->toBe(2);
});

test('another user\'s habit cannot be checked in', function () {
    $user = User::factory()->create();
    $habit = Habit::factory()->create();

    $this->actingAs($user)
        ->post(route('habits.check-ins.store', $habit))
        ->assertForbidden();

    expect($habit->logs()->count())->toBe(0);
});
