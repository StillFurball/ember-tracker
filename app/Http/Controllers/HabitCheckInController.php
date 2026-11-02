<?php

namespace App\Http\Controllers;

use App\Models\Habit;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class HabitCheckInController extends Controller
{
    /**
     * Log a check-in for the habit and award XP, up to the habit's target for the current day or week.
     */
    public function store(Request $request, Habit $habit): RedirectResponse
    {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($request, $habit, $validated) {
            Habit::query()->whereKey($habit->id)->lockForUpdate()->first();

            $checkInsThisPeriod = $habit->logs()->where('completed_at', '>=', $habit->periodStart(now()))->count();

            if ($checkInsThisPeriod >= $habit->target_count) {
                throw ValidationException::withMessages([
                    'habit' => __('This habit is already complete for this period.'),
                ]);
            }

            $habit->logs()->create([
                'completed_at' => now(),
                'target_count' => $habit->target_count,
                'notes' => $validated['notes'] ?? null,
            ]);

            $request->user()->addXp(User::XP_PER_COMPLETION);
        });

        return back();
    }
}
