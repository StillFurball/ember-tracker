<?php

namespace App\Models;

use App\Enums\HabitFrequency;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\HabitFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property HabitFrequency $frequency
 * @property int $target_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'frequency', 'target_count'])]
class Habit extends Model
{
    /** @use HasFactory<HabitFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'frequency' => HabitFrequency::class,
            'target_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<HabitLog, $this>
     */
    public function logs(): HasMany
    {
        return $this->hasMany(HabitLog::class);
    }

    /**
     * Start of the day (daily) or Monday-based week (weekly) containing the given moment.
     */
    public function periodStart(CarbonInterface $moment): CarbonImmutable
    {
        $moment = CarbonImmutable::instance($moment);

        return match ($this->frequency) {
            HabitFrequency::Daily => $moment->startOfDay(),
            HabitFrequency::Weekly => $moment->startOfWeek(CarbonInterface::MONDAY),
        };
    }

    /**
     * Number of check-ins logged in the current day or week (uses the loaded logs).
     */
    public function currentPeriodCount(): int
    {
        $currentPeriodStart = $this->periodStart(now());

        return $this->logs->filter(fn (HabitLog $log) => $log->completed_at->gte($currentPeriodStart))->count();
    }

    /**
     * Consecutive periods that reached the target they were checked in against, counted back
     * from now (uses the loaded logs). An unfinished current period does not break the streak until it is over.
     */
    public function currentStreak(): int
    {
        $logsPerPeriod = $this->logs->groupBy(fn (HabitLog $log) => $this->periodStart($log->completed_at)->toDateString());
        $period = $this->periodStart(now());

        if (! $this->reachedTarget($logsPerPeriod->get($period->toDateString()))) {
            $period = $this->previousPeriod($period);
        }

        $streak = 0;

        while ($this->reachedTarget($logsPerPeriod->get($period->toDateString()))) {
            $streak++;
            $period = $this->previousPeriod($period);
        }

        return $streak;
    }

    /**
     * Check-in counts for each of the last given number of days, oldest first (uses the loaded logs).
     *
     * @return list<array{date: string, count: int}>
     */
    public function dailyHistory(int $days): array
    {
        $countsPerDay = $this->logs->countBy(fn (HabitLog $log) => $log->completed_at->toDateString());
        $today = CarbonImmutable::today();

        return array_map(function (int $daysAgo) use ($today, $countsPerDay) {
            $date = $today->subDays($daysAgo)->toDateString();

            return ['date' => $date, 'count' => $countsPerDay[$date] ?? 0];
        }, range($days - 1, 0));
    }

    /**
     * Whether a period's logs met the target recorded on them; a period with no logs never does.
     *
     * @param  Collection<int, HabitLog>|null  $periodLogs
     */
    private function reachedTarget(?Collection $periodLogs): bool
    {
        return $periodLogs !== null && $periodLogs->count() >= $periodLogs->max('target_count');
    }

    private function previousPeriod(CarbonImmutable $periodStart): CarbonImmutable
    {
        return $this->frequency === HabitFrequency::Daily ? $periodStart->subDay() : $periodStart->subWeek();
    }
}
