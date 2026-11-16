import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

// SERVER ONLY. Temporary admin login until Clerk is added.
// Credentials are checked on the server, so they are no longer shipped to
// every visitor's browser. Override with ADMIN_USERNAME / ADMIN_PASSWORD env.
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

export function readSession(value: string | undefined): string | null {
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

export function requireAdmin(req: NextRequest): string | null {
    return readSession(req.cookies.get(SESSION_COOKIE)?.value);
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
