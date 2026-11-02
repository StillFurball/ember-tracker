import { Head, Link, router, usePage, usePoll } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { toast } from 'sonner';
import HabitCheckInController from '@/actions/App/Http/Controllers/HabitCheckInController';
import HabitController from '@/actions/App/Http/Controllers/HabitController';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import { EmberHearth } from '@/components/ember-hearth';
import { XP_PER_COMPLETION, XP_PER_LEVEL } from '@/components/level-progress';
import { flameTier, StreakFlame } from '@/components/streak-flame';
import { TaskCalendar } from '@/components/task-calendar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useNow } from '@/hooks/use-now';
import { celebrate } from '@/lib/reward-burst';
import { isTaskOverdue, taskCountdown } from '@/lib/task-deadline';
import { cn, DISPLAY_LOCALE } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { Auth, HabitFrequency, Task, TaskPriority } from '@/types';

type DashboardHabit = {
    id: number;
    name: string;
    frequency: HabitFrequency;
    target_count: number;
    current_period_count: number;
    streak: number;
};

type PageProps = {
    auth: Auth;
    habits: DashboardHabit[];
    tasksDue: Task[];
    calendar: { week_start: string; tasks: Task[] };
    stats: {
        best_streak: number;
        check_ins_this_week: number;
    };
    taskStats: {
        open_tasks: number;
        overdue_tasks: number;
    };
    week: { date: string; count: number | null }[];
};

/** The brand-blue ladder: pale tints carry the areas, the full hue only small marks. */
const elevation =
    'rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/20';
const panelSurface = cn(
    elevation,
    'border border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#10162a]',
);
const blueArea = 'bg-[#dde6fb] dark:bg-[#1a2448]';
const blueRow = 'bg-[#f3f6fe] dark:bg-[#161e38]';
const blueInk = 'text-[#123aa8] dark:text-[#a9bdf5]';

const priorityMark: Record<TaskPriority, string> = {
    high: 'bg-red-600',
    medium: 'bg-amber-500',
    low: 'bg-sky-500',
};

function todayInBrowser(): string {
    return new Date().toLocaleDateString('en-CA');
}

function dueLabel(date: string): string {
    if (date === todayInBrowser()) {
        return 'Today';
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString(DISPLAY_LOCALE, {
        day: 'numeric',
        month: 'short',
    });
}

/** One square per check-in the period asks for, filled as they are done. */
function ProgressPips({ done, target }: { done: number; target: number }) {
    return (
        <span aria-hidden className="flex gap-1">
            {Array.from({ length: target }, (_, index) => (
                <span
                    key={index}
                    className={cn(
                        'size-2.5 transition-colors duration-300',
                        index < done
                            ? 'bg-[#1a4be0] dark:bg-[#5b80f0]'
                            : 'bg-[#dde6fb] dark:bg-[#22305c]',
                    )}
                />
            ))}
        </span>
    );
}

function HabitRow({
    habit,
    onCheckedIn,
}: {
    habit: DashboardHabit;
    onCheckedIn: () => void;
}) {
    const isPeriodComplete = habit.current_period_count >= habit.target_count;
    const periodLabel = habit.frequency === 'daily' ? 'today' : 'this week';

    function checkIn(event: MouseEvent<HTMLButtonElement>): void {
        celebrate(event.currentTarget, `+${XP_PER_COMPLETION} XP`);
        onCheckedIn();

        router
            .optimistic<PageProps>((props) => ({
                habits: props.habits.map((current) =>
                    current.id === habit.id
                        ? {
                              ...current,
                              current_period_count:
                                  current.current_period_count + 1,
                          }
                        : current,
                ),
            }))
            .post(
                HabitCheckInController.store.url(habit.id),
                {},
                {
                    preserveScroll: true,
                    onError: (errors) =>
                        toast.error(errors.habit ?? 'Check-in failed.'),
                },
            );
    }

    return (
        <li
            className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5',
                blueRow,
            )}
        >
            <StreakFlame
                streak={habit.streak}
                unit={habit.frequency === 'daily' ? 'day' : 'week'}
            />
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{habit.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2">
                    <ProgressPips
                        done={Math.min(
                            habit.current_period_count,
                            habit.target_count,
                        )}
                        target={habit.target_count}
                    />
                    <span className="sr-only text-sm whitespace-nowrap text-muted-foreground tabular-nums sm:not-sr-only">
                        {habit.current_period_count} of {habit.target_count}{' '}
                        {periodLabel}
                    </span>
                </div>
            </div>
            {isPeriodComplete ? (
                <span
                    className={cn(
                        'flex min-w-20 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium',
                        blueArea,
                        blueInk,
                    )}
                >
                    <Check aria-hidden className="size-4" /> Done
                </span>
            ) : (
                <Button size="sm" onClick={checkIn} className="min-w-20">
                    Check in
                </Button>
            )}
        </li>
    );
}

