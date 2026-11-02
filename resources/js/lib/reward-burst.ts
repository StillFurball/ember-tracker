type Particle = {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    size: number;
    color: string;
    rotation: number;
    spin: number;
};

const CONFETTI_COLORS = [
    '#f59e0b',
    '#ef4444',
    '#10b981',
    '#3b82f6',
    '#a855f7',
    '#ec4899',
];
const PARTICLE_COUNT = 60;
const DURATION_MS = 1200;
const GRAVITY = 0.35;
const FRAME_MS = 1000 / 60;

/** Overshoots past 1 then settles, giving the floating text a springy rise. */
function easeOutBack(progress: number): number {
    const overshoot = 1.70158;

    return (
        1 +
        (overshoot + 1) * Math.pow(progress - 1, 3) +
        overshoot * Math.pow(progress - 1, 2)
    );
}

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Elastic "pop" on the element, a canvas confetti burst from its centre and
 * a floating label (e.g. "+50 XP"). Skipped when the user prefers reduced motion.
 */
export function celebrate(element: HTMLElement, label: string): void {
    if (prefersReducedMotion()) {
        return;
    }

    element.animate(
        [
            { transform: 'scale(1)' },
            { transform: 'scale(1.25)' },
            { transform: 'scale(0.9)' },
            { transform: 'scale(1.08)' },
            { transform: 'scale(0.97)' },
            { transform: 'scale(1)' },
        ],
        { duration: 600, easing: 'ease-out' },
    );

    const rect = element.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    // Bigger controls get a bigger label so it reads at their scale.
    const labelSize = Math.round(
        Math.min(Math.max(22, rect.height * 0.12), 64),
    );

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * pixelRatio;
    canvas.height = window.innerHeight * pixelRatio;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText =
        'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:60';
    context.scale(pixelRatio, pixelRatio);
    document.body.appendChild(canvas);

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 7;

        return {
            x: originX,
            y: originY,
            velocityX: Math.cos(angle) * speed,
            velocityY: Math.sin(angle) * speed - 5,
            size: 5 + Math.random() * 5,
            color: CONFETTI_COLORS[
                Math.floor(Math.random() * CONFETTI_COLORS.length)
            ],
            rotation: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.4,
        };
    });

    const startedAt = performance.now();
    let previousFrameAt = startedAt;

    const drawFrame = (now: number): void => {
        // Scale physics by elapsed time so the burst looks the same at 60Hz and 120Hz.
        const steps = (now - previousFrameAt) / FRAME_MS;
        const progress = Math.min((now - startedAt) / DURATION_MS, 1);
        previousFrameAt = now;

        context.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (const particle of particles) {
            particle.velocityY += GRAVITY * steps;
            particle.velocityX *= Math.pow(0.98, steps);
            particle.x += particle.velocityX * steps;
            particle.y += particle.velocityY * steps;
            particle.rotation += particle.spin * steps;

            context.save();
            context.globalAlpha = 1 - progress;
            context.translate(particle.x, particle.y);
            context.rotate(particle.rotation);
            context.fillStyle = particle.color;
            context.fillRect(
                -particle.size / 2,
                -particle.size / 4,
                particle.size,
                particle.size / 2,
            );
            context.restore();
        }

        context.globalAlpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
        context.font = `600 ${labelSize}px "Stack Sans Text", ui-sans-serif, sans-serif`;
        context.textAlign = 'center';
        context.lineWidth = 4;
        context.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        context.fillStyle = '#f59e0b';
        const textY = originY - 24 - easeOutBack(progress) * 56;
        context.strokeText(label, originX, textY);
        context.fillText(label, originX, textY);
        context.globalAlpha = 1;

        if (progress < 1) {
            requestAnimationFrame(drawFrame);
        } else {
            canvas.remove();
        }
    };

    requestAnimationFrame(drawFrame);
}
