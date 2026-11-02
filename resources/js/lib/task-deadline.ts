import type { Task } from '@/types';

function atTime(date: string, time: string): Date {
    return new Date(`${date}T${time}`);
}

/** An activity's end, an assignment's deadline time, or the end of the day when untimed. */
function taskDeadline(task: Task): Date | null {
    return task.due_date
        ? atTime(task.due_date, task.end_time ?? '23:59:59')
        : null;
}

/** The two largest units that matter: `2d 3h`, `3h 12m`, or `12m 05s` in the final hour. */
function formatDuration(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor(totalSeconds / 60) % 60;

    if (days > 0) {
        return `${days}d ${hours}h`;
    }

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m ${String(totalSeconds % 60).padStart(2, '0')}s`;
}

export function isTaskOverdue(task: Task, now: Date): boolean {
    const deadline = taskDeadline(task);

    return task.status === 'pending' && deadline !== null && now > deadline;
}

/** Time until an activity starts or a deadline passes, or how long ago the deadline passed. */
export function taskCountdown(task: Task, now: Date): string | null {
    const deadline = taskDeadline(task);

    if (!task.due_date || !deadline) {
        return null;
    }

    if (now > deadline) {
        return `Overdue ${formatDuration(now.getTime() - deadline.getTime())}`;
    }

    if (task.start_time) {
        const start = atTime(task.due_date, task.start_time);

        if (now < start) {
            return `Starts in ${formatDuration(start.getTime() - now.getTime())}`;
        }
    }

    return `${formatDuration(deadline.getTime() - now.getTime())} left`;
}
