import { useEffect } from 'react';

/**
 * Staggered entrance for every `[data-reveal]` element inside the page: hidden only after
 * this runs, shown once as it scrolls into view. Elements read their delay from `data-reveal-delay`.
 */
export function useReveal(): void {
    useEffect(() => {
        if (
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            !('IntersectionObserver' in window)
        ) {
            return;
        }

        const elements = Array.from(
            document.querySelectorAll<HTMLElement>('[data-reveal]'),
        );
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const element = entry.target as HTMLElement;
                        element.style.setProperty(
                            '--reveal-delay',
                            `${element.dataset.revealDelay ?? 0}ms`,
                        );
                        element.dataset.reveal = 'shown';
                        observer.unobserve(element);
                    }
                }
            },
            { rootMargin: '0px 0px -8% 0px' },
        );

        for (const element of elements) {
            const rect = element.getBoundingClientRect();

            if (rect.top < window.innerHeight) {
                element.style.setProperty(
                    '--reveal-delay',
                    `${element.dataset.revealDelay ?? 0}ms`,
                );
                element.dataset.reveal = 'waiting';
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => {
                        element.dataset.reveal = 'shown';
                    }),
                );
                continue;
            }

            element.dataset.reveal = 'waiting';
            observer.observe(element);
        }

        return () => observer.disconnect();
    }, []);
}
