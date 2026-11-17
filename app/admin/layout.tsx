import { ClerkProvider } from '@clerk/nextjs';

// Clerk only wraps the admin section, so public viewer pages don't load Clerk's JS.
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const metadata = {
    title: 'Admin · Cricmawa IPL',
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    if (!clerkEnabled) return <>{children}</>;
    return (
        <ClerkProvider
            appearance={{
                variables: {
                    colorPrimary: '#f2b33d',
                    colorForeground: '#ecedee',
                    colorMutedForeground: '#8b919a',
                    colorBackground: '#111317',
                    colorInput: '#0a0b0d',
                    colorInputForeground: '#ecedee',
                    colorNeutral: '#ecedee',
                    borderRadius: '0.5rem',
                },
            }}
        >
            {children}
        </ClerkProvider>
    );
}
