import { Form, Head, Link, router } from '@inertiajs/react';
import { Pencil, Repeat } from 'lucide-react';
import { useRef, useState } from 'react';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import Heading from '@/components/heading';
import { XP_PER_COMPLETION } from '@/components/level-progress';
import { TaskFields } from '@/components/task-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    glassButton,
    glassButtonGhost,
    glassButtonOutline,
    glassCard,
    glassCheckbox,
    glassChip,
    glassDialog,
    glassMuted,
    glassOverlay,
} from '@/lib/glass';
import { celebrate } from '@/lib/reward-burst';
import { isTaskOverdue } from '@/lib/task-deadline';
import { cn, DISPLAY_LOCALE } from '@/lib/utils';
import type { Task, TaskPriority, TaskSort, TaskStatus } from '@/types';

type Filters = {
    search: string | null;
    status: TaskStatus | null;
    sort: TaskSort | null;
};

type PageProps = { tasks: Task[]; filters: Filters };

const statusFilters: { label: string; value: TaskStatus | null }[] = [
    { label: 'All', value: null },
    { label: 'Pending', value: 'pending' },
    { label: 'Completed', value: 'completed' },
];

const sortOptions: { label: string; value: TaskSort | null }[] = [
    { label: 'Newest', value: null },
    { label: 'Priority', value: 'priority' },
    { label: 'Due date', value: 'due_date' },
];

const priorityBadge: Record<
    TaskPriority,
    'destructive' | 'secondary' | 'outline'
> = {
    high: 'destructive',
    medium: 'secondary',
    low: 'outline',
};

function formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString(DISPLAY_LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function EditTaskDialog({ task }: { task: Task }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit "${task.title}"`}
                    className={glassButtonGhost}
                >
                    <Pencil />
                </Button>
            </DialogTrigger>
            <DialogContent
                className={glassDialog}
                overlayClassName={glassOverlay}
            >
                <DialogTitle>Edit task</DialogTitle>
                <DialogDescription className="sr-only">
                    Update the task details.
                </DialogDescription>
                <Form
                    {...TaskController.update.form(task.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setIsOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <TaskFields task={task} errors={errors} glass />
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button
                                        variant="secondary"
                                        type="button"
                                        className={glassButtonOutline}
                                    >
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button
                                    disabled={processing}
                                    className={glassButton}
                                >
                                    Save
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function TaskRow({ task }: { task: Task }) {
    const checkboxRef = useRef<HTMLButtonElement>(null);
    const isCompleted = task.status === 'completed';
    const isOverdue = isTaskOverdue(task, new Date());
    // A completed copy has already handed over to the next one.
    const isRepeating = !isCompleted && task.recurrence !== 'none';

    function setCompleted(completed: boolean): void {
        const status: TaskStatus = completed ? 'completed' : 'pending';

        if (completed && checkboxRef.current) {
            celebrate(checkboxRef.current, `+${XP_PER_COMPLETION} XP`);
        }

        router
            .optimistic<PageProps>((props) => ({
                tasks: props.tasks.map((current) =>
                    current.id === task.id ? { ...current, status } : current,
                ),
            }))
            .patch(
                TaskController.update.url(task.id),
                { status },
                { preserveScroll: true },
            );
    }

    return (
        <li className="flex items-start gap-3 p-4">
            <Checkbox
                ref={checkboxRef}
                className={cn('mt-1 size-5', glassCheckbox)}
                checked={isCompleted}
                onCheckedChange={(checked) => setCompleted(checked === true)}
                aria-label={`Mark "${task.title}" as ${isCompleted ? 'pending' : 'completed'}`}
            />

            <div className="min-w-0 flex-1">
                <p
                    className={cn(
                        'font-medium break-words',
                        isCompleted && cn('line-through', glassMuted),
                    )}
                >
                    {task.title}
                </p>
                {task.description && (
                    <p
                        className={cn(
                            'mt-1 text-sm break-words whitespace-pre-line',
                            glassMuted,
                        )}
                    >
                        {task.description}
                    </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                        variant={priorityBadge[task.priority]}
                        className={cn(
                            'capitalize',
                            task.priority !== 'high' && glassChip,
                        )}
                    >
                        {task.priority}
                    </Badge>
                    <span className={cn('capitalize', glassMuted)}>
                        {task.type}
                    </span>
                    {task.due_date && (
                        <span
                            className={
                                isOverdue
                                    ? 'font-medium text-red-600 dark:text-red-400'
                                    : glassMuted
                            }
                        >
                            {task.type === 'assignment' && 'Due '}
                            {formatDate(task.due_date)}
                            {task.start_time
                                ? `, ${task.start_time.slice(0, 5)}–${task.end_time?.slice(0, 5)}`
                                : task.end_time &&
                                  `, ${task.end_time.slice(0, 5)}`}
                            {isOverdue && ' (overdue)'}
                        </span>
                    )}
                    {isRepeating && (
                        <span
                            className={cn(
                                'flex items-center gap-1',
                                glassMuted,
                            )}
                        >
                            <Repeat aria-hidden className="size-3" />
                            Repeats {task.recurrence}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 gap-1">
                <EditTaskDialog task={task} />
                <ConfirmDeleteButton
                    label={`Delete "${task.title}"`}
                    description={
                        isRepeating
                            ? 'This task will be permanently deleted and will stop repeating.'
                            : 'This task will be permanently deleted.'
                    }
                    action={TaskController.destroy.form(task.id)}
                />
            </div>
        </li>
    );
}

export default function TasksIndex({ tasks, filters }: PageProps) {
    const [tasksAdded, setTasksAdded] = useState(0);

    return (
        <>
            <Head title="Tasks" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    title="Tasks"
                    description={`Finish a task to earn ${XP_PER_COMPLETION} XP.`}
                />

                <Card className={glassCard}>
                    <CardHeader>
                        <CardTitle>New task</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form
                            {...TaskController.store.form()}
                            options={{ preserveScroll: true }}
                            resetOnSuccess={[
                                'title',
                                'description',
                                'due_date',
                                'start_time',
                                'end_time',
                            ]}
                            onSuccess={() =>
                                setTasksAdded((count) => count + 1)
                            }
                            className="space-y-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <TaskFields
                                        errors={errors}
                                        recurrenceResetKey={tasksAdded}
                                        glass
                                    />
                                    <Button
                                        disabled={processing}
                                        className={glassButton}
                                    >
                                        Add task
                                    </Button>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <nav
                        aria-label="Filter by status"
                        className="flex flex-wrap gap-2"
                    >
                        {statusFilters.map((filter) => (
                            <Button
                                key={filter.label}
                                asChild
                                size="sm"
                                variant={
                                    filters.status === filter.value
                                        ? 'default'
                                        : 'outline'
                                }
                                className={
                                    filters.status === filter.value
                                        ? glassButton
                                        : glassButtonOutline
                                }
                            >
                                <Link
                                    href={TaskController.index({
                                        query: {
                                            search: filters.search,
                                            status: filter.value,
                                            sort: filters.sort,
                                        },
                                    })}
                                    preserveScroll
                                    aria-current={
                                        filters.status === filter.value
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    {filter.label}
                                </Link>
                            </Button>
                        ))}
                    </nav>

                    <nav
                        aria-label="Sort tasks"
                        className="flex flex-wrap items-center gap-2"
                    >
                        <span className={cn('text-sm', glassMuted)}>Sort:</span>
                        {sortOptions.map((option) => (
                            <Button
                                key={option.label}
                                asChild
                                size="sm"
                                variant={
                                    filters.sort === option.value
                                        ? 'secondary'
                                        : 'ghost'
                                }
                                className={
                                    filters.sort === option.value
                                        ? glassButtonOutline
                                        : glassButtonGhost
                                }
                            >
                                <Link
                                    href={TaskController.index({
                                        query: {
                                            search: filters.search,
                                            status: filters.status,
                                            sort: option.value,
                                        },
                                    })}
                                    preserveScroll
                                    aria-current={
                                        filters.sort === option.value
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    {option.label}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </div>

                {filters.search && (
                    <p className={cn('text-sm', glassMuted)}>
                        Showing tasks matching “{filters.search}”.{' '}
                        <Link
                            href={TaskController.index({
                                query: {
                                    status: filters.status,
                                    sort: filters.sort,
                                },
                            })}
                            className="text-foreground underline underline-offset-4"
                        >
                            Clear search
                        </Link>
                    </p>
                )}

                {tasks.length === 0 ? (
                    <p
                        className={cn(
                            'p-8 text-center text-sm',
                            glassCard,
                            glassMuted,
                        )}
                    >
                        No tasks here yet.
                    </p>
                ) : (
                    <ul
                        className={cn(
                            'divide-y divide-slate-900/10 dark:divide-white/10',
                            glassCard,
                        )}
                    >
                        {tasks.map((task) => (
                            <TaskRow key={task.id} task={task} />
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

TasksIndex.layout = {
    breadcrumbs: [
        {
            title: 'Tasks',
            href: TaskController.index(),
        },
    ],
};
