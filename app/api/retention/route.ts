import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { SQUADS_TAG } from '@/lib/squadsServer';
import { withAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, hasServiceKey } from '@/lib/supabaseAdmin';
import { SEASON, TEAM_CODES } from '@/lib/teams';
import { slug, type SquadPlayer } from '@/lib/squads';

export const dynamic = 'force-dynamic';

const STATUSES = ['pending', 'retained', 'released'] as const;
const VIA = ['squad', 'trade', 'added', 'auction'] as const;
type Status = (typeof STATUSES)[number];
const UUID = /^[0-9a-f-]{36}$/i;

class BadRequest extends Error { }

function team(v: unknown): string {
    const code = String(v ?? '').toUpperCase();
    if (!TEAM_CODES.includes(code)) throw new BadRequest('Unknown team');
    return code;
}
function ids(v: unknown, { allowEmpty = false, max = 200 } = {}): string[] {
    if (!Array.isArray(v) || (!allowEmpty && v.length === 0) || v.length > max || !v.every((x) => typeof x === 'string' && UUID.test(x))) {
        throw new BadRequest('Bad player ids');
    }
    return v as string[];
}
function status(v: unknown): Status {
    if (!STATUSES.includes(v as Status)) throw new BadRequest('Bad status');
    return v as Status;
}
function price(v: unknown): number {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new BadRequest('Bad price');
    return Math.round(n * 100) / 100;
}
function text(v: unknown, max = 60): string {
    const s = String(v ?? '').trim();
    if (!s || s.length > max) throw new BadRequest('Bad name');
    return s;
}
function country(v: unknown): string | null {
    const s = String(v ?? '').trim().toUpperCase();
    if (!s || s === 'IND' || s === 'INDIA') return null;
    if (s.length > 4) throw new BadRequest('Country should be a short code like AUS');
    return s;
}

const statusPatch = (s: Status) => ({
    status: s,
    status_changed_at: s === 'pending' ? null : new Date().toISOString(),
});

/** A full player row from an undo snapshot, re-validated before writing back. */
function restorableRow(r: Partial<SquadPlayer>) {
    if (!r || typeof r.id !== 'string' || !UUID.test(r.id)) throw new BadRequest('Bad snapshot row');
    if (!VIA.includes(r.acquired_via as (typeof VIA)[number])) throw new BadRequest('Bad snapshot row');
    return {
        id: r.id,
        season: SEASON,
        team_code: team(r.team_code),
        player_name: text(r.player_name),
        price: price(r.price),
        country: r.country ? country(r.country) : null,
        is_captain: Boolean(r.is_captain),
        is_wk: Boolean(r.is_wk),
        acquired_via: r.acquired_via,
        status: status(r.status),
        sort_order: Number.isFinite(Number(r.sort_order)) ? Number(r.sort_order) : 0,
        photo_key: typeof r.photo_key === 'string' ? r.photo_key.slice(0, 120) : null,
        status_changed_at: r.status_changed_at ?? null,
    };
}

/**
 * Undo info returned with every action:
 *  players   - rows as they were BEFORE the action (written back on undo)
 *  removeIds - rows the action created (deleted on undo)
 *  purse     - purse row before the action
 */
interface Undo {
    players: SquadPlayer[];
    removeIds: string[];
    purse?: { team: string; purse: number | null };
}

