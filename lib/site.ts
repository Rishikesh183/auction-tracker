// Site-wide SEO constants.

/**
 * Public URL of the site (no trailing slash). Set NEXT_PUBLIC_SITE_URL to the real
 * domain; on Vercel the production domain is picked up automatically.
 */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    'http://localhost:3000'
).replace(/\/$/, '');

export const SITE_NAME = 'Cricmawa IPL Live';
export const SITE_SHORT = 'Cricmawa';
export const SITE_DESCRIPTION =
    'IPL 2027 retentions and releases live: full list of retained and released players for all 10 teams, purse left for the IPL 2027 auction, trades, and live auction updates by Cricmawa.';

export const KEYWORDS = [
    'IPL 2027 retention',
    'IPL 2027 retention list',
    'IPL 2027 retained players',
    'IPL 2027 released players',
    'IPL retention list 2027',
    'IPL 2027 auction',
    'IPL 2027 auction date',
    'IPL 2027 purse',
    'IPL mini auction 2027',
    'CSK retained players 2027',
    'MI retained players 2027',
    'RCB retained players 2027',
    'SRH retained players 2027',
    'KKR retained players 2027',
    'IPL trades 2027',
    'Cricmawa',
];

export const abs = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
