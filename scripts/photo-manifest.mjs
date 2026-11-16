// Scans public/players/<TEAM>/ and writes lib/player-photos.json:
//   { "CSK/sanju-samson": "/players/CSK/sanju-samson.png", ... }
// Runs automatically before `npm run dev` and `npm run build`, so after adding
// photos just restart dev / redeploy.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const playersDir = path.join(root, 'public', 'players');
const EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);

const manifest = {};
if (fs.existsSync(playersDir)) {
    for (const team of fs.readdirSync(playersDir)) {
        const dir = path.join(playersDir, team);
        if (!fs.statSync(dir).isDirectory()) continue;
        for (const file of fs.readdirSync(dir)) {
            const ext = path.extname(file).toLowerCase();
            if (!EXT.has(ext)) continue;
            const key = `${team}/${path.basename(file, path.extname(file)).toLowerCase()}`;
            manifest[key] = `/players/${team}/${file}`;
        }
    }
}

fs.writeFileSync(path.join(root, 'lib', 'player-photos.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`player photos: ${Object.keys(manifest).length}`);
