import { ImageResponse } from 'next/og';

// Shared 1200x630 social preview (WhatsApp / X / Instagram link cards).
// Runs on the edge runtime (the Node runtime of next/og breaks builds on Windows).
export const OG_SIZE = { width: 1200, height: 630 };

let logoData: Promise<string> | null = null;
function logo() {
    logoData ??= fetch(new URL('../public/images/cricmawa_logo.png', import.meta.url))
        .then((r) => r.arrayBuffer())
        .then((buf) => {
            let bin = '';
            const bytes = new Uint8Array(buf);
            for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
            return `data:image/png;base64,${btoa(bin)}`;
        });
    return logoData;
}

// Barlow Condensed Bold (the site's display font), fetched once from Google Fonts.
let fontData: Promise<ArrayBuffer | null> | null = null;
function displayFont() {
    fontData ??= fetch('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&display=swap')
        .then((r) => r.text())
        .then((css) => {
            const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
            return url ? fetch(url).then((r) => r.arrayBuffer()) : null;
        })
        .catch(() => null);
    return fontData;
}

export async function ogImage(opts: {
    eyebrow: string;
    title: string;
    accent?: string;
    stats?: { label: string; value: string; color?: string }[];
}) {
    const accent = opts.accent ?? '#f2b33d';
    const [src, font] = await Promise.all([logo(), displayFont()]);
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#0a0b0d',
                    color: '#ecedee',
                    fontFamily: font ? 'Barlow' : 'sans-serif',
                }}
            >
                <div style={{ height: 14, width: '100%', background: accent, display: 'flex' }} />
                <div style={{ display: 'flex', flex: 1, padding: '56px 64px', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} width={84} height={84} style={{ borderRadius: 999 }} alt="" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>CRICMAWA</div>
                            <div style={{ fontSize: 22, color: '#8b919a', letterSpacing: 4 }}>{opts.eyebrow.toUpperCase()}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', fontSize: 108, fontWeight: 700, lineHeight: 0.95, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {opts.title}
                    </div>
                    <div style={{ display: 'flex', gap: 56 }}>
                        {(opts.stats ?? []).map((s) => (
                            <div key={s.label} style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 84, fontWeight: 700, color: s.color ?? '#ecedee' }}>{s.value}</div>
                                <div style={{ fontSize: 22, color: '#8b919a', letterSpacing: 3 }}>{s.label.toUpperCase()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        ),
        {
            ...OG_SIZE,
            fonts: font ? [{ name: 'Barlow', data: font, weight: 700, style: 'normal' }] : undefined,
            // Stats change during the day: let CDNs refresh every 5 minutes (default is cache forever)
            headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' },
        }
    );
}
