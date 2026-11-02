<?php

use App\Enums\TaskRecurrence;
use App\Enums\TaskStatus;
use App\Enums\TaskType;
use App\Models\Task;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $this->get(route('tasks.index'))->assertRedirect(route('login'));
});

describe('index', function () {
    test('only the user\'s own tasks are listed', function () {
        $user = User::factory()->create();
        $ownTask = Task::factory()->for($user)->create();
        Task::factory()->create();

        $this->actingAs($user)
            ->get(route('tasks.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('tasks/index')
                ->has('tasks', 1)
                ->where('tasks.0.id', $ownTask->id));
    });

    test('tasks can be filtered by status', function () {
        $user = User::factory()->create();
        Task::factory()->for($user)->create();
        $completedTask = Task::factory()->completed()->for($user)->create();

        $this->actingAs($user)
            ->get(route('tasks.index', ['status' => 'completed']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('tasks', 1)
                ->where('tasks.0.id', $completedTask->id)
                ->where('filters.status', 'completed'));
    });

    test('tasks can be sorted by priority from high to low', function () {
        $user = User::factory()->create();
        Task::factory()->for($user)->create(['priority' => 'low', 'title' => 'Low']);
        Task::factory()->for($user)->create(['priority' => 'high', 'title' => 'High']);
        Task::factory()->for($user)->create(['priority' => 'medium', 'title' => 'Medium']);

        $this->actingAs($user)
            ->get(route('tasks.index', ['sort' => 'priority']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('tasks.0.title', 'High')
                ->where('tasks.1.title', 'Medium')
                ->where('tasks.2.title', 'Low'));
    });

    test('tasks can be sorted by due date with undated tasks last', function () {
        $user = User::factory()->create();
        Task::factory()->for($user)->create(['due_date' => null, 'title' => 'Undated']);
        Task::factory()->for($user)->create(['due_date' => '2026-12-10', 'title' => 'Later']);
        Task::factory()->for($user)->create(['due_date' => '2026-12-01', 'title' => 'Sooner']);

        $this->actingAs($user)
            ->get(route('tasks.index', ['sort' => 'due_date']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('tasks.0.title', 'Sooner')
                ->where('tasks.0.due_date', '2026-12-01')
                ->where('tasks.1.title', 'Later')
                ->where('tasks.2.title', 'Undated'));
    });

    test('tasks can be searched by title', function () {
        $user = User::factory()->create();
        $match = Task::factory()->for($user)->create(['title' => 'Write quarterly report']);
        Task::factory()->for($user)->create(['title' => 'Buy milk']);
        Task::factory()->create(['title' => 'Another report']);

        $this->actingAs($user)
            ->get(route('tasks.index', ['search' => 'report']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('tasks', 1)
                ->where('tasks.0.id', $match->id)
                ->where('filters.search', 'report'));
    });

    test('an unknown sort option is rejected', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('tasks.index', ['sort' => 'title']))
            ->assertSessionHasErrors('sort');
    });
});

describe('store', function () {
    test('an assignment can be created with a deadline', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), [
                'title' => 'Write report',
                'description' => 'Quarterly numbers',
                'type' => 'assignment',
                'priority' => 'high',
                'due_date' => '2026-11-05',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $task = $user->tasks()->sole();

        expect($task->title)->toBe('Write report')
            ->and($task->type)->toBe(TaskType::Assignment)
            ->and($task->priority->value)->toBe('high')
            ->and($task->status)->toBe(TaskStatus::Pending)
            ->and($task->due_date->toDateString())->toBe('2026-11-05');
    });

    test('an activity can be scheduled from a start to an end time', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), [
                'title' => 'Standup',
                'type' => 'activity',
                'priority' => 'medium',
                'due_date' => '2026-11-05',
                'start_time' => '09:00',
                'end_time' => '09:30',
            ])
            ->assertSessionHasNoErrors();

        $task = $user->tasks()->sole();

        expect($task->type)->toBe(TaskType::Activity)
            ->and($task->start_time)->toStartWith('09:00')
            ->and($task->end_time)->toStartWith('09:30');
    });

    test('an assignment keeps a deadline time of day but drops any start time', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), [
                'title' => 'Essay',
                'type' => 'assignment',
                'priority' => 'medium',
                'due_date' => '2026-11-05',
                'start_time' => '09:00',
                'end_time' => '17:00',
            ])
            ->assertSessionHasNoErrors();

        $task = $user->tasks()->sole();

        expect($task->start_time)->toBeNull()
            ->and($task->end_time)->toStartWith('17:00');
    });

    test('an assignment deadline time of day must be a valid time', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), ['title' => 'Essay', 'type' => 'assignment', 'priority' => 'medium', 'due_date' => '2026-11-05', 'end_time' => '5pm'])
            ->assertSessionHasErrors('end_time');

        expect(Task::count())->toBe(0);
    });

    test('an invalid activity schedule is rejected', function (array $schedule, string $field) {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), ['title' => 'Standup', 'type' => 'activity', 'priority' => 'medium', ...$schedule])
            ->assertSessionHasErrors($field);

        expect(Task::count())->toBe(0);
    })->with([
        'no times' => [['due_date' => '2026-11-05'], 'start_time'],
        'end before start' => [['due_date' => '2026-11-05', 'start_time' => '10:00', 'end_time' => '09:00'], 'end_time'],
        'start without end' => [['due_date' => '2026-11-05', 'start_time' => '10:00'], 'end_time'],
        'time without date' => [['start_time' => '09:00', 'end_time' => '10:00'], 'due_date'],
        'malformed time' => [['due_date' => '2026-11-05', 'start_time' => '9am', 'end_time' => '10:00'], 'start_time'],
    ]);

    test('title, type, priority and date are required', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), [])
            ->assertSessionHasErrors(['title', 'type', 'priority', 'due_date']);

        expect(Task::count())->toBe(0);
    });

    test('an invalid type is rejected', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), ['title' => 'Task', 'type' => 'meeting', 'priority' => 'low', 'due_date' => '2026-11-05'])
            ->assertSessionHasErrors('type');
    });

    test('a task can be set to repeat', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), ['title' => 'Lecture', 'type' => 'assignment', 'priority' => 'low', 'due_date' => '2026-11-05', 'recurrence' => 'weekly'])
            ->assertSessionHasNoErrors();

        expect($user->tasks()->sole()->recurrence)->toBe(TaskRecurrence::Weekly);
    });

    test('a task does not repeat unless asked to', function () {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('tasks.store'), ['title' => 'Essay', 'type' => 'assignment', 'priority' => 'low', 'due_date' => '2026-11-05']);

        expect($user->tasks()->sole()->refresh()->recurrence)->toBe(TaskRecurrence::None);
    });

    test('an invalid recurrence is rejected', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), ['title' => 'Task', 'type' => 'assignment', 'priority' => 'low', 'due_date' => '2026-11-05', 'recurrence' => 'yearly'])
            ->assertSessionHasErrors('recurrence');
    });

    test('an invalid priority is rejected', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tasks.store'), ['title' => 'Task', 'priority' => 'urgent'])
            ->assertSessionHasErrors('priority');
    });
});

