import { Link } from '@inertiajs/react';
import { Flame, LayoutGrid, ListTodo } from 'lucide-react';
import HabitController from '@/actions/App/Http/Controllers/HabitController';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import AppLogo from '@/components/app-logo';
import { LevelProgress } from '@/components/level-progress';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Tasks',
        href: TaskController.index(),
        icon: ListTodo,
    },
    {
        title: 'Habits',
        href: HabitController.index(),
        icon: Flame,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <LevelProgress />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
