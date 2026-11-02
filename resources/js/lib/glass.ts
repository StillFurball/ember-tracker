/**
 * Frosted glass for the Tasks and Habits screens; the dashboard keeps its solid panels.
 * Each constant overrides a shadcn primitive through className, so the primitives stay as they are.
 * Dark mode is the glass as designed. Light mode sits on a pale ground where white ink, borders
 * and focus rings would vanish, so it uses dark equivalents there.
 */
export const glassCard =
    'rounded-2xl border border-white/20 bg-white/10 text-slate-900 shadow-xl shadow-black/20 backdrop-blur-md backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/40 dark:text-white';

/** Secondary text: the muted theme colour fades too far against the blur. */
export const glassMuted = 'text-slate-600 dark:text-slate-300';

/** More opaque than a card, since page content moves behind a dialog and has to stay out of the text. */
export const glassDialog =
    'rounded-2xl border-white/40 bg-white/70 text-slate-900 shadow-xl shadow-black/20 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/60 dark:text-white';

/** The default overlay is near-solid black, which would leave a glass dialog nothing to frost. */
export const glassOverlay = 'bg-black/40 backdrop-blur-sm';

/** A select's list opens over labels and inputs, so it stays nearly opaque to keep its options readable. */
export const glassPopover =
    'rounded-xl border-white/40 bg-white/80 text-slate-900 shadow-xl shadow-black/20 backdrop-blur-xl **:data-[slot=select-item]:focus:bg-slate-900/10 dark:border-white/15 dark:bg-slate-900/80 dark:text-white dark:**:data-[slot=select-item]:focus:bg-white/15';

/** Inputs, select triggers and textareas. Targets focus-visible, which the primitives already style. */
export const glassField =
    'rounded-xl border-slate-900/15 bg-white/5 text-slate-900 backdrop-blur-sm placeholder:text-slate-500 focus-visible:border-[#1a4be0]/60 focus-visible:ring-2 focus-visible:ring-[#1a4be0]/30 dark:border-white/15 dark:bg-slate-800/30 dark:text-white dark:placeholder:text-slate-400 dark:hover:bg-slate-800/50 dark:focus-visible:border-white/40 dark:focus-visible:ring-white/20';

export const glassToggle =
    'border-slate-900/15 bg-white/5 first:rounded-l-xl last:rounded-r-xl hover:bg-slate-900/5 hover:text-slate-900 data-[state=on]:bg-slate-900/10 data-[state=on]:text-slate-900 dark:border-white/15 dark:bg-slate-800/30 dark:hover:bg-white/10 dark:hover:text-white dark:data-[state=on]:bg-white/20 dark:data-[state=on]:text-white';

/** Solid in light mode, where white text on a translucent fill drops below readable contrast. */
export const glassButton =
    'border border-blue-400/30 bg-blue-600 text-white shadow-lg shadow-blue-500/20 backdrop-blur-sm hover:bg-blue-700 dark:bg-blue-600/80 dark:hover:bg-blue-500';

export const glassButtonDestructive =
    'border border-red-400/30 bg-red-600 text-white shadow-lg shadow-red-500/20 backdrop-blur-sm hover:bg-red-700 dark:bg-red-600/80 dark:hover:bg-red-500';

export const glassButtonOutline =
    'border border-slate-900/15 bg-white/10 text-slate-900 hover:bg-slate-900/5 hover:text-slate-900 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/15 dark:hover:text-white';

export const glassButtonGhost =
    'text-slate-700 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white';

export const glassChip =
    'border-slate-900/15 bg-slate-900/5 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-slate-100';

export const glassCheckbox = 'border-slate-900/40 dark:border-white/40';
