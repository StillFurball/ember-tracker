import { Head, Link, usePage } from '@inertiajs/react';
import { Check, Flame } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    CheckInSquares,
    EmberGrid,
    EmberStripe,
    streakDays,
} from '@/components/ember-grid';
import { XP_PER_COMPLETION, XP_PER_LEVEL } from '@/components/level-progress';
import { useReveal } from '@/hooks/use-reveal';
import { celebrate } from '@/lib/reward-burst';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';
import type { Auth } from '@/types';

const ACCENT = '#1a4be0';

const stages = [
    { name: 'Add', clause: 'First, pick one small habit.' },
    { name: 'Check in', clause: 'Then check in once a day.' },
    { name: 'Earn', clause: `Each check-in pays ${XP_PER_COMPLETION} XP.` },
    { name: 'Keep', clause: 'Last, keep the flame alive.' },
] as const;

const flames = [
    {
        day: 1,
        title: 'A small orange flame',
        excerpt:
            'Your first check-in lights it. Let a whole day pass without one and it goes out.',
        color: '#f97316',
        tone: '#e9eefc',
    },
    {
        day: 7,
        title: 'The flame turns blue',
        excerpt:
            'A full week without a gap. The habit has stopped being a decision you make every morning.',
        color: '#0ea5e9',
        tone: '#dce4fb',
    },
    {
        day: 30,
        title: 'A month burns gold',
        excerpt: `Thirty days in a row, and ${(30 * XP_PER_COMPLETION).toLocaleString('en')} XP from this habit alone.`,
        color: '#fbbf24',
        tone: '#cfdaf9',
    },
    {
        day: 100,
        title: 'The rarest flame',
        excerpt: `One hundred days. ${(100 * XP_PER_COMPLETION).toLocaleString('en')} XP, enough for level ${Math.floor((100 * XP_PER_COMPLETION) / XP_PER_LEVEL) + 1} on one habit.`,
        color: '#a855f7', // taste-skill-ignore: the spec's 100-day flame is purple (FR-13)
        tone: '#e9eefc',
    },
] as const;

