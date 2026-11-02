import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const COLUMNS = 7;
const ROWS = 6;
const LAYER_COUNT = 4;
const HOLD_MS = 5600;

const CHECKED_COLOR = '#1a4be0';
const TODAY_COLOR = '#111111';

/**
 * Six weeks of check-ins, one square per day, ending on today (left open).
 * Each layer is a different month; a streak of the given length runs into today.
 */
function buildMonth(seed: number, streakLength: number): boolean[] {
    let state = seed;
    const random = (): number => {
        state = (state * 1103515245 + 12345) % 2147483648;

        return state / 2147483648;
    };
    const days = Array.from({ length: COLUMNS * ROWS }, () => random() > 0.3);
    const today = days.length - 1;

    for (let day = today - streakLength; day < today; day++) {
        days[day] = true;
    }

    days[today - streakLength - 1] = false;
    days[today] = false;

    return days;
}

const MONTHS = [
    buildMonth(7, 12),
    buildMonth(19, 18),
    buildMonth(31, 9),
    buildMonth(43, 26),
];

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check-in history drawn as squares: `days` in reading order, the last one is today.
 * Width follows its container; each square is one unit with a 0.14 unit gap.
 */
export function CheckInSquares({
    days,
    columns = COLUMNS,
    emptyColor = '#f4f4f4',
    className,
}: {
    days: boolean[];
    columns?: number;
    emptyColor?: string;
    className?: string;
}) {
    const rows = Math.ceil(days.length / columns);
    const gap = 0.14;

    return (
        <svg
            aria-hidden
            viewBox={`0 0 ${columns + gap * (columns - 1)} ${rows + gap * (rows - 1)}`}
            className={cn('block w-full', className)}
        >
            {days.map((isCheckedIn, day) => (
                <rect
                    key={day}
                    x={(day % columns) * (1 + gap)}
                    y={Math.floor(day / columns) * (1 + gap)}
                    width={1}
                    height={1}
                    fill={
                        day === days.length - 1
                            ? TODAY_COLOR
                            : isCheckedIn
                              ? CHECKED_COLOR
                              : emptyColor
                    }
                />
            ))}
        </svg>
    );
}

/** A streak of the given length running into today (still open), out of `total` days. */
export function streakDays(streak: number, total = 28): boolean[] {
    return Array.from(
        { length: total },
        (_, day) => day >= total - 1 - Math.min(streak, total - 1),
    );
}

/**
 * The page's one motif at enormous scale: a month of check-in squares,
 * cropped by its frame, crossfading between months.
 */
export function EmberGrid({
    className,
    columnsVisible = 5,
}: {
    className?: string;
    columnsVisible?: number;
}) {
    const [activeLayer, setActiveLayer] = useState(0);

    useEffect(() => {
        if (prefersReducedMotion()) {
            return;
        }

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                setActiveLayer((layer) => (layer + 1) % LAYER_COUNT);
            }
        }, HOLD_MS);

        return () => window.clearInterval(interval);
    }, []);

    return (
        <div
            role="img"
            aria-label="Six weeks of daily check-ins: blue squares are days kept, the black square is today, still open."
            data-ui
            className={cn('relative overflow-hidden bg-white', className)}
        >
            <div
                className="ember-drift absolute top-[4%] left-[4%] origin-top-left"
                style={{ width: `${(COLUMNS / columnsVisible) * 100}%` }}
            >
                {MONTHS.map((days, layer) => (
                    <div
                        key={layer}
                        className={cn(
                            'ember-grid-layer',
                            layer > 0 && 'absolute inset-0',
                            layer === activeLayer ? 'opacity-100' : 'opacity-0',
                        )}
                    >
                        <CheckInSquares days={days} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** The motif at text scale: a row of squares used as a stripe band; they light up in turn on load. */
export function EmberStripe({
    count = 28,
    className,
}: {
    count?: number;
    className?: string;
}) {
    const days = MONTHS[0].slice(-count);

    return (
        <div aria-hidden className={cn('flex gap-1', className)}>
            {days.map((isCheckedIn, day) => (
                <span
                    key={day}
                    className={cn(
                        'ember-pop aspect-square min-w-0 flex-1',
                        day === days.length - 1
                            ? 'bg-[#111111]'
                            : isCheckedIn
                              ? 'bg-[#1a4be0]'
                              : 'bg-[#e6e6e6]',
                    )}
                    style={{ animationDelay: `${day * 35}ms` }}
                />
            ))}
        </div>
    );
}
