// Cricmawa's channels, shown in the "Follow us" card and the footer.
// Same list as the SRH fan site (Downloads/sunriser/srh/lib/socialLinks.js),
// with the Instagram handle corrected to @cric_mawa_.

export const LINKTREE_URL = 'https://linktr.ee/cricmawa1';

export type SocialKey = 'instagram' | 'twitter' | 'youtube' | 'whatsapp-channel' | 'whatsapp-group';

export interface SocialLink {
    key: SocialKey;
    label: string;
    hint: string;
    url: string;
    /** Background of the round icon chip */
    bg: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
    {
        key: 'instagram',
        label: 'Instagram',
        hint: '@cric_mawa_',
        url: 'https://www.instagram.com/cric_mawa_',
        bg: 'linear-gradient(45deg, #f58529, #dd2a7b 55%, #8134af)',
    },
    {
        key: 'twitter',
        label: 'X (Twitter)',
        hint: '@cricmawa',
        url: 'https://x.com/cricmawa',
        bg: '#000000',
    },
    {
        key: 'youtube',
        label: 'YouTube',
        hint: '@cric_mawa',
        url: 'https://www.youtube.com/@cric_mawa',
        bg: '#ff0000',
    },
    {
        key: 'whatsapp-channel',
        label: 'WhatsApp Channel',
        hint: 'Daily cricket updates',
        url: 'https://whatsapp.com/channel/0029Va9ymy8CBtx5wFzacA0g',
        bg: '#25d366',
    },
    {
        key: 'whatsapp-group',
        label: 'WhatsApp Group',
        hint: 'Chat with the community',
        url: 'https://chat.whatsapp.com/EONXlY6J7McHan5gt1Poz1?s=cl&p=a&mlu=4&ilr=4',
        bg: '#128c7e',
    },
];
