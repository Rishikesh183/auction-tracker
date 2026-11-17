import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'IPL 2026 Auction Team Squad & Purse',
    robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
