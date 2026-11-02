import { Form, Head, router } from '@inertiajs/react';
import { Check, Pencil } from 'lucide-react';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import { toast } from 'sonner';
import HabitCheckInController from '@/actions/App/Http/Controllers/HabitCheckInController';
import HabitController from '@/actions/App/Http/Controllers/HabitController';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { XP_PER_COMPLETION } from '@/components/level-progress';
import { StreakFlame } from '@/components/streak-flame';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    glassButton,
    glassButtonGhost,
    glassButtonOutline,
    glassCard,
    glassDialog,
    glassField,
    glassMuted,
    glassOverlay,
    glassPopover,
} from '@/lib/glass';
import { celebrate } from '@/lib/reward-burst';
import { cn } from '@/lib/utils';
import type { Habit } from '@/types';

type PageProps = { habits: Habit[] };

function HabitFields({
    habit,
    errors,
}: {
    habit?: Habit;
    errors: Partial<Record<string, string>>;
}) {
    const idPrefix = habit ? `habit-${habit.id}` : 'new-habit';

    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-name`}>Name</Label>
                <Input
                    id={`${idPrefix}-name`}
                    name="name"
                    defaultValue={habit?.name}
                    required
                    maxLength={255}
                    placeholder="e.g. Read 10 pages"
                    className={glassField}
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-frequency`}>Frequency</Label>
                <Select
                    name="frequency"
                    defaultValue={habit?.frequency ?? 'daily'}
                >
                    <SelectTrigger
                        id={`${idPrefix}-frequency`}
                        className={cn('w-full', glassField)}
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={glassPopover}>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                </Select>
                <InputError message={errors.frequency} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-target`}>Times per period</Label>
                <Input
                    id={`${idPrefix}-target`}
                    type="number"
                    name="target_count"
                    min={1}
                    max={10}
                    required
                    defaultValue={habit?.target_count ?? 1}
                    className={glassField}
                />
                <InputError message={errors.target_count} />
            </div>
        </>
    );
}

function EditHabitDialog({ habit }: { habit: Habit }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit "${habit.name}"`}
                    className={glassButtonGhost}
                >
                    <Pencil />
                </Button>
            </DialogTrigger>
            <DialogContent
                className={glassDialog}
                overlayClassName={glassOverlay}
            >
                <DialogTitle>Edit habit</DialogTitle>
                <DialogDescription className="sr-only">
                    Update the habit details.
                </DialogDescription>
                <Form
                    {...HabitController.update.form(habit.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setIsOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <HabitFields habit={habit} errors={errors} />
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

function HabitHistory({ habit }: { habit: Habit }) {
    // A weekly target spans the whole week, so any check-in fully colours a day.
    const dailyTarget = habit.frequency === 'daily' ? habit.target_count : 1;

    return (
        <div>
            <p className={cn('mb-2 text-xs', glassMuted)}>
                Last {habit.history.length} days
            </p>
            <ol className="grid grid-cols-14 gap-1">
                {habit.history.map((day) => (
                    <li
                        key={day.date}
                        title={`${day.date}: ${day.count} check-in${day.count === 1 ? '' : 's'}`}
                        className={cn(
                            'aspect-square rounded-sm',
                            day.count === 0 &&
                                'bg-slate-900/10 dark:bg-white/10',
                            day.count > 0 &&
                                day.count < dailyTarget &&
                                'bg-[#bccdf7] dark:bg-[#2b3d73]',
                            day.count >= dailyTarget &&
                                'bg-[#1a4be0] dark:bg-[#5b80f0]',
                        )}
                    >
                        <span className="sr-only">
                            {day.date}: {day.count} check-in
                            {day.count === 1 ? '' : 's'}
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function HabitCard({ habit }: { habit: Habit }) {
    const isPeriodComplete = habit.current_period_count >= habit.target_count;
    const periodLabel = habit.frequency === 'daily' ? 'today' : 'this week';

    function checkIn(event: MouseEvent<HTMLButtonElement>): void {
        celebrate(event.currentTarget, `+${XP_PER_COMPLETION} XP`);

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
        <Card className={cn('gap-4', glassCard)}>
            <CardHeader className="flex-row items-start justify-between gap-2">
                <div className="min-w-0 space-y-1.5">
                    <CardTitle className="break-words">{habit.name}</CardTitle>
                    <CardDescription className={glassMuted}>
                        {habit.target_count}×{' '}
                        {habit.frequency === 'daily' ? 'per day' : 'per week'}
                    </CardDescription>
                </div>
                <StreakFlame
                    streak={habit.streak}
                    unit={habit.frequency === 'daily' ? 'day' : 'week'}
                />
            </CardHeader>

            <CardContent className="space-y-4">
                <Button
                    className={cn(
                        'w-full',
                        isPeriodComplete ? glassButtonOutline : glassButton,
                    )}
                    variant={isPeriodComplete ? 'secondary' : 'default'}
                    disabled={isPeriodComplete}
                    onClick={checkIn}
                >
                    {isPeriodComplete ? (
                        <>
                            <Check /> Done {periodLabel}
                        </>
                    ) : (
                        `Check in (${habit.current_period_count}/${habit.target_count} ${periodLabel})`
                    )}
                </Button>

                <HabitHistory habit={habit} />

                <div className="flex justify-end gap-1">
                    <EditHabitDialog habit={habit} />
                    <ConfirmDeleteButton
                        label={`Delete "${habit.name}"`}
                        description="This habit and its whole check-in history will be permanently deleted."
                        action={HabitController.destroy.form(habit.id)}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

export default function HabitsIndex({ habits }: PageProps) {
    return (
        <>
            <Head title="Habits" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    title="Habits"
                    description={`Every check-in earns ${XP_PER_COMPLETION} XP. Keep the flame alive.`}
                />

                <Card className={glassCard}>
                    <CardHeader>
                        <CardTitle>New habit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form
                            {...HabitController.store.form()}
                            options={{ preserveScroll: true }}
                            resetOnSuccess={['name', 'target_count']}
                            className="grid gap-4 sm:grid-cols-3"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <HabitFields errors={errors} />
                                    <div className="sm:col-span-3">
                                        <Button
                                            disabled={processing}
                                            className={glassButton}
                                        >
                                            Add habit
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>

                {habits.length === 0 ? (
                    <p
                        className={cn(
                            'p-8 text-center text-sm',
                            glassCard,
                            glassMuted,
                        )}
                    >
                        No habits yet. Add one above to start a streak.
                    </p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {habits.map((habit) => (
                            <HabitCard key={habit.id} habit={habit} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

HabitsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Habits',
            href: HabitController.index(),
        },
    ],
};
