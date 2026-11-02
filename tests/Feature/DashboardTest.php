<?php

use App\Enums\TaskType;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('the dashboard shows the user\'s habits, upcoming deadlines and this week\'s numbers', function () {
    $this->travelTo(now()->startOfWeek()->addDays(2)->setTime(12, 0));

    $user = User::factory()->create();
    $habit = Habit::factory()->for($user)->create();
    HabitLog::factory()->for($habit)->create(['completed_at' => now()]);
    HabitLog::factory()->for($habit)->create(['completed_at' => now()->subDay()]);
    HabitLog::factory()->for($habit)->create(['completed_at' => now()->subWeek()]);
    $overdue = Task::factory()->for($user)->create(['due_date' => today()->subDay(), 'priority' => 'low']);
    $dueToday = Task::factory()->for($user)->create(['due_date' => today(), 'priority' => 'high']);
    $dueTomorrow = Task::factory()->for($user)->create(['due_date' => today()->addDay()]);
    Task::factory()->completed()->for($user)->create(['due_date' => today()]);
    Task::factory()->create(['due_date' => today()]);
    Habit::factory()->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('habits', 1)
            ->where('habits.0.streak', 2)
            ->where('habits.0.current_period_count', 1)
            ->has('tasksDue', 3)
            ->where('tasksDue.0.id', $overdue->id)
            ->where('tasksDue.1.id', $dueToday->id)
            ->where('tasksDue.2.id', $dueTomorrow->id)
            ->where('stats', [
                'best_streak' => 2,
                'check_ins_this_week' => 2,
            ])
            ->where('taskStats', [
                'open_tasks' => 3,
                'overdue_tasks' => 1,
            ])
            ->has('week', 7)
            ->where('week.2', ['date' => today()->toDateString(), 'count' => 1])
            ->where('week.3.count', null));
});

test('deadlines on the same day are ordered by activity start or assignment deadline time', function () {
    $this->travelTo(today()->setTime(8, 0));

    $user = User::factory()->create();
    $untimed = Task::factory()->for($user)->create(['due_date' => today(), 'priority' => 'high']);
    $dueAtFive = Task::factory()->for($user)->create(['due_date' => today(), 'end_time' => '17:00', 'priority' => 'high']);
    $startsAtNine = Task::factory()->for($user)->create([
        'type' => TaskType::Activity,
        'due_date' => today(),
        'start_time' => '09:00',
        'end_time' => '18:00',
        'priority' => 'low',
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tasksDue.0.id', $startsAtNine->id)
            ->where('tasksDue.1.id', $dueAtFive->id)
            ->where('tasksDue.2.id', $untimed->id));
});

test('overdue tasks cannot crowd upcoming deadlines out of the panel', function () {
    $this->travelTo(today()->setTime(12, 0));

    $user = User::factory()->create();
    Task::factory()->for($user)->create(['due_date' => today()->subDays(3)]);
    $twoDaysOverdue = Task::factory()->for($user)->create(['due_date' => today()->subDays(2)]);
    $oneDayOverdue = Task::factory()->for($user)->create(['due_date' => today()->subDay()]);
    $overdueToday = Task::factory()->for($user)->create(['due_date' => today(), 'end_time' => '11:00']);
    $dueLaterToday = Task::factory()->for($user)->create(['due_date' => today(), 'end_time' => '13:00']);
    $dueTodayUntimed = Task::factory()->for($user)->create(['due_date' => today()]);
    $dueTomorrow = Task::factory()->for($user)->create(['due_date' => today()->addDay()]);
    Task::factory()->for($user)->create(['due_date' => today()->addDays(2)]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where(
            'tasksDue',
            fn ($tasks) => $tasks->pluck('id')->all() === [
                $overdueToday->id,
                $oneDayOverdue->id,
                $twoDaysOverdue->id,
                $dueLaterToday->id,
                $dueTodayUntimed->id,
                $dueTomorrow->id,
            ],
        ));
});

test('the poll reload returns the task numbers without loading habit logs', function () {
    $this->travelTo(today()->setTime(12, 0));

    $user = User::factory()->create();
    HabitLog::factory()->for(Habit::factory()->for($user))->create();
    Task::factory()->for($user)->create(['due_date' => today()->subDay()]);
    Task::factory()->for($user)->create(['due_date' => today()->addDay()]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(function (Assert $page) {
            DB::enableQueryLog();

            $page->reloadOnly('taskStats', fn (Assert $reload) => $reload
                ->where('taskStats', ['open_tasks' => 2, 'overdue_tasks' => 1])
                ->missing('habits')
                ->missing('stats'));
        });

    expect(collect(DB::getQueryLog())->pluck('query')->filter(fn (string $query) => str_contains($query, 'habit_logs')))->toBeEmpty();
});

test('a task counts as overdue only once its end or deadline time has passed', function () {
    $this->travelTo(today()->setTime(12, 0));

    $user = User::factory()->create();
    $activity = ['type' => TaskType::Activity, 'due_date' => today()];

    Task::factory()->for($user)->create(['due_date' => today()->subDay()]);
    Task::factory()->for($user)->create(['due_date' => today(), 'end_time' => '11:59']);
    Task::factory()->for($user)->create([...$activity, 'start_time' => '09:00', 'end_time' => '11:00']);

    Task::factory()->for($user)->create(['due_date' => today(), 'end_time' => '12:00']);
    Task::factory()->for($user)->create(['due_date' => today(), 'end_time' => '13:00']);
    Task::factory()->for($user)->create(['due_date' => today()]);
    Task::factory()->for($user)->create([...$activity, 'start_time' => '11:00', 'end_time' => '13:00']);
    Task::factory()->for($user)->create(['due_date' => today()->addDay(), 'end_time' => '09:00']);
    Task::factory()->completed()->for($user)->create(['due_date' => today(), 'end_time' => '11:00']);
    Task::factory()->create(['due_date' => today(), 'end_time' => '11:00']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('taskStats.overdue_tasks', 3));
});

test('the calendar shows the user\'s tasks for the week of the requested date', function () {
    $user = User::factory()->create();
    $monday = Task::factory()->for($user)->create(['due_date' => '2026-11-09', 'start_time' => '09:00', 'end_time' => '10:30']);
    $sunday = Task::factory()->for($user)->create(['due_date' => '2026-11-15']);
    Task::factory()->for($user)->create(['due_date' => '2026-11-08']);
    Task::factory()->for($user)->create(['due_date' => '2026-11-16']);
    Task::factory()->create(['due_date' => '2026-11-10']);

    $this->actingAs($user)
        ->get(route('dashboard', ['week' => '2026-11-12']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('calendar.week_start', '2026-11-09')
            ->has('calendar.tasks', 2)
            ->where('calendar.tasks.0.id', $sunday->id)
            ->where('calendar.tasks.1.id', $monday->id));
});

test('an invalid calendar week is rejected', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('dashboard', ['week' => 'soon']))
        ->assertSessionHasErrors('week');
});
