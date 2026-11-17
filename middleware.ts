import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Clerk runs only on admin pages and API routes (public pages stay untouched).
// Until the Clerk keys are set, this is a no-op and the password fallback is used.
// NOTE: this is not the only check — every admin API route verifies the admin
// itself (lib/adminAuth.ts requireAdmin).
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

export default clerkEnabled ? clerkMiddleware() : () => NextResponse.next();

export const config = {
    matcher: ['/admin(.*)', '/api/(.*)'],
};
