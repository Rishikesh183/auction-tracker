import { NextRequest, NextResponse } from 'next/server';
import {
    SESSION_COOKIE,
    checkCredentials,
    clerkEnabled,
    clerkSignedIn,
    createSessionValue,
    loginRateLimited,
    requireAdmin,
    sessionCookieOptions,
} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET: am I an admin?
export async function GET(req: NextRequest) {
    const admin = await requireAdmin(req);
    return NextResponse.json({
        authenticated: Boolean(admin),
        user: admin?.id ?? null,
        mode: clerkEnabled ? 'clerk' : 'password',
        // signed in with Clerk, but email not in ADMIN_EMAILS
        notAllowed: !admin && clerkEnabled ? await clerkSignedIn() : false,
    });
}

// POST: password login (only while Clerk is not configured)
export async function POST(req: NextRequest) {
    if (clerkEnabled) {
        return NextResponse.json({ error: 'Password login is disabled. Sign in with Clerk.' }, { status: 400 });
    }
    if (loginRateLimited(req)) {
        return NextResponse.json({ error: 'Too many attempts. Try again in 10 minutes.' }, { status: 429 });
    }
    const { username, password } = await req.json().catch(() => ({}));
    if (typeof username !== 'string' || typeof password !== 'string' || !checkCredentials(username, password)) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    const res = NextResponse.json({ authenticated: true, user: username });
    res.cookies.set(SESSION_COOKIE, createSessionValue(username), sessionCookieOptions(req));
    return res;
}

// DELETE: log out of the password session
export async function DELETE(req: NextRequest) {
    const res = NextResponse.json({ authenticated: false });
    res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(req), maxAge: 0 });
    return res;
}
