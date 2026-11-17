import { ogImage, OG_SIZE } from '@/lib/ogImage';

export const runtime = 'edge';
export const alt = 'IPL 2027 Retentions, Releases & Auction Live — Cricmawa';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
    return ogImage({ eyebrow: 'IPL 2027 Live', title: 'Retentions, releases & the auction — live' });
}
