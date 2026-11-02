<?php

use App\Enums\TaskType;
use App\Jobs\SendDailyTaskReminders;
use App\Mail\TaskReminderMail;
use App\Models\Task;
use App\Models\User;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Mail;

test('one reminder is queued per user listing only their pending tasks due today', function () {
    Mail::fake();

    $user = User::factory()->create();
    $dueToday = Task::factory()->for($user)->create(['due_date' => today()]);
    Task::factory()->completed()->for($user)->create(['due_date' => today()]);
    Task::factory()->for($user)->create(['due_date' => today()->addDay()]);
    $userWithoutDueTasks = User::factory()->create();
    Task::factory()->for($userWithoutDueTasks)->create(['due_date' => today()->subDay()]);

    (new SendDailyTaskReminders)->handle();

    Mail::assertQueuedCount(1);
    Mail::assertQueued(TaskReminderMail::class, fn (TaskReminderMail $mail) => $mail->hasTo($user->email)
        && $mail->tasks->modelKeys() === [$dueToday->id]);
});

test('the reminder lists today\'s tasks by activity start or assignment deadline time', function () {
    Mail::fake();

    $user = User::factory()->create();
    $untimed = Task::factory()->for($user)->create(['due_date' => today()]);
    $dueAtFive = Task::factory()->for($user)->create(['due_date' => today(), 'end_time' => '17:00']);
    $startsAtNine = Task::factory()->for($user)->create([
        'type' => TaskType::Activity,
        'due_date' => today(),
        'start_time' => '09:00',
        'end_time' => '18:00',
    ]);

    (new SendDailyTaskReminders)->handle();

    Mail::assertQueued(TaskReminderMail::class, fn (TaskReminderMail $mail) => $mail->tasks->modelKeys() === [$startsAtNine->id, $dueAtFive->id, $untimed->id]);
});

test('the reminder email shows when each task starts or is due', function () {
    $user = User::factory()->create();
    Task::factory()->for($user)->create(['title' => 'Submit report', 'due_date' => today(), 'end_time' => '17:00']);
    Task::factory()->for($user)->create(['title' => 'Read chapter', 'due_date' => today()]);
    Task::factory()->for($user)->create([
        'title' => 'Lab session',
        'type' => TaskType::Activity,
        'due_date' => today(),
        'start_time' => '09:00',
        'end_time' => '11:00',
    ]);

    (new TaskReminderMail($user, $user->tasks()->get()))
        ->assertSeeInOrderInHtml(['Submit report', 'due by 17:00'])
        ->assertSeeInOrderInHtml(['Read chapter', 'due today'])
        ->assertSeeInOrderInHtml(['Lab session', 'starts at 09:00'])
        ->assertHasSubject('You have 3 task(s) today');
});

test('the reminder job is scheduled every day at 08:00', function () {
    $event = collect(app(Schedule::class)->events())
        ->first(fn ($event) => $event->description === SendDailyTaskReminders::class);

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('0 8 * * *');
});
