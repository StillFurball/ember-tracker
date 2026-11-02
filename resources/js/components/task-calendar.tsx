import { Form, router } from '@inertiajs/react';
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Plus,
    Repeat,
} from 'lucide-react';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import { TaskFields } from '@/components/task-fields';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { useNow } from '@/hooks/use-now';
import { isTaskOverdue } from '@/lib/task-deadline';
import { cn, DISPLAY_LOCALE } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { Task, TaskPriority } from '@/types';

const FIRST_HOUR = 0;
const LAST_HOUR = 24;
const HOUR_HEIGHT = 56;
const GRID_HEIGHT = (LAST_HOUR - FIRST_HOUR) * HOUR_HEIGHT;
const DEADLINE_BAR_HEIGHT = 20;
const DEADLINE_BAR_MINUTES = (DEADLINE_BAR_HEIGHT / HOUR_HEIGHT) * 60;
const HOURS = Array.from(
    { length: LAST_HOUR - FIRST_HOUR + 1 },
    (_, index) => FIRST_HOUR + index,
);
const COLUMNS = 'grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]';

/** Pastel card with a solid left accent, picked by priority. */
const priorityTheme: Record<TaskPriority, string> = {
    high: 'border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950/70 dark:text-rose-100',
    medium: 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/70 dark:text-amber-100',
    low: 'border-sky-500 bg-sky-50 text-sky-950 dark:bg-sky-950/70 dark:text-sky-100',
};

const overdueRing = 'ring-2 ring-red-600 ring-inset dark:ring-red-400';

type PlacedTask = {
    task: Task;
    start: number;
    end: number;
    lane: number;
    lanes: number;
};

function toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
}

function hourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
}

function addDays(date: string, days: number): string {
    const day = new Date(`${date}T00:00:00`);
    day.setDate(day.getDate() + days);

    return day.toLocaleDateString('en-CA');
}

function formatDay(date: string, options: Intl.DateTimeFormatOptions): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
        DISPLAY_LOCALE,
        options,
    );
}

/** An activity's start–end, or an assignment's deadline time. */
function timeRange(task: Task): string {
    return task.start_time
        ? `${task.start_time.slice(0, 5)}–${task.end_time?.slice(0, 5)}`
        : `due ${task.end_time?.slice(0, 5)}`;
}

/**
 * Splits a day's tasks into the time grid (activities from start to end, timed assignments
 * as a small bar on their deadline) and the deadline strip (assignments with no time).
 * Overlapping tasks share the column side by side; each run of overlaps gets only as many
 * lanes as it needs.
 */
function placeDay(tasks: Task[]): { placed: PlacedTask[]; allDay: Task[] } {
    const placed: PlacedTask[] = [];
    const allDay: Task[] = [];
    let cluster: PlacedTask[] = [];
    let laneEnds: number[] = [];

    function closeCluster(): void {
        cluster.forEach((item) => {
            item.lanes = laneEnds.length;
        });
        cluster = [];
        laneEnds = [];
    }

    [...tasks]
        .sort((a, b) =>
            (a.start_time ?? a.end_time ?? '').localeCompare(
                b.start_time ?? b.end_time ?? '',
            ),
        )
        .forEach((task) => {
            if (!task.end_time) {
                allDay.push(task);

                return;
            }

            const start = Math.max(
                toMinutes(task.start_time ?? task.end_time),
                FIRST_HOUR * 60,
            );
            const end = task.start_time
                ? Math.min(toMinutes(task.end_time), LAST_HOUR * 60)
                : start + DEADLINE_BAR_MINUTES;

            if (end <= start) {
                allDay.push(task);

                return;
            }

            if (laneEnds.every((laneEnd) => laneEnd <= start)) {
                closeCluster();
            }

            let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);

            if (lane === -1) {
                lane = laneEnds.length;
            }

            laneEnds[lane] = end;
            const item = { task, start, end, lane, lanes: 0 };
            cluster.push(item);
            placed.push(item);
        });

    closeCluster();

    return { placed, allDay };
}

/** Where a card sits in its column: a block spans its times, a deadline bar starts on its deadline. */
function cardBox({ task, start, end }: PlacedTask): {
    top: number;
    height: number;
} {
    const top = ((start - FIRST_HOUR * 60) / 60) * HOUR_HEIGHT;

    if (!task.start_time) {
        return {
            top: Math.min(top, GRID_HEIGHT - DEADLINE_BAR_HEIGHT),
            height: DEADLINE_BAR_HEIGHT,
        };
    }

    return {
        top: top + 1,
        height: Math.max(((end - start) / 60) * HOUR_HEIGHT - 2, 20),
    };
}

