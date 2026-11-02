<?php

namespace App\Jobs;

use App\Enums\TaskStatus;
use App\Mail\TaskReminderMail;
use App\Models\User;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;

class SendDailyTaskReminders implements ShouldQueue
{
    use Queueable;

    /**
     * Queue one reminder email per user who has pending tasks today, listed by activity start
     * or assignment deadline time, with untimed deadlines last.
     */
    public function handle(): void
    {
        $pendingDueToday = fn (Builder $query) => $query
            ->where('status', TaskStatus::Pending)
            ->whereDate('due_date', today());

        User::query()
            ->whereHas('tasks', $pendingDueToday)
            ->with(['tasks' => fn (Builder $query) => $pendingDueToday($query)->orderByRaw("coalesce(start_time, end_time, '23:59:59')")])
            ->chunkById(100, function (Collection $users) {
                foreach ($users as $user) {
                    Mail::to($user)->send(new TaskReminderMail($user, $user->tasks));
                }
            });
    }
}
