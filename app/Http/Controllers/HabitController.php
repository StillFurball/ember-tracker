<?php

namespace App\Http\Controllers;

use App\Http\Requests\HabitRequest;
use App\Models\Habit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class HabitController extends Controller
{
    /**
     * Number of days shown in each habit's history grid.
     */
    private const HISTORY_DAYS = 28;

    /**
     * Show the user's habits with their streak, current progress and recent history.
     */
    public function index(Request $request): Response
    {
        // shortcut: loads every log to compute streaks, fine for years of daily check-ins; move streaks to a cached column if habits get thousands of logs.
        $habits = $request->user()->habits()->with('logs')->latest('id')->get();

        return Inertia::render('habits/index', [
            'habits' => $habits->map(fn (Habit $habit) => [
                'id' => $habit->id,
                'name' => $habit->name,
                'frequency' => $habit->frequency,
                'target_count' => $habit->target_count,
                'current_period_count' => $habit->currentPeriodCount(),
                'streak' => $habit->currentStreak(),
                'history' => $habit->dailyHistory(self::HISTORY_DAYS),
            ]),
        ]);
    }

    /**
     * Store a new habit for the user.
     */
    public function store(HabitRequest $request): RedirectResponse
    {
        $request->user()->habits()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Habit created.')]);

        return back();
    }

    /**
     * Update a habit; a new target applies from the current period on, so earlier periods keep theirs.
     */
    public function update(HabitRequest $request, Habit $habit): RedirectResponse
    {
        DB::transaction(function () use ($request, $habit) {
            $habit->update($request->validated());

            if ($habit->wasChanged('target_count')) {
                $habit->logs()
                    ->where('completed_at', '>=', $habit->periodStart(now()))
                    ->update(['target_count' => $habit->target_count]);
            }
        });

        return back();
    }

    /**
     * Delete a habit and its history.
     */
    public function destroy(Habit $habit): RedirectResponse
    {
        $habit->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Habit deleted.')]);

        return back();
    }
}
