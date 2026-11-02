import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { EmberGrid, EmberStripe } from '@/components/ember-grid';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

/** Split auth screen in the landing page's language: a stripe-topped card beside the check-in motif. */
export default function AuthEmberLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-svh gap-3 bg-background p-3 lg:grid-cols-2">
            <EmberGrid
                className="h-[22svh] lg:order-2 lg:h-auto"
                columnsVisible={4}
            />

            <main className="flex flex-col bg-muted lg:order-1">
                <EmberStripe className="p-3" />

                <div className="flex flex-1 items-center justify-center px-6 py-12">
                    <div className="w-full max-w-sm">
                        <Link
                            href={home()}
                            className="inline-flex items-center gap-2 font-semibold"
                        >
                            <AppLogoIcon className="size-9 fill-current text-primary" />
                            <span className="text-lg">Ember</span>
                        </Link>

                        <div className="mt-10 mb-8 space-y-3">
                            <h1 className="font-display text-4xl leading-[1.05] font-light tracking-[-0.022em] text-balance">
                                {title}
                            </h1>
                            <p className="text-base text-muted-foreground">
                                {description}
                            </p>
                        </div>

                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
