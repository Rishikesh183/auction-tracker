import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// SERVER ONLY.
//
// Two modes:
//  1. Clerk (when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY are set):
//     the signed-in Clerk user must have a VERIFIED email listed in ADMIN_EMAILS.
//  2. Fallback password login (only while Clerk keys are missing), so the admin
//     keeps working until the keys are added. Disabled automatically once Clerk is on.

export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

export function adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

export interface Admin {
    id: string; // Clerk email or password username
    via: 'clerk' | 'password';
}

// ---- Clerk -----------------------------------------------------------------

// Cache userId -> allowed email for a minute, so admin clicks don't each call Clerk's API.
const clerkCache = new Map<string, { email: string | null; at: number }>();
const CLERK_CACHE_MS = 60_000;

async function clerkAdmin(): Promise<Admin | null> {
    const { userId } = await auth();
    if (!userId) return null;

    const hit = clerkCache.get(userId);
    if (hit && Date.now() - hit.at < CLERK_CACHE_MS) {
        return hit.email ? { id: hit.email, via: 'clerk' } : null;
    }

    const allow = adminEmails();
    const user = await (await clerkClient()).users.getUser(userId);
    const email =
        user.emailAddresses
            .filter((e) => e.verification?.status === 'verified')
            .map((e) => e.emailAddress.toLowerCase())
            .find((e) => allow.includes(e)) ?? null;

    clerkCache.set(userId, { email, at: Date.now() });
    return email ? { id: email, via: 'clerk' } : null;
}

/** Signed in with Clerk but not on the admin list? (for a clear message in the UI) */
export async function clerkSignedIn(): Promise<boolean> {
    if (!clerkEnabled) return false;
    const { userId } = await auth();
    return Boolean(userId);
}

// ---- Password fallback -----------------------------------------------------

const CREDENTIALS: { username: string; password: string }[] =
    process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD
        ? [{ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }]
        : [
            { username: 'admin', password: 'admin123' },
            { username: 'auctioneer', password: 'ipl2024' },
        ];

export const SESSION_COOKIE = 'admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
    const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!s) throw new Error('Set ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY');
    return s;
}

function sign(payload: string): string {
    return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkCredentials(username: string, password: string): boolean {
    return CREDENTIALS.some((c) => safeEqual(c.username, username) && safeEqual(c.password, password));
}

/** Cookie value: "<username>.<expiresAtSeconds>.<signature>" */
export function createSessionValue(username: string): string {
    const payload = `${username}.${Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS}`;
    return `${payload}.${sign(payload)}`;
}

function readSession(value: string | undefined): string | null {
    if (!value) return null;
    const lastDot = value.lastIndexOf('.');
    if (lastDot < 0) return null;
    const payload = value.slice(0, lastDot);
    const sig = value.slice(lastDot + 1);
    if (!safeEqual(sign(payload), sig)) return null;
    const [username, exp] = payload.split('.');
    if (!username || Number(exp) < Date.now() / 1000) return null;
    return username;
}

/** Secure flag follows the request (https in production, http on localhost). */
export function sessionCookieOptions(req: NextRequest) {
    const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
    return {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: proto === 'https',
        path: '/',
        maxAge: MAX_AGE_SECONDS,
    };
}

// Simple in-memory brute-force guard for the password form (per server instance).
const attempts = new Map<string, { n: number; first: number }>();
export function loginRateLimited(req: NextRequest): boolean {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const now = Date.now();
    const a = attempts.get(ip);
    if (!a || now - a.first > 10 * 60_000) {
        attempts.set(ip, { n: 1, first: now });
        return false;
    }
    a.n += 1;
    return a.n > 10; // 10 tries per 10 minutes
}

// ---- Entry point -------------------------------------------------------------

/** The current admin, or null. Use in every admin-only API route. */
export async function requireAdmin(req: NextRequest): Promise<Admin | null> {
    if (clerkEnabled) {
        try {
            return await clerkAdmin();
        } catch (e) {
            console.error('clerk admin check failed', e);
            return null;
        }
    }
    const username = readSession(req.cookies.get(SESSION_COOKIE)?.value);
    return username ? { id: username, via: 'password' } : null;
}

/**
 * Wrap an admin-only route handler. Returns 401 unless the caller is an admin.
 * Prefer this over calling requireAdmin() by hand (an un-awaited Promise is truthy).
 */
export function withAdmin(handler: (req: NextRequest, admin: Admin) => Promise<Response>) {
    return async (req: NextRequest): Promise<Response> => {
        const admin = await requireAdmin(req);
        if (!admin) {
            return Response.json({ error: 'Not logged in' }, { status: 401 });
        }
        return handler(req, admin);
    };
}