function OverdueMark() {
    return (
        <>
            <AlertCircle
                aria-hidden
                className="mr-0.5 inline size-3 -translate-y-px text-red-600 dark:text-red-400"
            />
            <span className="sr-only">Overdue: </span>
        </>
    );
}

/** Marks an open task that will repeat; a completed copy has already handed over to the next one. */
function RepeatMark({ task }: { task: Task }) {
    if (task.recurrence === 'none' || task.status === 'completed') {
        return null;
    }

    return (
        <>
            <Repeat
                aria-hidden
                className="mr-0.5 inline size-3 -translate-y-px opacity-75"
            />
            <span className="sr-only">Repeats {task.recurrence}: </span>
        </>
    );
}

function TaskDialog({
    draft,
    onClose,
}: {
    draft: Partial<Task> | null;
    onClose: () => void;
}) {
    const isEditing = draft?.id !== undefined;

    return (
        <Dialog
            open={draft !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent>
                <DialogTitle>
                    {isEditing ? 'Edit task' : 'New task'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    {isEditing
                        ? 'Update the task details.'
                        : 'Add a task to the calendar.'}
                </DialogDescription>
                {draft && (
                    <Form
                        {...(draft.id !== undefined
                            ? TaskController.update.form(draft.id)
                            : TaskController.store.form())}
                        options={{ preserveScroll: true }}
                        onSuccess={onClose}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <TaskFields task={draft} errors={errors} />
                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button
                                            variant="secondary"
                                            type="button"
                                        >
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button disabled={processing}>
                                        {isEditing ? 'Save' : 'Add task'}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}

/**
 * A week of tasks on a 00:00–24:00 grid. Click an empty hour to schedule a task there,
 * or a card to edit it; the arrows load other weeks through a partial reload.
 */
export function TaskCalendar({
    weekStart,
    tasks,
}: {
    weekStart: string;
    tasks: Task[];
}) {
    const [draft, setDraft] = useState<Partial<Task> | null>(null);
    const now = useNow(60_000);
    const today = now.toLocaleDateString('en-CA');
    const days = Array.from({ length: 7 }, (_, index) =>
        addDays(weekStart, index),
    );
    const placedByDay = days.map((day) =>
        placeDay(tasks.filter((task) => task.due_date === day)),
    );
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const showNowLine =
        days.includes(today) &&
        nowMinutes >= FIRST_HOUR * 60 &&
        nowMinutes <= LAST_HOUR * 60;

    function showWeek(date: string): void {
        router.get(
            dashboard.url({ query: { week: date } }),
            {},
            { only: ['calendar'], preserveState: true, preserveScroll: true },
        );
    }

    function createAt(day: string, event: MouseEvent<HTMLDivElement>): void {
        const offset =
            event.clientY - event.currentTarget.getBoundingClientRect().top;
        const hour = Math.min(
            FIRST_HOUR + Math.floor(offset / HOUR_HEIGHT),
            LAST_HOUR - 1,
        );

        setDraft({
            type: 'activity',
            due_date: day,
            start_time: hourLabel(hour),
            end_time: hourLabel(hour + 1),
        });
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="calendar-heading" className="text-sm font-semibold">
                    {formatDay(days[0], { day: 'numeric', month: 'short' })} –{' '}
                    {formatDay(days[6], {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    })}
                </h2>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Previous week"
                        onClick={() => showWeek(addDays(weekStart, -7))}
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showWeek(today)}
                    >
                        Today
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Next week"
                        onClick={() => showWeek(addDays(weekStart, 7))}
                    >
                        <ChevronRight />
                    </Button>
                    <Button
                        size="sm"
                        className="ml-1"
                        onClick={() =>
                            setDraft({
                                due_date: days.includes(today)
                                    ? today
                                    : weekStart,
                            })
                        }
                    >
                        <Plus /> New task
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto overflow-y-hidden">
                <div className="min-w-[44rem] pb-3">
                    <div className={cn(COLUMNS, 'border-b')}>
                        <div />
                        {days.map((day) => (
                            <div key={day} className="py-2 text-center">
                                <span className="block text-xs text-muted-foreground uppercase">
                                    {formatDay(day, { weekday: 'short' })}
                                </span>
                                <span
                                    className={cn(
                                        'mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full text-sm font-medium tabular-nums',
                                        day === today &&
                                            'bg-[#1a4be0] text-white dark:bg-[#5b80f0]',
                                    )}
                                >
                                    {formatDay(day, { day: 'numeric' })}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className={cn(COLUMNS, 'border-b')}>
                        <div className="py-2 pr-2 text-right text-xs text-muted-foreground">
                            Deadline
                        </div>
                        {placedByDay.map(({ allDay }, index) => (
                            <div
                                key={days[index]}
                                className="min-h-10 space-y-1 border-l p-1"
                            >
                                {allDay.map((task) => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => setDraft(task)}
                                        className={cn(
                                            'block w-full truncate rounded-sm border-l-4 px-1.5 py-0.5 text-left text-xs',
                                            priorityTheme[task.priority],
                                            task.status === 'completed' &&
                                                'line-through opacity-60',
                                            isTaskOverdue(task, now) &&
                                                overdueRing,
                                        )}
                                    >
                                        {isTaskOverdue(task, now) && (
                                            <OverdueMark />
                                        )}
                                        <RepeatMark task={task} />
                                        {task.title}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div
                        className={cn(COLUMNS, 'relative')}
                        style={{ height: GRID_HEIGHT }}
                    >
                        <div className="relative">
                            {HOURS.map((hour) => (
                                <span
                                    key={hour}
                                    className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
                                    style={{
                                        top: (hour - FIRST_HOUR) * HOUR_HEIGHT,
                                    }}
                                >
                                    {hourLabel(hour)}
                                </span>
                            ))}
                        </div>

                        {placedByDay.map(({ placed }, index) => (
                            <div
                                key={days[index]}
                                onClick={(event) =>
                                    createAt(days[index], event)
                                }
                                className={cn(
                                    'relative cursor-cell border-l',
                                    days[index] === today &&
                                        'bg-[#1a4be0]/[0.03] dark:bg-[#5b80f0]/[0.05]',
                                )}
                                style={{
                                    backgroundImage:
                                        'linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
                                    backgroundSize: `100% ${HOUR_HEIGHT}px`,
                                }}
                            >
                                {placed.map((item) => {
                                    const { task, start, end, lane, lanes } =
                                        item;
                                    const isDeadlineBar = !task.start_time;
                                    const isOverdue = isTaskOverdue(task, now);

                                    return (
                                        <button
                                            key={task.id}
                                            type="button"
                                            title={`${task.title} · ${timeRange(task)}`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setDraft(task);
                                            }}
                                            className={cn(
                                                'absolute overflow-hidden border-l-4 px-1.5 text-left text-xs shadow-sm transition-shadow hover:shadow-md',
                                                isDeadlineBar
                                                    ? 'rounded-sm border-t-2'
                                                    : 'rounded-md py-1',
                                                priorityTheme[task.priority],
                                                task.status === 'completed' &&
                                                    'line-through opacity-60',
                                                isOverdue && overdueRing,
                                            )}
                                            style={{
                                                ...cardBox(item),
                                                left: `calc(${(lane / lanes) * 100}% + 2px)`,
                                                width: `calc(${100 / lanes}% - 4px)`,
                                            }}
                                        >
                                            <span className="block truncate font-medium">
                                                {isOverdue && <OverdueMark />}
                                                <RepeatMark task={task} />
                                                {isDeadlineBar &&
                                                    lanes === 1 && (
                                                        <span className="font-normal tabular-nums opacity-75">
                                                            {task.end_time?.slice(
                                                                0,
                                                                5,
                                                            )}{' '}
                                                        </span>
                                                    )}
                                                {task.title}
                                                {!isDeadlineBar &&
                                                    end - start < 45 && (
                                                        <span className="font-normal opacity-75">
                                                            {' '}
                                                            · {timeRange(task)}
                                                        </span>
                                                    )}
                                            </span>
                                            {end - start >= 45 && (
                                                <>
                                                    <span className="block truncate tabular-nums opacity-75">
                                                        {timeRange(task)}
                                                    </span>
                                                    <span className="block truncate capitalize opacity-75">
                                                        {task.priority}
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}

                        {showNowLine && (
                            <div
                                aria-hidden
                                className="pointer-events-none absolute right-0 left-14 h-0.5 bg-orange-500"
                                style={{
                                    top:
                                        ((nowMinutes - FIRST_HOUR * 60) / 60) *
                                        HOUR_HEIGHT,
                                }}
                            >
                                <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-orange-500" />
                                <span
                                    suppressHydrationWarning
                                    className="absolute top-1/2 right-full mr-1 -translate-y-1/2 rounded-sm bg-orange-700 px-1 text-xs font-medium text-white tabular-nums"
                                >
                                    {now.toLocaleTimeString(DISPLAY_LOCALE, {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TaskDialog draft={draft} onClose={() => setDraft(null)} />
        </div>
    );
}
