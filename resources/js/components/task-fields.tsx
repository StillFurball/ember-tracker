import { useState } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { glassField, glassPopover, glassToggle } from '@/lib/glass';
import { cn } from '@/lib/utils';
import type { Task, TaskType } from '@/types';

const textareaClassName =
    'min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

/**
 * The task form's inputs, shared by the tasks page and the dashboard calendar.
 * Changing recurrenceResetKey puts Repeats back to its default: Form's per-field
 * reset would change the hidden select without updating what the Radix one shows.
 * The tasks page passes glass for its frosted look; the dashboard calendar stays solid.
 */
export function TaskFields({
    task,
    errors,
    recurrenceResetKey,
    glass = false,
}: {
    task?: Partial<Task>;
    errors: Partial<Record<string, string>>;
    recurrenceResetKey?: number;
    glass?: boolean;
}) {
    const idPrefix = task?.id ? `task-${task.id}` : 'new-task';
    const [type, setType] = useState<TaskType>(task?.type ?? 'assignment');
    const isActivity = type === 'activity';
    const fieldClassName = glass ? glassField : undefined;
    const popoverClassName = glass ? glassPopover : undefined;

    return (
        <>
            <div className="grid gap-2">
                <Label id={`${idPrefix}-type`}>Category</Label>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    value={type}
                    onValueChange={(value) =>
                        value && setType(value as TaskType)
                    }
                    aria-labelledby={`${idPrefix}-type`}
                    className={cn('w-full', glass && 'rounded-xl')}
                >
                    <ToggleGroupItem
                        value="activity"
                        className={cn('flex-1', glass && glassToggle)}
                    >
                        Activity (start–end)
                    </ToggleGroupItem>
                    <ToggleGroupItem
                        value="assignment"
                        className={cn('flex-1', glass && glassToggle)}
                    >
                        Assignment (deadline)
                    </ToggleGroupItem>
                </ToggleGroup>
                <input type="hidden" name="type" value={type} />
                <InputError message={errors.type} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-title`}>Title</Label>
                <Input
                    id={`${idPrefix}-title`}
                    name="title"
                    defaultValue={task?.title}
                    required
                    maxLength={255}
                    placeholder="What needs doing?"
                    className={fieldClassName}
                />
                <InputError message={errors.title} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-description`}>Description</Label>
                <textarea
                    id={`${idPrefix}-description`}
                    name="description"
                    defaultValue={task?.description ?? ''}
                    maxLength={5000}
                    placeholder="Optional details"
                    className={cn(textareaClassName, fieldClassName)}
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-due-date`}>
                        {isActivity ? 'Date' : 'Deadline'}
                    </Label>
                    <Input
                        id={`${idPrefix}-due-date`}
                        type="date"
                        name="due_date"
                        defaultValue={task?.due_date ?? ''}
                        required
                        className={fieldClassName}
                    />
                    <InputError message={errors.due_date} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-priority`}>Priority</Label>
                    <Select
                        name="priority"
                        defaultValue={task?.priority ?? 'medium'}
                    >
                        <SelectTrigger
                            id={`${idPrefix}-priority`}
                            className={cn('w-full', fieldClassName)}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={popoverClassName}>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.priority} />
                </div>

                {isActivity ? (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor={`${idPrefix}-start-time`}>
                                Starts at
                            </Label>
                            <Input
                                id={`${idPrefix}-start-time`}
                                type="time"
                                name="start_time"
                                defaultValue={
                                    task?.start_time?.slice(0, 5) ?? ''
                                }
                                required
                                className={fieldClassName}
                            />
                            <InputError message={errors.start_time} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor={`${idPrefix}-end-time`}>
                                Ends at
                            </Label>
                            <Input
                                id={`${idPrefix}-end-time`}
                                type="time"
                                name="end_time"
                                defaultValue={task?.end_time?.slice(0, 5) ?? ''}
                                required
                                className={fieldClassName}
                            />
                            <InputError message={errors.end_time} />
                        </div>
                    </>
                ) : (
                    <div className="grid gap-2">
                        <Label htmlFor={`${idPrefix}-due-time`}>
                            Due by (optional)
                        </Label>
                        <Input
                            id={`${idPrefix}-due-time`}
                            type="time"
                            name="end_time"
                            defaultValue={task?.end_time?.slice(0, 5) ?? ''}
                            className={fieldClassName}
                        />
                        <InputError message={errors.end_time} />
                    </div>
                )}

                <div
                    className={cn('grid gap-2', isActivity && 'sm:col-span-2')}
                >
                    <Label htmlFor={`${idPrefix}-recurrence`}>Repeats</Label>
                    <Select
                        key={recurrenceResetKey}
                        name="recurrence"
                        defaultValue={task?.recurrence ?? 'none'}
                    >
                        <SelectTrigger
                            id={`${idPrefix}-recurrence`}
                            className={cn('w-full', fieldClassName)}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={popoverClassName}>
                            <SelectItem value="none">Never</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.recurrence} />
                </div>
            </div>
        </>
    );
}
