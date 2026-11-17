import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
    return <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-label="Loading" />;
}

function HeaderSkeleton() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-12 w-72 md:h-14 md:w-[28rem]" />
        </div>
    );
}

function StatTilesSkeleton({ n = 4 }: { n?: number }) {
    return (
        <div className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border', n === 4 && 'lg:grid-cols-4')}>
            {Array.from({ length: n }).map((_, i) => (
                <div key={i} className="space-y-3 bg-card p-5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-9 w-16" />
                </div>
            ))}
        </div>
    );
}

function RowsSkeleton({ rows = 7 }: { rows?: number }) {
    return (
        <div className="space-y-2.5">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${55 + ((i * 17) % 35)}%` }} />
                    <Skeleton className="ml-auto h-3.5 w-12" />
                </div>
            ))}
        </div>
    );
}

/** /retention board */
export function BoardSkeleton() {
    return (
        <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 md:px-8 md:py-10">
            <HeaderSkeleton />
            <StatTilesSkeleton />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-4 rounded-xl border border-border bg-card p-4">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-6 w-3/4" />
                        <RowsSkeleton />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** /retention/[team] */
export function TeamSkeleton() {
    return (
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-10">
            <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-12 w-80" />
                <Skeleton className="h-3 w-40" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                        <Skeleton className="aspect-square rounded-none" />
                        <div className="space-y-2 p-3">
                            <Skeleton className="h-3.5 w-3/4" />
                            <Skeleton className="h-3 w-1/3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Generic list page (2026 dashboard, results, live, team) */
export function ListPageSkeleton({ tiles = 4 }: { tiles?: number }) {
    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8 md:py-10">
            <HeaderSkeleton />
            {tiles > 0 && <StatTilesSkeleton n={tiles} />}
            <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                <RowsSkeleton rows={8} />
            </div>
        </div>
    );
}
