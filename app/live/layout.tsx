import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'IPL Auction Live: Bid-by-Bid Updates',
    description: 'Follow the IPL auction live: current player, every bid, team purses, sold and unsold players.',
    alternates: { canonical: '/live' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
