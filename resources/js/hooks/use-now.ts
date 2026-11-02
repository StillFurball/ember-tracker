import { useEffect, useState } from 'react';

/**
 * The current time, refreshed on each whole multiple of the interval (every second by default)
 * so that clocks and countdowns on the same page all change together.
 */
export function useNow(intervalMs: number = 1000): Date {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        let timer: number;

        function scheduleTick(): void {
            timer = window.setTimeout(
                () => {
                    setNow(new Date());
                    scheduleTick();
                },
                intervalMs - (Date.now() % intervalMs),
            );
        }

        scheduleTick();

        return () => window.clearTimeout(timer);
    }, [intervalMs]);

    return now;
}