function DueTaskRow({ task }: { task: Task }) {
    const checkboxRef = useRef<HTMLButtonElement>(null);
    const now = useNow();
    // An activity's start, or an assignment's deadline time.
    const time = (task.start_time ?? task.end_time)?.slice(0, 5);

    function complete(): void {
        if (checkboxRef.current) {
            celebrate(checkboxRef.current, `+${XP_PER_COMPLETION} XP`);
        }

        router
            .optimistic<PageProps>((props) => ({
                tasksDue: props.tasksDue.filter(
                    (current) => current.id !== task.id,
                ),
            }))
            .patch(
                TaskController.update.url(task.id),
                { status: 'completed' },
                { preserveScroll: true },
            );
    }

    return (
        <li
            className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5',
                blueRow,
            )}
        >
            <Checkbox
                ref={checkboxRef}
                className="size-5"
                checked={false}
                onCheckedChange={complete}
                aria-label={`Mark "${task.title}" as completed`}
            />
            <span
                aria-hidden
                className={cn('size-2.5 shrink-0', priorityMark[task.priority])}
            />
            <div className="min-w-0 flex-1">
                <p className="relative truncate">
                    {task.title}
                    <span className="sr-only">, {task.priority} priority</span>
                </p>
                <p className="mt-0.5 flex flex-wrap justify-between gap-x-2 text-sm">
                    <span className="text-muted-foreground">
                        {task.due_date && dueLabel(task.due_date)}
                        {time && `, ${time}`}
                    </span>
                    <span
                        suppressHydrationWarning
                        className={cn(
                            'font-medium tabular-nums',
                            isTaskOverdue(task, now)
                                ? 'text-red-700 dark:text-red-400'
                                : blueInk,
                        )}
                    >
                        {taskCountdown(task, now)}
                    </span>
                </p>
            </div>
        </li>
    );
}

