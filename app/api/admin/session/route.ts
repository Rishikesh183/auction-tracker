import { NextRequest, NextResponse } from 'next/server';
import {
    SESSION_COOKIE,
    checkCredentials,
    createSessionValue,
    requireAdmin,
    sessionCookieOptions,
} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET: am I logged in?
export async function GET(req: NextRequest) {
    const user = requireAdmin(req);
    return NextResponse.json({ authenticated: Boolean(user), username: user });
}

// POST: log in
export async function POST(req: NextRequest) {
    const { username, password } = await req.json().catch(() => ({}));
    if (typeof username !== 'string' || typeof password !== 'string' || !checkCredentials(username, password)) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    const res = NextResponse.json({ authenticated: true, username });
    res.cookies.set(SESSION_COOKIE, createSessionValue(username), sessionCookieOptions(req));
    return res;
}

// DELETE: log out
export async function DELETE(req: NextRequest) {
    const res = NextResponse.json({ authenticated: false });
    res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(req), maxAge: 0 });
    return res;
}