export const POST = withAdmin(async (req: NextRequest) => {
    if (!hasServiceKey) {
        return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server' }, { status: 500 });
    }

    const db = supabaseAdmin;
    const players = () => db.from('squad_players').select('*').eq('season', SEASON);
    const undo: Undo = { players: [], removeIds: [] };
    const snapshot = async (q: PromiseLike<{ data: SquadPlayer[] | null; error: unknown }>) => {
        const { data, error } = await q;
        if (error) throw error;
        undo.players = data ?? [];
    };

    try {
        const body = await req.json();
        let error;

        switch (body.action) {
            // Mark players retained / released / pending
            case 'setStatus': {
                const list = ids(body.ids);
                await snapshot(players().in('id', list));
                ({ error } = await db.from('squad_players').update(statusPatch(status(body.status))).in('id', list).eq('season', SEASON));
                break;
            }

            // One click per team: selected -> retained, everyone else -> released
            case 'finalizeTeam': {
                const code = team(body.team);
                const keep = ids(body.retainedIds, { allowEmpty: true });
                await snapshot(players().eq('team_code', code));
                const now = new Date().toISOString();
                if (keep.length) {
                    ({ error } = await db
                        .from('squad_players')
                        .update({ status: 'retained', status_changed_at: now })
                        .eq('season', SEASON).eq('team_code', code)
                        .in('id', keep)
                        .neq('status', 'retained'));
                    if (error) break;
                }
                let release = db
                    .from('squad_players')
                    .update({ status: 'released', status_changed_at: now })
                    .eq('season', SEASON).eq('team_code', code)
                    .neq('status', 'released');
                if (keep.length) release = release.not('id', 'in', `(${keep.join(',')})`);
                ({ error } = await release);
                break;
            }

            // Player not in the list (late trade, typo fix, etc.)
            case 'addPlayer': {
                const code = team(body.team);
                const name = text(body.name);
                const s = body.status ? status(body.status) : 'pending';
                const res = await db
                    .from('squad_players')
                    .insert({
                        season: SEASON,
                        team_code: code,
                        player_name: name,
                        price: price(body.price ?? 0),
                        country: country(body.country),
                        is_captain: Boolean(body.isCaptain),
                        is_wk: Boolean(body.isWk),
                        acquired_via: body.isTrade ? 'trade' : 'added',
                        sort_order: 1000,
                        photo_key: `${code}/${slug(name)}`,
                        ...statusPatch(s),
                    })
                    .select('id')
                    .single();
                error = res.error;
                if (res.data) undo.removeIds = [res.data.id];
                break;
            }

            // Edit name / price / country / flags
            case 'updatePlayer': {
                const id = ids([body.id]);
                const patch: Record<string, unknown> = {};
                if (body.name !== undefined) patch.player_name = text(body.name);
                if (body.price !== undefined) patch.price = price(body.price);
                if (body.country !== undefined) patch.country = country(body.country);
                if (body.isCaptain !== undefined) patch.is_captain = Boolean(body.isCaptain);
                if (body.isWk !== undefined) patch.is_wk = Boolean(body.isWk);
                await snapshot(players().in('id', id));
                ({ error } = await db.from('squad_players').update(patch).in('id', id).eq('season', SEASON));
                break;
            }

            // Trade: move to another team (photo stays with the original folder)
            case 'movePlayer': {
                const id = ids([body.id]);
                await snapshot(players().in('id', id));
                ({ error } = await db
                    .from('squad_players')
                    .update({ team_code: team(body.team), acquired_via: 'trade', ...statusPatch('retained') })
                    .in('id', id)
                    .eq('season', SEASON));
                break;
            }

            case 'deletePlayer': {
                const id = ids([body.id]);
                await snapshot(players().in('id', id));
                ({ error } = await db.from('squad_players').delete().in('id', id).eq('season', SEASON));
                break;
            }

            // Auction purse, entered by hand (null clears it)
            case 'setPurse': {
                const code = team(body.team);
                const { data: before } = await db
                    .from('season_teams').select('purse').eq('season', SEASON).eq('team_code', code).maybeSingle();
                undo.purse = { team: code, purse: before?.purse == null ? null : Number(before.purse) };
                const purse = body.purse === null || body.purse === '' ? null : price(body.purse);
                ({ error } = await db.from('season_teams').upsert({ season: SEASON, team_code: code, purse }));
                break;
            }

            // Undo: write back the "before" rows, delete rows the action created
            case 'restore': {
                const rows = Array.isArray(body.players) ? body.players.map(restorableRow) : [];
                if (rows.length > 600) throw new BadRequest('Too many rows');
                const remove = ids(body.removeIds ?? [], { allowEmpty: true, max: 600 });
                if (remove.length) {
                    ({ error } = await db.from('squad_players').delete().in('id', remove).eq('season', SEASON));
                    if (error) break;
                }
                if (rows.length) {
                    ({ error } = await db.from('squad_players').upsert(rows, { onConflict: 'id' }));
                    if (error) break;
                }
                if (body.purse) {
                    const p = body.purse.purse;
                    ({ error } = await db.from('season_teams').upsert({
                        season: SEASON,
                        team_code: team(body.purse.team),
                        purse: p === null ? null : price(p),
                    }));
                }
                if (!error) revalidateTag(SQUADS_TAG);
                return error
                    ? NextResponse.json({ error: error.message }, { status: 400 })
                    : NextResponse.json({ success: true });
            }

            default:
                throw new BadRequest('Unknown action');
        }

        if (error) {
            const msg = error.code === '23505' ? 'That player is already in this team' : error.message;
            return NextResponse.json({ error: msg }, { status: 400 });
        }
        // Server-rendered pages (SEO HTML, llms.txt, share images) refresh right away
        revalidateTag(SQUADS_TAG);
        return NextResponse.json({ success: true, undo });
    } catch (e) {
        if (e instanceof BadRequest) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }
        console.error('retention api error', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
});
