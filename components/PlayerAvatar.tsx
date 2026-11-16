import photos from '@/lib/player-photos.json';
import { cn } from '@/lib/utils';

const PHOTOS = photos as Record<string, string>;
const DEFAULT_PHOTO = '/players/default.svg';

export function playerPhoto(photoKey: string | null | undefined): string {
    return (photoKey && PHOTOS[photoKey.toLowerCase()]) || DEFAULT_PHOTO;
}

interface Props {
    photoKey: string | null | undefined;
    name: string;
    className?: string;
}

/** Player photo from public/players, or the default silhouette. */
export default function PlayerAvatar({ photoKey, name, className }: Props) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={playerPhoto(photoKey)}
            alt={name}
            loading="lazy"
            decoding="async"
            className={cn('shrink-0 rounded-full bg-muted object-cover object-top', className)}
        />
    );
}
