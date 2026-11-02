import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <AppLogoIcon className="size-8 shrink-0 fill-current text-primary" />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate text-base leading-tight font-semibold">
                    {name}
                </span>
            </div>
        </>
    );
}
