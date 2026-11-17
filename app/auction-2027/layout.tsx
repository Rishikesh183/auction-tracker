import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'IPL 2027 Auction Date, Countdown & Live Updates',
    description: 'IPL 2027 auction on 16 December 2026: countdown, released players pool, team purses and live bid-by-bid updates by Cricmawa.',
    alternates: { canonical: '/auction-2027' },
    keywords: ['IPL 2027 auction date', 'IPL 2027 auction', 'IPL auction 16 December', 'IPL 2027 auction purse', 'IPL mini auction 2027'],
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
