/**
 * The signed-in app's ground: a pale-blue field of faint day squares (the check-in motif),
 * filling the content area behind the header and every page's panels.
 */
export function DayGridBackground() {
    return (
        <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 size-full text-[#e2e9fc] dark:text-[#111a33]"
        >
            <defs>
                <pattern
                    id="day-grid"
                    width={44}
                    height={44}
                    patternUnits="userSpaceOnUse"
                >
                    <rect
                        x={11}
                        y={11}
                        width={22}
                        height={22}
                        fill="currentColor"
                    />
                </pattern>
            </defs>
            <rect
                width="100%"
                height="100%"
                className="fill-[#eef2fd] dark:fill-[#0b1020]"
            />
            <rect width="100%" height="100%" fill="url(#day-grid)" />
        </svg>
    );
}
