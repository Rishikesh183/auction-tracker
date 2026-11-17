import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'IPL 2026 Auction: Full Sold & Unsold Players List',
    description: 'Searchable list of all players sold and unsold at the IPL 2026 auction with prices and bidding history.',
    alternates: { canonical: '/completed' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
