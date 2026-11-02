<?php

use App\Models\Habit;
use App\Models\HabitLog;

beforeEach(function () {
    $this->travelTo(now()->startOfWeek()->addDays(2)->setTime(12, 0));
});

function logHabitAt(Habit $habit, DateTimeInterface ...$moments): void
{
    foreach ($moments as $moment) {
        HabitLog::factory()->for($habit)->create(['completed_at' => $moment]);
    }
}

test('a daily streak counts consecutive days ending today', function () {
    $habit = Habit::factory()->create();
    logHabitAt($habit, now(), now()->subDay(), now()->subDays(2), now()->subDays(4));

    expect($habit->load('logs')->currentStreak())->toBe(3);
});

test('a daily streak survives until today is over', function () {
    $habit = Habit::factory()->create();
    logHabitAt($habit, now()->subDay(), now()->subDays(2));

    expect($habit->load('logs')->currentStreak())->toBe(2);
});

test('a daily streak is broken by a missed day', function () {
    $habit = Habit::factory()->create();
    logHabitAt($habit, now()->subDays(2), now()->subDays(3));

    expect($habit->load('logs')->currentStreak())->toBe(0);
});

test('a day only counts toward the streak once its target is reached', function () {
    $habit = Habit::factory()->create(['target_count' => 2]);
    logHabitAt($habit, now(), now()->subDay(), now()->subDay(), now()->subDays(2), now()->subDays(2));

    expect($habit->load('logs')->currentStreak())->toBe(2)
        ->and($habit->currentPeriodCount())->toBe(1);
});

test('raising the target keeps the streak earned under the old target', function () {
    $habit = Habit::factory()->create();
    logHabitAt($habit, now()->subDay(), now()->subDays(2));

    $habit->update(['target_count' => 2]);

    expect($habit->load('logs')->currentStreak())->toBe(2);
});

test('a weekly streak counts consecutive weeks that reached the target', function () {
    $habit = Habit::factory()->weekly(2)->create();
    $lastWeek = now()->subWeek();
    $twoWeeksAgo = now()->subWeeks(2);
    logHabitAt($habit, now(), $lastWeek, $lastWeek->copy()->addDay(), $twoWeeksAgo, $twoWeeksAgo->copy()->addDay());

    expect($habit->load('logs')->currentStreak())->toBe(2)
        ->and($habit->currentPeriodCount())->toBe(1);
});

test('the daily history lists each of the last days with its check-in count, oldest first', function () {
    $habit = Habit::factory()->create(['target_count' => 2]);
    logHabitAt($habit, now(), now()->setTime(8, 0), now()->subDays(2));

    expect($habit->load('logs')->dailyHistory(3))->toBe([
        ['date' => now()->subDays(2)->toDateString(), 'count' => 1],
        ['date' => now()->subDay()->toDateString(), 'count' => 0],
        ['date' => now()->toDateString(), 'count' => 2],
    ]);
});
