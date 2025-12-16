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
        <footer className="w-full py-6 mt-auto bg-gradient-to-bl from-indigo-900 via-blue-900 to-blue-900">
            <div className="container mx-auto flex flex-col items-center justify-center gap-4">
                <div className="flex items-center gap-6">
                    {socialLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.url}
                            target={link.name === 'Gmail' ? undefined : '_blank'}
                            rel={link.name === 'Gmail' ? undefined : 'noopener noreferrer'}
                            className="relative w-8 h-8 transition-transform hover:scale-110"
                        >
                            <Image
                                src={link.icon}
                                alt={link.name}
                                fill
                                className="object-contain"
                                sizes="32px"
                            />
                            <span className="sr-only">{link.name}</span>
                        </Link>
                    ))}
                </div>
                <p className="text-sm text-muted-foreground text-white">
                    © {new Date().getFullYear()} Cricmawa. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
