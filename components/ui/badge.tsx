import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums whitespace-nowrap',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-muted text-foreground',
                secondary: 'border-transparent bg-muted text-muted-foreground',
                primary: 'border-transparent bg-primary/15 text-primary',
                success: 'border-transparent bg-success/15 text-success',
                warning: 'border-transparent bg-warning/15 text-warning',
                destructive: 'border-transparent bg-destructive/15 text-destructive',
                outline: 'border-border text-foreground',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
