'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { SignIn, UserButton, useAuth, useClerk } from '@clerk/nextjs';
import AdminLogin from './AdminLogin';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export interface AdminCtx {
    /** Sign out (Clerk or password session). */
    logout: () => Promise<void>;
    /** Re-check admin rights, e.g. after an API call returned 401. */
    recheck: () => void;
    /** Avatar/menu to show in the page header (Clerk only). */
    userMenu: ReactNode;
}

type State = 'checking' | 'admin' | 'out' | 'not-allowed';

async function fetchSession(): Promise<{ authenticated: boolean; notAllowed: boolean }> {
    try {
        const r = await fetch('/api/admin/session', { cache: 'no-store' });
        return await r.json();
    } catch {
        return { authenticated: false, notAllowed: false };
    }
}

export function AdminCheckingSkeleton() {
    return (
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 md:px-8">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-72" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                ))}
            </div>
            <Skeleton className="h-96" />
        </div>
    );
}

/** Renders children only for admins. Clerk when configured, password login otherwise. */
export default function AdminGate({ children }: { children: (ctx: AdminCtx) => ReactNode }) {
    return CLERK_ENABLED ? <ClerkGate>{children}</ClerkGate> : <PasswordGate>{children}</PasswordGate>;
}

function ClerkGate({ children }: { children: (ctx: AdminCtx) => ReactNode }) {
    const { isLoaded, isSignedIn } = useAuth();
    const { signOut } = useClerk();
    const [state, setState] = useState<State>('checking');

    const recheck = useCallback(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
            setState('out');
            return;
        }
        setState('checking');
        fetchSession().then((d) => setState(d.authenticated ? 'admin' : d.notAllowed ? 'not-allowed' : 'out'));
    }, [isLoaded, isSignedIn]);

    useEffect(recheck, [recheck]);

    if (!isLoaded || state === 'checking') return <AdminCheckingSkeleton />;

    if (state === 'out') {
        return (
            <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
                <SignIn routing="hash" />
            </div>
        );
    }

    if (state === 'not-allowed') {
        return (
            <div className="mx-auto max-w-md px-4 py-20 text-center">
                <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Not an admin</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    This account is signed in but its email is not on the admin list. Sign in with an admin email.
                </p>
                <Button className="mt-6" variant="outline" onClick={() => signOut()}>
                    Sign out
                </Button>
            </div>
        );
    }

    return (
        <>
            {children({
                logout: () => signOut(),
                recheck,
                userMenu: <UserButton />,
            })}
        </>
    );
}

function PasswordGate({ children }: { children: (ctx: AdminCtx) => ReactNode }) {
    const [state, setState] = useState<State>('checking');

    const recheck = useCallback(() => {
        fetchSession().then((d) => setState(d.authenticated ? 'admin' : 'out'));
    }, []);

    useEffect(recheck, [recheck]);

    if (state === 'checking') return <AdminCheckingSkeleton />;
    if (state !== 'admin') return <AdminLogin onDone={() => setState('admin')} />;

    return (
        <>
            {children({
                logout: async () => {
                    await fetch('/api/admin/session', { method: 'DELETE' });
                    setState('out');
                },
                recheck,
                userMenu: null,
            })}
        </>
    );
}
