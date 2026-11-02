import { useEffect, useRef } from 'react';

const GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*()';
const LINK_DISTANCE = 120;
const MOUSE_DISTANCE = 180;

type Node = { x: number; y: number; vy: number; glyph: string };
type Beam = {
    x: number;
    y: number;
    length: number;
    speed: number;
    opacity: number;
};

function randomGlyph(): string {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

/**
 * The signed-in app's ground: rising light beams and drifting glyphs that link to each other
 * and to the pointer. Fixed behind the content; colors follow the light/dark theme.
 */
export function ParticleDrift() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (!canvas || !context) {
            return;
        }

        const pointer = { x: -1000, y: -1000 };
        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        let width = 0;
        let height = 0;
        let nodes: Node[] = [];
        let beams: Beam[] = [];
        let frame = 0;

        const resize = (): void => {
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            const ratio = window.devicePixelRatio || 1;
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);

            nodes = Array.from({ length: 90 }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vy: Math.random() * 0.4 + 0.1,
                glyph: randomGlyph(),
            }));
            beams = Array.from({ length: 25 }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                length: Math.random() * 100 + 50,
                speed: Math.random() * 6 + 3,
                opacity: Math.random() * 0.5 + 0.3,
            }));
        };

        const draw = (): void => {
            const isDark = document.documentElement.classList.contains('dark');
            const accent = isDark ? '96, 165, 250' : '37, 99, 235';
            const muted = isDark ? '156, 163, 175' : '36, 48, 68';
            const step = reduceMotion ? 0 : 1;

            context.clearRect(0, 0, width, height);

            context.lineWidth = 1.5;
            beams.forEach((beam) => {
                beam.y -= beam.speed * step;

                if (beam.y + beam.length < 0) {
                    beam.y = height + 100;
                    beam.x = Math.random() * width;
                }

                const gradient = context.createLinearGradient(
                    beam.x,
                    beam.y,
                    beam.x,
                    beam.y + beam.length,
                );
                gradient.addColorStop(0, `rgba(${accent}, ${beam.opacity})`);
                gradient.addColorStop(1, 'transparent');
                context.strokeStyle = gradient;
                context.beginPath();
                context.moveTo(beam.x, beam.y);
                context.lineTo(beam.x, beam.y + beam.length);
                context.stroke();
            });

            context.font = '12px monospace';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.lineWidth = 0.5;

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const distance = Math.hypot(
                        nodes[i].x - nodes[j].x,
                        nodes[i].y - nodes[j].y,
                    );

                    if (distance < LINK_DISTANCE) {
                        context.strokeStyle = `rgba(${muted}, ${(isDark ? 0.15 : 0.22) * (1 - distance / LINK_DISTANCE)})`;
                        context.beginPath();
                        context.moveTo(nodes[i].x, nodes[i].y);
                        context.lineTo(nodes[j].x, nodes[j].y);
                        context.stroke();
                    }
                }
            }

            nodes.forEach((node) => {
                node.y += node.vy * step;

                if (node.y > height + 20) {
                    node.y = -20;
                    node.x = Math.random() * width;
                }

                const distance = Math.hypot(
                    pointer.x - node.x,
                    pointer.y - node.y,
                );
                const isNearPointer = distance < MOUSE_DISTANCE;

                if (step && (isNearPointer || Math.random() > 0.98)) {
                    node.glyph = randomGlyph();
                }

                if (isNearPointer) {
                    context.strokeStyle = `rgba(${accent}, ${0.5 * (1 - distance / MOUSE_DISTANCE)})`;
                    context.beginPath();
                    context.moveTo(node.x, node.y);
                    context.lineTo(pointer.x, pointer.y);
                    context.stroke();
                }

                context.fillStyle = isNearPointer
                    ? `rgb(${accent})`
                    : `rgba(${muted}, ${isDark ? 0.4 : 0.55})`;
                context.fillText(node.glyph, node.x, node.y);
            });
        };

        function loop(): void {
            draw();
            frame = requestAnimationFrame(loop);
        }

        function onResize(): void {
            resize();
            draw();
        }

        function onPointerMove(event: PointerEvent): void {
            pointer.x = event.clientX;
            pointer.y = event.clientY;
        }

        resize();
        window.addEventListener('resize', onResize);

        // Reduced motion gets one still frame, redrawn when the theme flips.
        const themeObserver = new MutationObserver(draw);

        if (reduceMotion) {
            draw();
            themeObserver.observe(document.documentElement, {
                attributeFilter: ['class'],
            });
        } else {
            window.addEventListener('pointermove', onPointerMove);
            loop();
        }

        return () => {
            cancelAnimationFrame(frame);
            themeObserver.disconnect();
            window.removeEventListener('resize', onResize);
            window.removeEventListener('pointermove', onPointerMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 size-full opacity-70"
        />
    );
}
