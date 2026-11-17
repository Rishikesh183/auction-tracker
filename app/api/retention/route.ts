import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { SQUADS_TAG } from '@/lib/squadsServer';
import { withAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, hasServiceKey } from '@/lib/supabaseAdmin';
import { SEASON, TEAM_CODES } from '@/lib/teams';
import { slug, normalizeTrade, type SquadPlayer, type Trade, type TradeLeg } from '@/lib/squads';

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

/** A trade row from an undo snapshot, re-validated before writing back. */
function restorableTrade(t: Partial<Trade>) {
    if (!t || typeof t.id !== 'string' || !UUID.test(t.id)) throw new BadRequest('Bad snapshot trade');
    if (!Array.isArray(t.legs) || t.legs.length > 20) throw new BadRequest('Bad snapshot trade');
    return {
        id: t.id,
        seq: Number.isFinite(Number(t.seq)) ? Number(t.seq) : undefined,
        season: SEASON,
        team_a: team(t.team_a),
        team_b: team(t.team_b),
        legs: t.legs.map((l) => ({
            player_id: typeof l.player_id === 'string' && UUID.test(l.player_id) ? l.player_id : null,
            player_name: text(l.player_name),
            from_team: team(l.from_team),
            to_team: team(l.to_team),
            price: price(l.price),
            photo_key: typeof l.photo_key === 'string' ? l.photo_key.slice(0, 120) : null,
            country: l.country ? country(l.country) : null,
        })),
        created_at: typeof t.created_at === 'string' ? t.created_at : undefined,
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
    /** trade rows the action created (deleted on undo) */
    removeTradeIds?: string[];
    /** trade rows the action deleted (written back on undo) */
    trades?: Trade[];
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

            // Trade between two teams: every listed player switches to the other team at
            // the new price (marked retained + TRADE), and the trade is logged for the Trades tab.
            // One-way trades (cash deals) just list players from one side.
            case 'trade': {
                const a = team(body.teamA);
                const b = team(body.teamB);
                if (a === b) throw new BadRequest('Pick two different teams');
                if (!Array.isArray(body.legs) || body.legs.length === 0 || body.legs.length > 12) {
                    throw new BadRequest('Pick at least one player');
                }
                const legsIn = body.legs.map((l: { id: unknown; price: unknown }) => ({ id: ids([l?.id])[0], price: price(l?.price) }));
                const legIds = legsIn.map((l: { id: string }) => l.id);
                if (new Set(legIds).size !== legIds.length) throw new BadRequest('Same player picked twice');

                await snapshot(players().in('id', legIds));
                const byId = new Map(undo.players.map((p) => [p.id, p]));
                const legs: TradeLeg[] = [];
                for (const l of legsIn) {
                    const p = byId.get(l.id);
                    if (!p) throw new BadRequest('Player not found');
                    if (p.team_code !== a && p.team_code !== b) throw new BadRequest(`${p.player_name} is not in ${a} or ${b}`);
                    legs.push({
                        player_id: p.id,
                        player_name: p.player_name,
                        from_team: p.team_code,
                        to_team: p.team_code === a ? b : a,
                        price: l.price,
                        photo_key: p.photo_key,
                        country: p.country,
                    });
                }

                const results = await Promise.all(
                    legs.map((l) =>
                        db
                            .from('squad_players')
                            .update({ team_code: l.to_team, price: l.price, acquired_via: 'trade', ...statusPatch('retained') })
                            .eq('id', l.player_id!)
                            .eq('season', SEASON)
                    )
                );
                error = results.find((r) => r.error)?.error ?? null;
                if (!error) {
                    const ins = await db.from('trades').insert({ season: SEASON, team_a: a, team_b: b, legs }).select('id').single();
                    error = ins.error;
                    if (ins.data) undo.removeTradeIds = [ins.data.id];
                    if (error && /trades/.test(error.message)) error = { ...error, message: `${error.message} (run supabase/trades.sql)` };
                }
                if (error) {
                    // Put every player back so a half-done trade never shows up
                    await db.from('squad_players').upsert(undo.players.map(restorableRow), { onConflict: 'id' });
                }
                break;
            }

            // Remove a trade from the history only (players stay where they are)
            case 'deleteTrade': {
                const id = ids([body.id])[0];
                const { data, error: e } = await db.from('trades').select('*').eq('id', id).maybeSingle();
                if (e) throw e;
                if (!data) throw new BadRequest('Trade not found');
                undo.trades = [normalizeTrade(data)];
                ({ error } = await db.from('trades').delete().eq('id', id));
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
                const removeTrades = ids(body.removeTradeIds ?? [], { allowEmpty: true, max: 50 });
                if (removeTrades.length) {
                    ({ error } = await db.from('trades').delete().in('id', removeTrades));
                    if (error) break;
                }
                const tradeRows = Array.isArray(body.trades) ? body.trades.slice(0, 50).map(restorableTrade) : [];
                if (tradeRows.length) {
                    ({ error } = await db.from('trades').upsert(tradeRows, { onConflict: 'id' }));
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