function WeekChart({ week }: { week: PageProps['week'] }) {
    const today = todayInBrowser();
    const highest = Math.max(1, ...week.map((day) => day.count ?? 0));

    return (
        <ol className="flex h-40 items-end gap-2">
            {week.map((day) => {
                const label = new Date(
                    `${day.date}T00:00:00`,
                ).toLocaleDateString(DISPLAY_LOCALE, { weekday: 'short' });
                const isToday = day.date === today;

                return (
                    <li
                        key={day.date}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                        <span
                            className={cn(
                                'text-sm tabular-nums',
                                isToday && cn('font-medium', blueInk),
                            )}
                        >
                            {day.count ?? '–'}
                        </span>
                        <span
                            className={cn(
                                'w-full transition-[height] duration-500',
                                isToday
                                    ? 'bg-[#1a4be0] dark:bg-[#5b80f0]'
                                    : 'bg-[#bccdf7] dark:bg-[#2b3d73]',
                            )}
                            style={{
                                height: `${((day.count ?? 0) / highest) * 70}%`,
                                minHeight: day.count === null ? 0 : 4,
                            }}
                        />
                        <span
                            className={cn(
                                'text-sm',
                                isToday
                                    ? cn('font-medium', blueInk)
                                    : 'text-muted-foreground',
                            )}
                        >
                            {label}
                        </span>
                        <span className="sr-only">
                            {day.count === null
                                ? 'not yet'
                                : `${day.count} check-ins`}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

function PanelHeader({
    id,
    title,
    count,
    href,
    linkLabel,
}: {
    id: string;
    title: string;
    count?: string;
    href?: Parameters<typeof Link>[0]['href'];
    linkLabel?: string;
}) {
    return (
        <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
                <h2 id={id} className="text-sm font-semibold">
                    {title}
                </h2>
                {count && (
                    <span
                        className={cn(
                            'rounded-sm px-1.5 py-0.5 text-xs font-medium tabular-nums',
                            blueArea,
                            blueInk,
                        )}
                    >
                        {count}
                    </span>
                )}
            </div>
            {href && (
                <Link
                    href={href}
                    className={cn('text-sm hover:underline', blueInk)}
                >
                    {linkLabel}
                </Link>
            )}
        </div>
    );
}

/** Today's date with a running clock, the reference for every overdue mark on the page. */
function CurrentDateTime() {
    const now = useNow();

    return (
        <h1 className="text-2xl font-semibold tracking-tight">
            {now.toLocaleDateString(DISPLAY_LOCALE, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            })}{' '}
            <time
                suppressHydrationWarning
                className="font-normal text-muted-foreground tabular-nums"
            >
                {now.toLocaleTimeString(DISPLAY_LOCALE)}
            </time>
        </h1>
    );
}

export default function Dashboard({
    habits,
    tasksDue,
    calendar,
    stats,
    taskStats,
    week,
}: PageProps) {
    const { auth } = usePage<PageProps>().props;
    const [flareKey, setFlareKey] = useState(0);
    usePoll(60_000, { only: ['taskStats'] });
    const xp = auth.user.current_xp ?? 0;
    const level = auth.user.level ?? 1;
    const xpIntoLevel = xp % XP_PER_LEVEL;
    const tier = flameTier(stats.best_streak);
    const habitsLeft = habits.filter(
        (habit) => habit.current_period_count < habit.target_count,
    ).length;

    const tiles = [
        {
            label: 'Best streak',
            value: stats.best_streak,
            caption:
                stats.best_streak > 0
                    ? 'Your longest flame right now'
                    : 'Check in to light one',
            area: tier.tint,
            ink: tier.ink,
        },
        {
            label: 'Check-ins this week',
            value: stats.check_ins_this_week,
            caption: `${(stats.check_ins_this_week * XP_PER_COMPLETION).toLocaleString(DISPLAY_LOCALE)} XP from check-ins`,
            area: blueArea,
            ink: blueInk,
        },
        {
            label: 'Open tasks',
            value: taskStats.open_tasks,
            caption:
                taskStats.open_tasks > 0
                    ? 'Waiting on you'
                    : 'Nothing left open',
            area: blueArea,
            ink: blueInk,
        },
        {
            label: 'Overdue',
            value: taskStats.overdue_tasks,
            caption:
                taskStats.overdue_tasks > 0
                    ? 'Past their deadline'
                    : 'Nothing overdue',
            area:
                taskStats.overdue_tasks > 0
                    ? 'bg-red-50 dark:bg-red-950'
                    : 'bg-muted',
            ink:
                taskStats.overdue_tasks > 0
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-foreground',
        },
    ];

    return (
        <>
            <Head title="Dashboard" />

            <div className="relative flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <CurrentDateTime />
                    <p className="text-sm text-muted-foreground">
                        {habitsLeft > 0
                            ? `${habitsLeft} habit${habitsLeft === 1 ? '' : 's'} left to check in`
                            : habits.length > 0
                              ? 'Every habit is checked in. The flame is fed.'
                              : 'Add a habit to start your first streak.'}
                    </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                    <section
                        aria-labelledby="calendar-heading"
                        className={cn(
                            'min-w-0 p-4 lg:col-span-3',
                            panelSurface,
                        )}
                    >
                        <TaskCalendar
                            weekStart={calendar.week_start}
                            tasks={calendar.tasks}
                        />
                    </section>

                    <aside className="flex min-w-0 flex-col gap-4">
                        <section
                            aria-labelledby="level-heading"
                            className={cn(
                                'flex flex-col overflow-hidden transition-colors duration-700',
                                elevation,
                                tier.tint,
                            )}
                        >
                            <EmberHearth
                                streak={stats.best_streak}
                                flareKey={flareKey}
                                className="h-40 w-full"
                            />
                            <div className="space-y-3 px-4 pb-4">
                                <div className="flex items-baseline justify-between gap-2">
                                    <h2
                                        id="level-heading"
                                        className={cn(
                                            'font-display text-3xl font-light tracking-[-0.022em]',
                                            tier.ink,
                                        )}
                                    >
                                        Level {level}
                                    </h2>
                                    <span className="text-sm text-foreground/70 tabular-nums">
                                        {xp.toLocaleString(DISPLAY_LOCALE)} XP
                                    </span>
                                </div>
                                <div
                                    role="progressbar"
                                    aria-label="Progress to next level"
                                    aria-valuemin={0}
                                    aria-valuemax={XP_PER_LEVEL}
                                    aria-valuenow={xpIntoLevel}
                                    className="h-3 bg-white/80 dark:bg-black/30"
                                >
                                    <div
                                        className="h-full bg-[#1a4be0] transition-[width] duration-700 ease-out dark:bg-[#5b80f0]"
                                        style={{
                                            width: `${(xpIntoLevel / XP_PER_LEVEL) * 100}%`,
                                        }}
                                    />
                                </div>
                                <p className="text-sm text-foreground/70 tabular-nums">
                                    {XP_PER_LEVEL - xpIntoLevel} XP to level{' '}
                                    {level + 1}
                                </p>
                            </div>
                        </section>

                        <section
                            aria-labelledby="habits-heading"
                            className={cn('p-4', panelSurface)}
                        >
                            <PanelHeader
                                id="habits-heading"
                                title="Today's habits"
                                count={
                                    habits.length === 0
                                        ? undefined
                                        : habitsLeft > 0
                                          ? `${habitsLeft} left`
                                          : 'All done'
                                }
                                href={HabitController.index()}
                                linkLabel="All"
                            />
                            {habits.length === 0 ? (
                                <p
                                    className={cn(
                                        'rounded-md px-4 py-8 text-center text-sm text-muted-foreground',
                                        blueRow,
                                    )}
                                >
                                    No habits yet.{' '}
                                    <Link
                                        href={HabitController.index()}
                                        className={cn(
                                            'hover:underline',
                                            blueInk,
                                        )}
                                    >
                                        Add your first one
                                    </Link>{' '}
                                    to light the flame.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {habits.map((habit) => (
                                        <HabitRow
                                            key={habit.id}
                                            habit={habit}
                                            onCheckedIn={() =>
                                                setFlareKey((key) => key + 1)
                                            }
                                        />
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section
                            aria-labelledby="due-heading"
                            className={cn('p-4', panelSurface)}
                        >
                            <PanelHeader
                                id="due-heading"
                                title="Upcoming deadlines"
                                count={
                                    tasksDue.length > 0
                                        ? String(tasksDue.length)
                                        : undefined
                                }
                                href={TaskController.index({
                                    query: {
                                        status: 'pending',
                                        sort: 'due_date',
                                    },
                                })}
                                linkLabel="All"
                            />
                            {tasksDue.length === 0 ? (
                                <p
                                    className={cn(
                                        'rounded-md px-4 py-8 text-center text-sm text-muted-foreground',
                                        blueRow,
                                    )}
                                >
                                    No deadlines coming up.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {tasksDue.map((task) => (
                                        <DueTaskRow key={task.id} task={task} />
                                    ))}
                                </ul>
                            )}
                        </section>
                    </aside>
                </div>

                <div className="grid gap-4 lg:grid-cols-12">
                    <dl className="grid grid-cols-2 gap-4 lg:col-span-7">
                        {tiles.map((tile) => (
                            <div
                                key={tile.label}
                                className={cn(
                                    'flex flex-col justify-between gap-2 p-4 transition-colors duration-700',
                                    elevation,
                                    tile.area,
                                )}
                            >
                                <dt className="text-sm text-foreground/75">
                                    {tile.label}
                                </dt>
                                <dd>
                                    <span
                                        className={cn(
                                            'block text-3xl tabular-nums',
                                            tile.ink,
                                        )}
                                    >
                                        {tile.value}
                                    </span>
                                    <span className="text-sm text-foreground/70">
                                        {tile.caption}
                                    </span>
                                </dd>
                            </div>
                        ))}
                    </dl>

                    <section
                        aria-labelledby="week-heading"
                        className={cn('p-4 lg:col-span-5', panelSurface)}
                    >
                        <PanelHeader
                            id="week-heading"
                            title="Check-ins this week"
                        />
                        <div className={cn('rounded-md p-4', blueRow)}>
                            <WeekChart week={week} />
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
