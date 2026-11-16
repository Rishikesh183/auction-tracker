// IPL franchises for the 2027 season (retention + auction).
// `color`/`fg` = brand chip colours; `accent` = a version of the brand colour
// that stays readable on the dark page background (stripes, text).

export interface TeamMeta {
    code: string;
    name: string;
    coach: string;
    color: string;
    fg: string;
    accent: string;
}

export const TEAMS: TeamMeta[] = [
    { code: 'CSK', name: 'Chennai Super Kings', coach: 'Zaheer Khan', color: '#f9cd05', fg: '#111111', accent: '#f9cd05' },
    { code: 'MI', name: 'Mumbai Indians', coach: 'Kieron Pollard', color: '#004ba0', fg: '#ffffff', accent: '#3b82f6' },
    { code: 'KKR', name: 'Kolkata Knight Riders', coach: 'Abhishek Nayar', color: '#3a225d', fg: '#f2c94c', accent: '#9b6bdf' },
    { code: 'SRH', name: 'Sunrisers Hyderabad', coach: 'Daniel Vettori', color: '#f26522', fg: '#111111', accent: '#f26522' },
    { code: 'GT', name: 'Gujarat Titans', coach: 'Ashish Nehra', color: '#1b2133', fg: '#e5c07b', accent: '#e5c07b' },
    { code: 'RR', name: 'Rajasthan Royals', coach: 'Kumar Sangakkara', color: '#ea1a85', fg: '#ffffff', accent: '#ea1a85' },
    { code: 'PBKS', name: 'Punjab Kings', coach: 'Ricky Ponting', color: '#dd1f2d', fg: '#ffffff', accent: '#ef3b48' },
    { code: 'LSG', name: 'Lucknow Super Giants', coach: 'Justin Langer', color: '#5aa0e6', fg: '#0b1e3a', accent: '#5aa0e6' },
    { code: 'RCB', name: 'Royal Challengers Bengaluru', coach: 'Andy Flower', color: '#c8102e', fg: '#ffffff', accent: '#e63349' },
    { code: 'DC', name: 'Delhi Capitals', coach: 'Sourav Ganguly', color: '#1f5fd1', fg: '#ffffff', accent: '#4a86f0' },
];

export const TEAM_CODES = TEAMS.map((t) => t.code);

export function getTeam(code: string): TeamMeta | undefined {
    return TEAMS.find((t) => t.code === code.toUpperCase());
}

export const SEASON = 2027;

/** Retention announcements go live (IST). */
export const RETENTION_LIVE_AT = new Date('2026-11-17T17:00:00+05:30');
/** IPL 2027 auction day (IST). */
export const AUCTION_2027_AT = new Date('2026-12-16T00:00:00+05:30');

export const SQUAD_LIMIT = 25;
export const OVERSEAS_LIMIT = 8;
