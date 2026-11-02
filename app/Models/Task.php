<?php

namespace App\Models;

use App\Enums\TaskPriority;
use App\Enums\TaskRecurrence;
use App\Enums\TaskStatus;
use App\Enums\TaskType;
use Carbon\CarbonImmutable;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property string|null $description
 * @property TaskType $type
 * @property TaskPriority $priority
 * @property TaskStatus $status
 * @property TaskRecurrence $recurrence
 * @property int|null $previous_task_id The repeating task this one was copied from.
 * @property Carbon|null $due_date
 * @property string|null $start_time
 * @property string|null $end_time An activity's end, or an assignment's deadline time of day.
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['title', 'description', 'type', 'priority', 'status', 'recurrence', 'due_date', 'start_time', 'end_time'])]
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => TaskType::class,
            'priority' => TaskPriority::class,
            'status' => TaskStatus::class,
            'recurrence' => TaskRecurrence::class,
            'due_date' => 'date:Y-m-d',
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
     * The copy created when this repeating task was completed.
     *
     * @return HasOne<Task, $this>
     */
    public function nextOccurrence(): HasOne
    {
        return $this->hasOne(self::class, 'previous_task_id');
    }

    /**
     * The first scheduled date after today, so completing a task late doesn't create copies for the
     * dates it missed. Null when the task doesn't repeat or has no date to repeat from.
     */
    public function nextOccurrenceDate(): ?CarbonImmutable
    {
        if ($this->recurrence === TaskRecurrence::None || $this->due_date === null) {
            return null;
        }

        $date = CarbonImmutable::instance($this->due_date);

        do {
            // shortcut: a monthly task due on the 31st settles on the 28th after February instead of returning to the 31st.
            $date = match ($this->recurrence) {
                TaskRecurrence::Daily => $date->addDay(),
                TaskRecurrence::Weekly => $date->addWeek(),
                TaskRecurrence::Monthly => $date->addMonthNoOverflow(),
            };
        } while ($date->lte(today()));

        return $date;
    }

    /**
     * Create the pending copy that follows this task, unless it doesn't repeat or already has
     * one (it was completed, reopened and completed again).
     */
    public function scheduleNextOccurrence(): ?self
    {
        $nextDate = $this->nextOccurrenceDate();

        if ($nextDate === null || $this->nextOccurrence()->exists()) {
            return null;
        }

        $nextOccurrence = $this->replicate()->forceFill([
            'status' => TaskStatus::Pending,
            'due_date' => $nextDate,
            'previous_task_id' => $this->id,
        ]);
        $nextOccurrence->save();

        return $nextOccurrence;
    }

    /**
     * Tasks past their end or deadline time; a task with no time lasts until the end of its day.
     *
     * @param  Builder<Task>  $query
     */
    #[Scope]
    protected function overdue(Builder $query): void
    {
        $query->where(fn (Builder $query) => $query
            ->whereDate('due_date', '<', today())
            ->orWhere(fn (Builder $query) => $query
                ->whereDate('due_date', today())
                ->whereTime('end_time', '<', now())));
    }

    /**
     * Tasks whose end or deadline time is still ahead, including untimed tasks due today.
     * Spelled out rather than negating overdue(), which comes out NULL for a task with no end time.
     *
     * @param  Builder<Task>  $query
     */
    #[Scope]
    protected function upcoming(Builder $query): void
    {
        $query->where(fn (Builder $query) => $query
            ->whereDate('due_date', '>', today())
            ->orWhere(fn (Builder $query) => $query
                ->whereDate('due_date', today())
                ->where(fn (Builder $query) => $query
                    ->whereNull('end_time')
                    ->orWhereTime('end_time', '>=', now()))));
    }

    /**
     * Order within a day: an activity counts from its start and an assignment from its deadline
     * (end of day when untimed), with the higher priority first at the same time.
     *
     * @param  Builder<Task>  $query
     */
    #[Scope]
    protected function inDayOrder(Builder $query): void
    {
        $query
            ->orderByRaw("coalesce(start_time, end_time, '23:59:59')")
            ->orderByRaw("case priority when 'high' then 0 when 'medium' then 1 else 2 end");
    }
}
