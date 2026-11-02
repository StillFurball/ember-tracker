import { usePage } from '@inertiajs/react';
import type { Auth } from '@/types';

/** Keep in sync with User::XP_PER_COMPLETION. */
export const XP_PER_COMPLETION = 50;

/** Keep in sync with User::XP_PER_LEVEL. */
export const XP_PER_LEVEL = 500;

export function LevelProgress() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const xpIntoLevel = (auth.user.current_xp ?? 0) % XP_PER_LEVEL;

    return (
        <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">
                    Level {auth.user.level ?? 1}
                </span>
                <span className="text-muted-foreground tabular-nums">
                    {xpIntoLevel} / {XP_PER_LEVEL} XP
                </span>
            </div>
            <div
                role="progressbar"
                aria-label="Progress to next level"
                aria-valuemin={0}
                aria-valuemax={XP_PER_LEVEL}
                aria-valuenow={xpIntoLevel}
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-sidebar-accent"
            >
                <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                    style={{ width: `${(xpIntoLevel / XP_PER_LEVEL) * 100}%` }}
                />
            </div>
        </div>
    );
}
