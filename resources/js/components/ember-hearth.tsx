import { useEffect, useRef } from 'react';
import { flameTier } from '@/components/streak-flame';

type Spark = {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    life: number;
    size: number;
};

const FRAME_MS = 1000 / 60;
const FLARE_MS = 900;

/**
 * Canvas 2D flame for the dashboard: it grows with the best streak, takes the streak tier's colour,
 * sheds rising sparks, and flares whenever `flareKey` changes (a check-in). Static under reduced motion.
 */
export function EmberHearth({
    streak,
    flareKey,
    className,
}: {
    streak: number;
    flareKey: number;
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const flareStartedAt = useRef<number>(-Infinity);
    const sparks = useRef<Spark[]>([]);

    useEffect(() => {
        if (flareKey > 0) {
            flareStartedAt.current = performance.now();
        }
    }, [flareKey]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (!canvas || !context) {
            return;
        }

        const [outer, middle, core] = flameTier(streak).colors;
        const growth =
            streak > 0 ? 0.45 + (0.55 * Math.min(streak, 30)) / 30 : 0.3;
        const isReduced = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        let width = 0;
        let height = 0;

        const resize = (): void => {
            const ratio = window.devicePixelRatio || 1;
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
        };

        const drawTongue = (
            centerX: number,
            baseY: number,
            tongueWidth: number,
            tongueHeight: number,
            tipX: number,
            color: string,
        ): void => {
            const top = baseY - tongueHeight;
            context.beginPath();
            context.moveTo(tipX, top);
            context.bezierCurveTo(
                centerX + tongueWidth * 0.35,
                top + tongueHeight * 0.35,
                centerX + tongueWidth,
                baseY - tongueHeight * 0.45,
                centerX + tongueWidth * 0.7,
                baseY - tongueHeight * 0.12,
            );
            context.quadraticCurveTo(
                centerX,
                baseY + tongueHeight * 0.14,
                centerX - tongueWidth * 0.7,
                baseY - tongueHeight * 0.12,
            );
            context.bezierCurveTo(
                centerX - tongueWidth,
                baseY - tongueHeight * 0.45,
                centerX - tongueWidth * 0.35,
                top + tongueHeight * 0.35,
                tipX,
                top,
            );
            context.fillStyle = color;
            context.fill();
        };

        let previousFrameAt = performance.now();
        let animationFrame = 0;

        const draw = (now: number): void => {
            const steps = Math.min((now - previousFrameAt) / FRAME_MS, 4);
            previousFrameAt = now;
            const seconds = now / 1000;
            const flare = Math.max(
                0,
                1 - (now - flareStartedAt.current) / FLARE_MS,
            );
            const centerX = width / 2;
            const baseY = height * 0.86;
            const flameHeight = height * 0.7 * growth * (1 + flare * 0.25);
            const flameWidth = flameHeight * 0.42;

            context.clearRect(0, 0, width, height);

            const layers: [string, number][] = [
                [outer, 1],
                [middle, 0.68],
                [core, 0.36],
            ];

            layers.forEach(([color, scale], layer) => {
                const flicker = isReduced
                    ? 1
                    : 1 +
                      0.06 * Math.sin(seconds * 7 + layer * 1.7) +
                      0.03 * Math.sin(seconds * 13 + layer);
                const sway = isReduced
                    ? 0
                    : Math.sin(seconds * 2.6 + layer * 0.9) *
                      flameWidth *
                      0.18 *
                      scale;
                drawTongue(
                    centerX,
                    baseY - (1 - scale) * flameHeight * 0.08,
                    flameWidth * scale,
                    flameHeight * scale * flicker,
                    centerX + sway,
                    color,
                );
            });

            if (!isReduced && streak > 0) {
                const spawnChance = (0.18 + growth * 0.3 + flare) * steps;

                if (Math.random() < spawnChance || flare > 0.6) {
                    const burst = flare > 0.6 ? 3 : 1;

                    for (let index = 0; index < burst; index++) {
                        sparks.current.push({
                            x: centerX + (Math.random() - 0.5) * flameWidth,
                            y: baseY - flameHeight * 0.4,
                            velocityX: (Math.random() - 0.5) * 0.8,
                            velocityY: -1.2 - Math.random() * 1.6 - flare * 2,
                            life: 1,
                            size: 2 + Math.random() * 3,
                        });
                    }
                }

                sparks.current = sparks.current.filter(
                    (spark) => spark.life > 0,
                );

                for (const spark of sparks.current) {
                    spark.x +=
                        (spark.velocityX +
                            Math.sin(seconds * 3 + spark.y / 20) * 0.3) *
                        steps;
                    spark.y += spark.velocityY * steps;
                    spark.life -= 0.012 * steps;
                    context.globalAlpha = Math.max(spark.life, 0);
                    context.fillStyle = middle;
                    context.fillRect(spark.x, spark.y, spark.size, spark.size);
                }

                context.globalAlpha = 1;
            }

            if (!isReduced) {
                animationFrame = requestAnimationFrame(draw);
            }
        };

        const observer = new ResizeObserver(() => {
            resize();

            if (isReduced) {
                draw(performance.now());
            }
        });
        observer.observe(canvas);
        resize();
        animationFrame = requestAnimationFrame(draw);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(animationFrame);
        };
    }, [streak]);

    return (
        <canvas
            ref={canvasRef}
            role="img"
            aria-label={
                streak > 0
                    ? `Your flame, burning on a best streak of ${streak}`
                    : 'Your flame is out. Check in to light it.'
            }
            className={className}
        />
    );
}