describe('update', function () {
    test('a task can be edited', function () {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create();

        $this->actingAs($user)
            ->patch(route('tasks.update', $task), ['title' => 'Renamed', 'priority' => 'low'])
            ->assertSessionHasNoErrors();

        expect($task->refresh()->title)->toBe('Renamed')
            ->and($task->priority->value)->toBe('low');
    });

    test('turning an activity into an assignment keeps its end as the deadline time', function () {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create([
            'type' => TaskType::Activity,
            'due_date' => '2026-11-05',
            'start_time' => '09:00',
            'end_time' => '10:00',
        ]);

        $this->actingAs($user)
            ->patch(route('tasks.update', $task), ['type' => 'assignment'])
            ->assertSessionHasNoErrors();

        expect($task->refresh()->type)->toBe(TaskType::Assignment)
            ->and($task->start_time)->toBeNull()
            ->and($task->end_time)->toStartWith('10:00');
    });

    test('completing a task awards XP', function () {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create();

        $this->actingAs($user)
            ->patch(route('tasks.update', $task), ['status' => 'completed'])
            ->assertSessionHasNoErrors();

        expect($task->refresh()->status)->toBe(TaskStatus::Completed)
            ->and($user->refresh()->current_xp)->toBe(User::XP_PER_COMPLETION);
    });

    test('completing a task that crosses the XP threshold raises the level', function () {
        $user = User::factory()->create(['current_xp' => User::XP_PER_LEVEL - User::XP_PER_COMPLETION, 'level' => 1]);
        $task = Task::factory()->for($user)->create();

        $this->actingAs($user)->patch(route('tasks.update', $task), ['status' => 'completed']);

        expect($user->refresh()->level)->toBe(2);
    });

    test('reopening a completed task takes the XP back', function () {
        $user = User::factory()->create(['current_xp' => User::XP_PER_LEVEL, 'level' => 2]);
        $task = Task::factory()->completed()->for($user)->create();

        $this->actingAs($user)->patch(route('tasks.update', $task), ['status' => 'pending']);

        expect($user->refresh()->current_xp)->toBe(User::XP_PER_LEVEL - User::XP_PER_COMPLETION)
            ->and($user->level)->toBe(1);
    });

    test('editing a completed task without changing its status does not award XP again', function () {
        $user = User::factory()->create();
        $task = Task::factory()->completed()->for($user)->create();

        $this->actingAs($user)->patch(route('tasks.update', $task), ['title' => 'Renamed', 'status' => 'completed']);

        expect($user->refresh()->current_xp)->toBe(0);
    });

    test('completing a repeating task schedules a copy of it and awards XP once', function () {
        $this->travelTo('2026-11-09 12:00');

        $user = User::factory()->create();
        $task = Task::factory()->repeating(TaskRecurrence::Weekly)->for($user)->create([
            'title' => 'Lecture',
            'description' => 'Room 3',
            'type' => TaskType::Activity,
            'priority' => 'high',
            'due_date' => '2026-11-09',
            'start_time' => '09:00',
            'end_time' => '10:00',
        ]);

        $this->actingAs($user)
            ->patch(route('tasks.update', $task), ['status' => 'completed'])
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Next one scheduled for 16 Nov.');

        $next = $task->nextOccurrence;

        expect($next->status)->toBe(TaskStatus::Pending)
            ->and($next->due_date->toDateString())->toBe('2026-11-16')
            ->and($next->recurrence)->toBe(TaskRecurrence::Weekly)
            ->and($next->title)->toBe('Lecture')
            ->and($next->description)->toBe('Room 3')
            ->and($next->type)->toBe(TaskType::Activity)
            ->and($next->priority->value)->toBe('high')
            ->and($next->start_time)->toStartWith('09:00')
            ->and($next->end_time)->toStartWith('10:00')
            ->and($next->user_id)->toBe($user->id)
            ->and($user->refresh()->current_xp)->toBe(User::XP_PER_COMPLETION);
    });

    test('the next occurrence falls on the first scheduled date after today', function (TaskRecurrence $recurrence, string $dueDate, string $expectedDate) {
        $this->travelTo('2026-11-11 12:00');

        $user = User::factory()->create();
        $task = Task::factory()->repeating($recurrence)->for($user)->create(['due_date' => $dueDate]);

        $this->actingAs($user)->patch(route('tasks.update', $task), ['status' => 'completed']);

        expect($task->nextOccurrence->due_date->toDateString())->toBe($expectedDate)
            ->and($user->tasks()->count())->toBe(2);
    })->with([
        'daily, due today' => [TaskRecurrence::Daily, '2026-11-11', '2026-11-12'],
        'daily, completed late' => [TaskRecurrence::Daily, '2026-11-01', '2026-11-12'],
        'weekly, completed late' => [TaskRecurrence::Weekly, '2026-10-19', '2026-11-16'],
        'weekly, completed early' => [TaskRecurrence::Weekly, '2026-11-16', '2026-11-23'],
        'monthly, due on the 31st' => [TaskRecurrence::Monthly, '2026-10-31', '2026-11-30'],
    ]);

    test('completing a task that does not repeat schedules nothing', function () {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create(['due_date' => '2026-11-09']);

        $this->actingAs($user)
            ->patch(route('tasks.update', $task), ['status' => 'completed'])
            ->assertInertiaFlashMissing('toast');

        expect($user->tasks()->count())->toBe(1);
    });

    test('completing a repeating task with no date schedules nothing', function () {
        $user = User::factory()->create();
        $task = Task::factory()->repeating()->for($user)->create(['due_date' => null]);

        $this->actingAs($user)->patch(route('tasks.update', $task), ['status' => 'completed'])->assertSessionHasNoErrors();

        expect($user->tasks()->count())->toBe(1);
    });

    test('editing a repeating task without completing it schedules nothing', function () {
        $user = User::factory()->create();
        $task = Task::factory()->repeating()->for($user)->create(['due_date' => '2026-11-09']);

        $this->actingAs($user)->patch(route('tasks.update', $task), ['title' => 'Renamed']);

        expect($user->tasks()->count())->toBe(1);
    });

    test('reopening and completing a repeating task again keeps its one next occurrence', function () {
        $user = User::factory()->create();
        $task = Task::factory()->repeating()->for($user)->create(['due_date' => '2026-11-09']);
        $this->actingAs($user);

        $this->patch(route('tasks.update', $task), ['status' => 'completed']);
        $this->patch(route('tasks.update', $task), ['status' => 'pending']);
        $this->get(route('tasks.index'));

        expect($task->nextOccurrence()->exists())->toBeTrue()
            ->and($user->refresh()->current_xp)->toBe(0);

        $this->patch(route('tasks.update', $task), ['status' => 'completed'])->assertInertiaFlashMissing('toast');

        expect($user->tasks()->count())->toBe(2)
            ->and($user->refresh()->current_xp)->toBe(User::XP_PER_COMPLETION);
    });

    test('setting a repeating task to never ends the series', function () {
        $user = User::factory()->create();
        $task = Task::factory()->repeating()->for($user)->create(['due_date' => '2026-11-09']);

        $this->actingAs($user)->patch(route('tasks.update', $task), ['recurrence' => 'none', 'status' => 'completed']);

        expect($user->tasks()->count())->toBe(1);
    });

    test('another user\'s task cannot be updated', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create(['title' => 'Original']);

        $this->actingAs($user)
            ->patch(route('tasks.update', $task), ['title' => 'Hijacked'])
            ->assertForbidden();

        expect($task->refresh()->title)->toBe('Original');
    });
});

describe('destroy', function () {
    test('a task can be deleted', function () {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create();

        $this->actingAs($user)->delete(route('tasks.destroy', $task))->assertRedirect();

        $this->assertModelMissing($task);
    });

    test('deleting a completed occurrence leaves the next one in place', function () {
        $user = User::factory()->create();
        $task = Task::factory()->completed()->repeating()->for($user)->create(['due_date' => '2026-11-09']);
        $next = $task->scheduleNextOccurrence();

        $this->actingAs($user)->delete(route('tasks.destroy', $task))->assertRedirect();

        expect($next->refresh()->previous_task_id)->toBeNull();
    });

    test('another user\'s task cannot be deleted', function () {
        $user = User::factory()->create();
        $task = Task::factory()->create();

        $this->actingAs($user)->delete(route('tasks.destroy', $task))->assertForbidden();

        $this->assertModelExists($task);
    });
});
