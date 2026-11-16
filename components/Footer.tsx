import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
    const socialLinks = [
        {
            name: 'Instagram',
            url: 'https://www.instagram.com/cricmawa_?igsh=MWZvODNmbGMxejJkeg==',
            icon: '/instagram.png',
        },
        {
            name: 'Twitter',
            url: 'https://x.com/cricmawa',
            icon: '/twitter.png',
        },
        {
            name: 'Linktree',
            url: 'https://linktr.ee/cricmawa1',
            icon: '/linktree.png',
        },
        {
            name: 'Gmail',
            url: 'mailto:cricmawa@gmail.com',
            icon: '/gmail.png',
        },
    ];

    return (
        <footer className="mt-16 w-full border-t border-border">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row md:px-8">
                <p className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Cricmawa. All rights reserved.
                </p>
                <div className="flex items-center gap-5">
                    {socialLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.url}
                            target={link.name === 'Gmail' ? undefined : '_blank'}
                            rel={link.name === 'Gmail' ? undefined : 'noopener noreferrer'}
                            className="relative h-6 w-6 opacity-70 transition-opacity hover:opacity-100"
                        >
                            <Image
                                src={link.icon}
                                alt={link.name}
                                fill
                                className="object-contain"
                                sizes="24px"
                            />
                            <span className="sr-only">{link.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    );
}
