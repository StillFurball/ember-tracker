import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FlameTier = {
    className: string;
    /** Pale area tint and readable ink of the tier's hue, for panels and figures. */
    tint: string;
    ink: string;
    /** Outer, middle and core colours for the canvas flame. */
    colors: [string, string, string];
};

/** Flame colour tiers from the spec: blue at 7, gold at 30, purple at 100. */
export function flameTier(streak: number): FlameTier {
    if (streak >= 100) {
        return {
            className: 'text-purple-500',
            tint: 'bg-purple-100 dark:bg-purple-950',
            ink: 'text-purple-800 dark:text-purple-300',
            colors: ['#9333ea', '#c084fc', '#faf5ff'],
        };
    }

    if (streak >= 30) {
        return {
            className: 'text-amber-400',
            tint: 'bg-amber-100 dark:bg-amber-950',
            ink: 'text-amber-800 dark:text-amber-300',
            colors: ['#f59e0b', '#fbbf24', '#fffbeb'],
        };
    }

    if (streak >= 7) {
        return {
            className: 'text-sky-500',
            tint: 'bg-sky-100 dark:bg-sky-950',
            ink: 'text-sky-800 dark:text-sky-300',
            colors: ['#0284c7', '#38bdf8', '#f0f9ff'],
        };
    }

    if (streak > 0) {
        return {
            className: 'text-orange-500',
            tint: 'bg-orange-100 dark:bg-orange-950',
            ink: 'text-orange-800 dark:text-orange-300',
            colors: ['#ea580c', '#fb923c', '#fff7ed'],
        };
    }

    return {
        className: 'text-muted-foreground/40',
        tint: 'bg-muted',
        ink: 'text-foreground',
        colors: ['#a3a3a3', '#d4d4d4', '#f5f5f5'],
    };
}

export function StreakFlame({
    streak,
    unit,
}: {
    streak: number;
    unit: 'day' | 'week';
}) {
    const description = `${streak} ${unit}${streak === 1 ? '' : 's'} streak`;

    return (
        <div className="flex items-center gap-1" title={description}>
            <Flame
                aria-hidden
                fill="currentColor"
                className={cn(
                    'size-6 transition-colors duration-500',
                    flameTier(streak).className,
                    streak > 0 && 'motion-safe:animate-pulse',
                )}
            />
            <span aria-hidden className="text-lg font-semibold tabular-nums">
                {streak}
            </span>
            <span className="sr-only">{description}</span>
        </div>
    );
}