/** Product fragment for each stage of the how-it-works slider. */
function StageFragment({ stage }: { stage: number }) {
    if (stage === 0) {
        return (
            <div className="space-y-4">
                <p className="font-medium">New habit</p>
                <div className="space-y-1.5">
                    <p className="text-[#6b6b6b] text-[var(--step-small)]">
                        Name
                    </p>
                    <p className="bg-[#f4f4f4] px-3 py-2">Read 10 pages</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <p className="text-[#6b6b6b] text-[var(--step-small)]">
                            Frequency
                        </p>
                        <p className="bg-[#f4f4f4] px-3 py-2">Daily</p>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[#6b6b6b] text-[var(--step-small)]">
                            Times per day
                        </p>
                        <p className="bg-[#f4f4f4] px-3 py-2">1</p>
                    </div>
                </div>
                <p className="inline-block bg-[#1a4be0] px-4 py-2 font-medium text-white">
                    Add habit
                </p>
            </div>
        );
    }

    if (stage === 1) {
        return (
            <div className="space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="font-medium">Read 10 pages</p>
                        <p className="text-[#6b6b6b] text-[var(--step-small)]">
                            1× per day
                        </p>
                    </div>
                    <p className="flex items-center gap-1 text-[var(--step-lead)]">
                        <Flame
                            aria-hidden
                            fill="currentColor"
                            className="size-6 text-sky-500"
                        />
                        11
                    </p>
                </div>
                <p className="bg-[#1a4be0] px-4 py-3 text-center font-medium text-white">
                    Check in (0/1 today)
                </p>
                <EmberStripe count={14} />
            </div>
        );
    }

    if (stage === 2) {
        return (
            <div className="space-y-4">
                <p className="leading-none font-medium text-[#1a4be0] text-[var(--step-head)]">
                    +{XP_PER_COMPLETION} XP
                </p>
                <div className="flex justify-between text-[var(--step-small)]">
                    <span className="font-medium">Level 3</span>
                    <span className="text-[#6b6b6b] tabular-nums">
                        450 / {XP_PER_LEVEL} XP
                    </span>
                </div>
                <div className="h-3 bg-[#f4f4f4]">
                    <div className="h-full w-[90%] bg-[#1a4be0]" />
                </div>
                <p>One more check-in and you reach level 4.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="font-medium">Last 28 days</p>
                <p className="flex items-center gap-1 text-[var(--step-lead)]">
                    <Flame
                        aria-hidden
                        fill="currentColor"
                        className="size-6 text-sky-500"
                    />
                    12 days
                </p>
            </div>
            <CheckInSquares
                days={Array.from(
                    { length: 28 },
                    (_, day) => day >= 15 || day % 3 !== 0,
                )}
            />
            <p className="text-[#6b6b6b] text-[var(--step-small)]">
                Seven days in a row turned the flame blue.
            </p>
        </div>
    );
}

function HowItWorks() {
    const [stage, setStage] = useState(0);

    return (
        <section
            id="how-it-works"
            aria-labelledby="how-heading"
            className="relative grid min-h-[88svh] scroll-mt-4 bg-[#f4f4f4] md:grid-cols-2"
        >
            <div className="order-2 flex flex-col justify-between gap-10 px-4 pt-6 pb-36 md:order-1 md:px-8 md:pt-16">
                <h2
                    id="how-heading"
                    aria-live="polite"
                    className="ember-display max-w-[13ch] text-[length:var(--step-head)]"
                >
                    <span key={stage} className="block animate-in fade-in">
                        {stages[stage].clause}
                    </span>
                </h2>
                <p data-reveal data-reveal-delay={80} className="max-w-[40ch]">
                    That is the whole method. Ember keeps the count, the XP and
                    the streak, so the only job left is the habit.
                </p>
            </div>

            <div className="order-1 flex min-h-[46svh] items-center justify-center bg-white px-4 py-10 md:order-2">
                <div
                    data-ui
                    key={stage}
                    className="w-full max-w-[440px] animate-in bg-white p-6 duration-200 fade-in"
                >
                    <StageFragment stage={stage} />
                </div>
            </div>

            <div className="absolute inset-x-4 bottom-6 md:inset-x-8">
                <div className="relative">
                    <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-[#d9d9d9]">
                        <div
                            className="h-full bg-[#111111] transition-[width] duration-200"
                            style={{ width: `${(stage / 3) * 100}%` }}
                        />
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={3}
                        step={1}
                        value={stage}
                        onChange={(event) =>
                            setStage(Number(event.target.value))
                        }
                        aria-label="Stage"
                        aria-valuetext={stages[stage].name}
                        className="ember-range relative"
                    />
                </div>
                <div className="mt-2 grid grid-cols-4">
                    {stages.map((item, index) => (
                        <button
                            key={item.name}
                            type="button"
                            onClick={() => setStage(index)}
                            className={cn(
                                'text-left text-[length:var(--step-body)] transition-colors hover:text-[#111111]',
                                index === stage
                                    ? 'text-[#111111]'
                                    : 'text-[#6b6b6b]',
                                index === 3 && 'text-right',
                                (index === 1 || index === 2) && 'text-center',
                            )}
                        >
                            {item.name}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CheckInShowcase() {
    const [isDone, setIsDone] = useState(false);

    function toggle(event: React.MouseEvent<HTMLButtonElement>): void {
        if (!isDone) {
            celebrate(event.currentTarget, `+${XP_PER_COMPLETION} XP`);
        }

        setIsDone(!isDone);
    }

    return (
        <section
            aria-labelledby="showcase-heading"
            className={cn(
                'relative min-h-[86svh] overflow-hidden px-4 pt-14 transition-colors duration-500 md:min-h-[92svh] md:px-8',
                isDone ? 'bg-[#111111]' : 'bg-[#1a4be0]',
            )}
        >
            <div className="relative z-10 max-w-[34ch] text-white">
                <h2
                    id="showcase-heading"
                    data-reveal
                    className="ember-display text-[length:var(--step-head)]"
                >
                    Day 12 is {isDone ? 'done.' : 'open.'}
                </h2>
                <p
                    data-reveal
                    data-reveal-delay={80}
                    className="mt-6 text-[length:var(--step-body)]"
                >
                    One press a day is the whole habit. Try it: Ember counts it,
                    pays {XP_PER_COMPLETION} XP and keeps the flame going.
                </p>
            </div>

            <button
                data-ui
                type="button"
                aria-pressed={isDone}
                onClick={toggle}
                className="absolute -bottom-[0.18em] left-[-0.12em] flex w-[5.6em] flex-col justify-between bg-white p-[0.4em] text-left text-[clamp(64px,30vw,128px)] text-[#111111] transition-transform duration-150 hover:-translate-y-[0.04em] active:scale-[0.98] md:right-[-0.9em] md:-bottom-[0.6em] md:left-auto md:text-[min(16vh,13vw)]"
                style={{ height: '2.6em' }}
            >
                <span className="flex items-center justify-between text-[0.28em] leading-none">
                    <span>Read 10 pages</span>
                    <span className="flex items-center gap-[0.15em]">
                        <Flame
                            aria-hidden
                            fill="currentColor"
                            className="size-[1em] text-sky-500"
                        />
                        {isDone ? 12 : 11}
                    </span>
                </span>
                <span
                    className={cn(
                        'flex items-center gap-[0.2em] px-[0.25em] py-[0.18em] text-[0.42em] leading-none font-medium text-white transition-colors',
                        isDone ? 'bg-[#111111]' : 'bg-[#1a4be0]',
                    )}
                >
                    {isDone ? (
                        <>
                            <Check aria-hidden className="size-[0.9em]" />
                            Done today
                        </>
                    ) : (
                        'Check in'
                    )}
                </span>
            </button>
        </section>
    );
}

function FlameDeck() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [activeCard, setActiveCard] = useState(0);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        const isWide = window.matchMedia('(min-width: 1024px)');

        if (!wrapper) {
            return;
        }

        let frame = 0;
        const update = (): void => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                if (!isWide.matches) {
                    return;
                }

                const rect = wrapper.getBoundingClientRect();
                const travel = rect.height - window.innerHeight;
                const progress = Math.min(
                    Math.max(-rect.top / Math.max(travel, 1), 0),
                    0.999,
                );
                setActiveCard(Math.floor(progress * flames.length));
            });
        };

        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, []);

    function showCard(index: number): void {
        const wrapper = wrapperRef.current;

        if (!wrapper) {
            return;
        }

        const travel = wrapper.offsetHeight - window.innerHeight;
        window.scrollTo({
            top: wrapper.offsetTop + (travel * (index + 0.5)) / flames.length,
            behavior: 'smooth',
        });
    }

    return (
        <section
            id="flames"
            aria-labelledby="flames-heading"
            className="scroll-mt-4"
        >
            <div ref={wrapperRef} className="lg:h-[260svh]">
                <div className="flex flex-col px-4 pt-24 pb-8 md:px-8 lg:sticky lg:top-0 lg:h-svh lg:justify-center lg:py-0">
                    <h2
                        id="flames-heading"
                        data-reveal
                        className="ember-display text-[length:var(--step-head)]"
                    >
                        Four flames to earn
                    </h2>

                    <ol className="mt-12 flex flex-col gap-3 lg:h-[460px] lg:flex-row lg:gap-1 lg:overflow-hidden">
                        {flames.map((flame, index) => {
                            const isSliver = index < activeCard;

                            return (
                                <li
                                    key={flame.day}
                                    data-reveal
                                    data-reveal-delay={index * 80}
                                    style={{ backgroundColor: flame.tone }}
                                    className={cn(
                                        'relative shrink-0 overflow-hidden transition-[width] duration-500 ease-out lg:w-[680px]',
                                        isSliver && 'lg:w-[120px]',
                                    )}
                                >
                                    {isSliver && (
                                        <button
                                            type="button"
                                            onClick={() => showCard(index)}
                                            className="absolute inset-0 hidden cursor-pointer flex-col items-start justify-between p-6 text-left transition-colors hover:bg-white/40 lg:flex"
                                        >
                                            <span className="text-[30px] leading-[1.1] font-medium">
                                                {flame.day}
                                            </span>
                                            <span className="text-[length:var(--step-small)]">
                                                Show day {flame.day}
                                            </span>
                                        </button>
                                    )}
                                    <div
                                        aria-hidden={isSliver || undefined}
                                        className={cn(
                                            'grid h-full gap-8 p-8 sm:grid-cols-[1fr_auto] lg:w-[680px]',
                                            isSliver && 'lg:invisible',
                                        )}
                                    >
                                        <div className="flex flex-col justify-between gap-6">
                                            <h3 className="max-w-[14ch] text-[30px] leading-[1.1] font-medium">
                                                {flame.title}
                                            </h3>
                                            <p className="max-w-[34ch]">
                                                {flame.excerpt}
                                            </p>
                                            <Link
                                                href={register()}
                                                className="font-medium text-[#1a4be0] underline-offset-4 hover:underline"
                                            >
                                                Start counting
                                            </Link>
                                        </div>
                                        <div
                                            data-ui
                                            className="w-full max-w-[320px] self-start bg-white p-5 sm:w-[300px]"
                                        >
                                            <CheckInSquares
                                                days={streakDays(flame.day)}
                                            />
                                            <p className="mt-4 flex items-center gap-1.5 text-[length:var(--step-lead)]">
                                                <Flame
                                                    aria-hidden
                                                    fill="currentColor"
                                                    className="size-7"
                                                    style={{
                                                        color: flame.color,
                                                    }}
                                                />
                                                <span className="tabular-nums">
                                                    {flame.day}
                                                </span>
                                                <span className="text-[length:var(--step-small)] text-[#6b6b6b]">
                                                    {flame.day === 1
                                                        ? 'day'
                                                        : 'days in a row'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>

                    <p
                        data-reveal
                        className="mt-10 text-[length:var(--step-body)]"
                    >
                        Four flames, one for each stage of a streak.{' '}
                        <a
                            href="#start"
                            className="font-medium text-[#1a4be0] underline-offset-4 hover:underline"
                        >
                            Light the first one
                        </a>
                    </p>
                </div>
            </div>
        </section>
    );
}

function StartForm() {
    return (
        <section
            id="start"
            aria-labelledby="start-heading"
            className="scroll-mt-4 px-4 py-24 md:px-8 md:py-32"
        >
            <form action={register.url()} method="get">
                <h2
                    id="start-heading"
                    className="ember-display text-[length:var(--step-display)]"
                >
                    Day one for{' '}
                    <label className="inline">
                        <span className="sr-only">Your name</span>
                        <input
                            name="name"
                            required
                            maxLength={255}
                            autoComplete="given-name"
                            placeholder="your name"
                            className="my-2 block h-[1.05em] w-full bg-[#f4f4f4] px-[0.2em] align-baseline text-[#111111] placeholder:text-[#6b6b6b] focus:outline-3 focus:outline-[#1a4be0] md:my-0 md:inline-block md:w-[6.5em]"
                        />
                    </label>{' '}
                    starts{' '}
                    <button
                        type="submit"
                        className="inline-block h-[1.05em] bg-[#1a4be0] px-[0.2em] align-baseline leading-[1.05] text-white transition-colors hover:bg-[#111111] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#1a4be0]"
                    >
                        now
                    </button>
                </h2>
                <p className="mt-8 text-[length:var(--step-body)] text-[#6b6b6b]">
                    Opens sign-up with your name already filled in. Your first
                    habit takes under a minute to add.
                </p>
            </form>
        </section>
    );
}

const footerLetters = [
    { letter: 'E', height: 1, fill: ACCENT },
    { letter: 'M', height: 0.74, fill: '#ffffff' },
    { letter: 'B', height: 0.88, fill: ACCENT },
    { letter: 'E', height: 0.66, fill: '#ffffff' },
    { letter: 'R', height: 0.94, fill: ACCENT },
];

/** The name built from blocks: each letter knocked out of its own rectangle, bottoms on one line. */
function BlockWordmark({
    viewBoxHeight,
    className,
}: {
    viewBoxHeight: number;
    className?: string;
}) {
    const gap = 4;
    const blockWidth =
        (1000 - gap * (footerLetters.length - 1)) / footerLetters.length;

    return (
        <svg
            role="img"
            aria-label="Ember"
            viewBox={`0 0 1000 ${viewBoxHeight}`}
            className={cn('block w-full', className)}
        >
            {footerLetters.map((block, index) => {
                const blockHeight = viewBoxHeight * block.height;
                const x = index * (blockWidth + gap);

                return (
                    <g
                        key={index}
                        className="ember-pop"
                        style={{
                            animationDelay: `${index * 90}ms`,
                            transformBox: 'fill-box',
                            transformOrigin: 'bottom',
                        }}
                    >
                        <rect
                            x={x}
                            y={viewBoxHeight - blockHeight}
                            width={blockWidth}
                            height={blockHeight}
                            fill={block.fill}
                        />
                        <text
                            x={x + blockWidth / 2}
                            y={viewBoxHeight - blockWidth * 0.12}
                            textAnchor="middle"
                            fill="#111111"
                            fontSize={blockWidth * 0.95}
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {block.letter}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

function SiteFooter({ isSignedIn }: { isSignedIn: boolean }) {
    return (
        <footer className="bg-[#111111] px-4 pt-16 pb-8 text-white md:px-8">
            <BlockWordmark viewBoxHeight={460} className="md:hidden" />
            <BlockWordmark viewBoxHeight={250} className="hidden md:block" />

            <div className="mt-14 grid grid-cols-2 gap-8 text-[15px] md:grid-cols-12">
                <nav aria-label="Product" data-reveal className="md:col-span-3">
                    <p className="mb-3 text-[#a3a3a3]">Product</p>
                    <ul className="space-y-2">
                        <li>
                            <a className="hover:underline" href="#how-it-works">
                                How it works
                            </a>
                        </li>
                        <li>
                            <a className="hover:underline" href="#flames">
                                Flames and levels
                            </a>
                        </li>
                    </ul>
                </nav>
                <nav
                    aria-label="Account"
                    data-reveal
                    data-reveal-delay={80}
                    className="md:col-span-3"
                >
                    <p className="mb-3 text-[#a3a3a3]">Account</p>
                    <ul className="space-y-2">
                        {isSignedIn ? (
                            <li>
                                <Link
                                    className="hover:underline"
                                    href={dashboard()}
                                >
                                    Dashboard
                                </Link>
                            </li>
                        ) : (
                            <>
                                <li>
                                    <Link
                                        className="hover:underline"
                                        href={login()}
                                    >
                                        Log in
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className="hover:underline"
                                        href={register()}
                                    >
                                        Create account
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                </nav>
                <p className="col-span-2 text-[#d4d4d4] md:col-span-6 md:text-right">
                    Tasks, habits and streaks in one place.
                    <br />
                    {XP_PER_COMPLETION} XP a check-in, a level every{' '}
                    {XP_PER_LEVEL}.
                </p>
            </div>

            <div className="mt-14 flex items-center justify-between text-[15px] text-[#a3a3a3]">
                <span>© {new Date().getFullYear()} Ember</span>
                <a
                    href="#top"
                    className="bg-white px-3 py-1.5 font-medium text-[#111111] transition-colors hover:bg-[#1a4be0] hover:text-white"
                >
                    Back to top
                </a>
            </div>
        </footer>
    );
}

export default function Welcome() {
    const { auth } = usePage<{ auth: Partial<Auth> }>().props;
    const isSignedIn = Boolean(auth.user);
    useReveal();

    return (
        <>
            <Head title="Keep the streak lit" />

            <div id="top" className="ember-site min-h-svh">
                <section
                    aria-labelledby="hero-heading"
                    className="grid gap-3 p-3 md:min-h-svh md:grid-cols-2"
                >
                    <div className="order-2 -mt-9 flex flex-col bg-[#f4f4f4] md:order-1 md:mt-0">
                        <EmberStripe className="p-3" />

                        <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
                            <div className="flex items-center gap-3">
                                <AppLogoIcon
                                    className="size-12 fill-current"
                                    style={{ color: ACCENT }}
                                />
                                <span className="text-[length:var(--step-lead)] font-semibold">
                                    Ember
                                </span>
                            </div>

                            <h1
                                id="hero-heading"
                                data-reveal
                                className="ember-display mt-10 max-w-[11ch] text-[length:var(--step-display)]"
                            >
                                Keep the streak lit.
                            </h1>
                            <p
                                data-reveal
                                data-reveal-delay={80}
                                className="mt-8 max-w-[36ch]"
                            >
                                Ember is a habit and task tracker. Check in once
                                a day, earn {XP_PER_COMPLETION} XP each time and
                                watch your flame climb from orange to gold.
                            </p>
                            <Link
                                data-reveal
                                data-reveal-delay={160}
                                href={isSignedIn ? dashboard() : register()}
                                className="mt-10 bg-[#1a4be0] px-7 py-4 font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#111111] active:scale-[0.97]"
                            >
                                {isSignedIn
                                    ? 'Open your dashboard'
                                    : 'Start your streak'}
                            </Link>
                        </div>

                        <nav
                            aria-label="Page"
                            className="flex flex-wrap justify-center gap-x-8 gap-y-2 px-6 pb-7 text-[15px]"
                        >
                            <a className="hover:underline" href="#how-it-works">
                                How it works
                            </a>
                            <a className="hover:underline" href="#flames">
                                Flames
                            </a>
                            {!isSignedIn && (
                                <Link
                                    className="hover:underline"
                                    href={login()}
                                >
                                    Log in
                                </Link>
                            )}
                        </nav>
                    </div>

                    <EmberGrid className="order-1 h-[48svh] md:order-2 md:h-auto" />
                </section>

                <HowItWorks />
                <CheckInShowcase />
                <FlameDeck />
                <StartForm />
                <SiteFooter isSignedIn={isSignedIn} />
            </div>
        </>
    );
}
