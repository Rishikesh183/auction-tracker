import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'IPL 2026 Auction Results: Sold & Unsold Players, Team Purses',
    description: 'Complete IPL 2026 auction results: every sold and unsold player, final prices, bidding history and team purses.',
    alternates: { canonical: '/2026' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
