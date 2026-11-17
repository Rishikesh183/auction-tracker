// Scans public/players/<TEAM>/ and writes lib/player-photos.json:
//   { "csk/sanju-samson": "/players/CSK/sanju-samson.webp", ... }
// Keys are fully lower-cased (team AND name) because PlayerAvatar lower-cases
// the DB photo_key before looking it up.
// Runs automatically before `npm run dev` and `npm run build`, so after adding
// photos just restart dev / redeploy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath handles Windows drive letters and spaces/%20 in the path.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playersDir = path.join(root, 'public', 'players');
const EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);

const manifest = {};
if (fs.existsSync(playersDir)) {
    for (const team of fs.readdirSync(playersDir)) {
        const dir = path.join(playersDir, team);
        if (!fs.statSync(dir).isDirectory()) continue;
        for (const file of fs.readdirSync(dir)) {
            const ext = path.extname(file).toLowerCase();
            if (!EXT.has(ext)) continue;
            if (file === 'default.svg') continue;
            const key = `${team}/${path.basename(file, path.extname(file))}`.toLowerCase();
            manifest[key] = `/players/${encodeURIComponent(team)}/${encodeURIComponent(file)}`;
        }
    }
}

fs.writeFileSync(path.join(root, 'lib', 'player-photos.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`player photos: ${Object.keys(manifest).length}`);
