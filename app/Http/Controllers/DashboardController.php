<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * How many tasks the deadlines panel lists, and how many of those may be overdue.
     */
    private const DEADLINES_SHOWN = 6;

    private const OVERDUE_DEADLINES_SHOWN = 3;

    /**
     * Show today's habits, upcoming deadlines, a calendar week of tasks, and this week's numbers.
     * Props are closures so a partial reload (the poll, calendar paging) only computes what it asks for.
     */
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate(['week' => ['nullable', 'date']]);

        $user = $request->user();
        $weekStart = CarbonImmutable::now()->startOfWeek(CarbonInterface::MONDAY);
        $calendarStart = isset($validated['week'])
            ? CarbonImmutable::parse($validated['week'])->startOfWeek(CarbonInterface::MONDAY)
            : $weekStart;
        $openTasks = $user->tasks()->where('status', TaskStatus::Pending);

        $habits = function () use ($user, &$loadedHabits) {
            return $loadedHabits ??= $user->habits()->with('logs')->latest('id')->get();
        };
        $logsThisWeek = fn () => $habits()->flatMap->logs->filter(fn (HabitLog $log) => $log->completed_at->gte($weekStart));

        return Inertia::render('dashboard', [
            'habits' => fn () => $habits()->map(fn (Habit $habit) => [
                'id' => $habit->id,
                'name' => $habit->name,
                'frequency' => $habit->frequency,
                'target_count' => $habit->target_count,
                'current_period_count' => $habit->currentPeriodCount(),
                'streak' => $habit->currentStreak(),
            ]),
            'tasksDue' => fn () => $this->deadlines($openTasks),
            'calendar' => fn () => [
                'week_start' => $calendarStart->toDateString(),
                'tasks' => $user->tasks()
                    ->whereDate('due_date', '>=', $calendarStart)
                    ->whereDate('due_date', '<=', $calendarStart->addDays(6))
                    ->orderBy('start_time')
                    ->get(),
            ],
            'stats' => fn () => [
                'best_streak' => (int) $habits()->max(fn (Habit $habit) => $habit->currentStreak()),
                'check_ins_this_week' => $logsThisWeek()->count(),
            ],
            'taskStats' => fn () => [
                'open_tasks' => (clone $openTasks)->count(),
                'overdue_tasks' => (clone $openTasks)->overdue()->count(),
            ],
            'week' => function () use ($weekStart, $logsThisWeek) {
                $countsPerDay = $logsThisWeek()->countBy(fn (HabitLog $log) => $log->completed_at->toDateString());

                return collect(range(0, 6))->map(function (int $offset) use ($weekStart, $countsPerDay) {
                    $day = $weekStart->addDays($offset);

                    return [
                        'date' => $day->toDateString(),
                        'count' => $day->gt(today()) ? null : ($countsPerDay[$day->toDateString()] ?? 0),
                    ];
                });
            },
        ]);
    }

    /**
     * The most recently missed deadlines, then the nearest upcoming ones, so overdue tasks can't hide what's next.
     *
     * @param  HasMany<Task, User>  $openTasks
     * @return Collection<int, Task>
     */
    private function deadlines(HasMany $openTasks): Collection
    {
        $overdue = (clone $openTasks)
            ->overdue()
            ->orderByDesc('due_date')
            ->inDayOrder()
            ->limit(self::OVERDUE_DEADLINES_SHOWN)
            ->get();

        $upcoming = (clone $openTasks)
            ->upcoming()
            ->orderBy('due_date')
            ->inDayOrder()
            ->limit(self::DEADLINES_SHOWN - $overdue->count())
            ->get();

        return $overdue->concat($upcoming);
    }
}
