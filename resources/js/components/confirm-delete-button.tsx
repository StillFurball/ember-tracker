import { Form } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    glassButtonDestructive,
    glassButtonGhost,
    glassButtonOutline,
    glassDialog,
    glassMuted,
    glassOverlay,
} from '@/lib/glass';
import type { RouteFormDefinition } from '@/wayfinder';

export function ConfirmDeleteButton({
    label,
    description,
    action,
}: {
    label: string;
    description: string;
    action: RouteFormDefinition<'post'>;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={label}
                    className={glassButtonGhost}
                >
                    <Trash2 />
                </Button>
            </DialogTrigger>
            <DialogContent
                className={glassDialog}
                overlayClassName={glassOverlay}
            >
                <DialogTitle>{label}?</DialogTitle>
                <DialogDescription className={glassMuted}>
                    {description}
                </DialogDescription>
                <Form {...action} options={{ preserveScroll: true }}>
                    {({ processing }) => (
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button
                                    variant="secondary"
                                    type="button"
                                    className={glassButtonOutline}
                                >
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                disabled={processing}
                                className={glassButtonDestructive}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
