'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PlayerAvatar from '@/components/PlayerAvatar';
import { PlayerTags, TeamChip, formatPrice } from '@/components/retention';
import { TEAMS } from '@/lib/teams';
import { byTradeSeq, type SquadPlayer, type Trade } from '@/lib/squads';
import { cn } from '@/lib/utils';

const fieldLabel = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground';

type Run = (body: Record<string, unknown>, ok?: string) => Promise<boolean>;

/**
 * Admin trade builder: pick two teams, tick the players each side gives up,
 * set their new prices, confirm. Players switch teams (retained, TRADE tag) and
 * the trade appears in the public Trades tab.
 */
export default function TradeForm({
    players,
    trades,
    defaultTeam,
    busy,
    run,
    onClose,
}: {
    players: SquadPlayer[];
    trades: Trade[];
    defaultTeam: string;
    busy: boolean;
    run: Run;
    onClose: () => void;
}) {
    const [teamA, setTeamA] = useState(defaultTeam);
    const [teamB, setTeamB] = useState(TEAMS.find((t) => t.code !== defaultTeam)!.code);
    // player id -> new price (string while typing)
    const [picked, setPicked] = useState<Map<string, string>>(new Map());

    const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
    const legs = [...picked.entries()]
        .map(([id, price]) => ({ p: byId.get(id), price }))
        .filter((l): l is { p: SquadPlayer; price: string } => Boolean(l.p) && (l.p!.team_code === teamA || l.p!.team_code === teamB));
    const fromA = legs.filter((l) => l.p.team_code === teamA);
    const fromB = legs.filter((l) => l.p.team_code === teamB);
    const badPrice = legs.some((l) => l.price === '' || !Number.isFinite(Number(l.price)) || Number(l.price) < 0 || Number(l.price) > 100);

    const toggle = (p: SquadPlayer) =>
        setPicked((m) => {
            const n = new Map(m);
            n.has(p.id) ? n.delete(p.id) : n.set(p.id, String(p.price));
            return n;
        });
    const setPrice = (id: string, v: string) => setPicked((m) => new Map(m).set(id, v));

    const describe = (list: typeof legs, to: string) =>
        list.map((l) => `${l.p.player_name} → ${to} (${formatPrice(Number(l.price))})`).join('\n');

    const submit = async () => {
        if (!legs.length || badPrice) return;
        const msg = `Confirm trade ${teamA} ⇄ ${teamB}?\n\n${[describe(fromA, teamB), describe(fromB, teamA)].filter(Boolean).join('\n')}`;
        if (!confirm(msg)) return;
        const ok = await run(
            { action: 'trade', teamA, teamB, legs: legs.map((l) => ({ id: l.p.id, price: Number(l.price) })) },
            `Trade done: ${teamA} ⇄ ${teamB}`
        );
        if (ok) setPicked(new Map());
    };

    const history = [...trades].sort(byTradeSeq);

    return (
        <div className="space-y-4 rounded-xl border border-[#a855f7]/40 bg-[#a855f7]/[0.05] p-4">
            <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-[#d8b4fe]" />
                <h2 className="font-display text-2xl font-bold uppercase tracking-wide">New trade</h2>
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={onClose} title="Close">
                    <X />
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                Tick the players each team gives up and set their new price. For a one-way transfer (cash deal) tick players on one side only.
                Traded players are marked retained in their new team with a TRADE tag. Undo works like any other action.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
                <TeamSide
                    label="Team A gives"
                    team={teamA}
                    other={teamB}
                    onTeam={setTeamA}
                    players={players}
                    picked={picked}
                    onToggle={toggle}
                    onPrice={setPrice}
                />
                <TeamSide
                    label="Team B gives"
                    team={teamB}
                    other={teamA}
                    onTeam={setTeamB}
                    players={players}
                    picked={picked}
                    onToggle={toggle}
                    onPrice={setPrice}
                />
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                {legs.length === 0 ? (
                    <span className="text-muted-foreground">Pick at least one player.</span>
                ) : (
                    <span className="flex flex-wrap items-center gap-2">
                        <TeamChip code={teamA} /> gives {fromA.length || 'nothing'}
                        <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <TeamChip code={teamB} /> gives {fromB.length || 'nothing'}
                        {badPrice && <span className="text-destructive">· check prices</span>}
                    </span>
                )}
                <Button className="ml-auto" disabled={busy || !legs.length || badPrice} onClick={submit}>
                    <ArrowLeftRight />
                    Confirm trade
                </Button>
            </div>

            {history.length > 0 && (
                <div>
                    <div className={fieldLabel}>Trade history ({history.length})</div>
                    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                        {history.map((t, i) => (
                            <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                                <span className="w-7 shrink-0 text-xs tabular-nums text-muted-foreground">#{history.length - i}</span>
                                <TeamChip code={t.team_a} />
                                <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <TeamChip code={t.team_b} />
                                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                    {t.legs.map((l) => `${l.player_name} → ${l.to_team}`).join(', ')}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                    disabled={busy}
                                    title="Remove from trade history (players stay in their current teams)"
                                    onClick={() => {
                                        if (confirm(`Remove trade #${history.length - i} (${t.team_a} ⇄ ${t.team_b}) from the history?\nPlayers stay in their current teams.`)) {
                                            run({ action: 'deleteTrade', id: t.id }, 'Trade removed from history');
                                        }
                                    }}
                                >
                                    <Trash2 />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function TeamSide({
    label,
    team,
    other,
    onTeam,
    players,
    picked,
    onToggle,
    onPrice,
}: {
    label: string;
    team: string;
    other: string;
    onTeam: (t: string) => void;
    players: SquadPlayer[];
    picked: Map<string, string>;
    onToggle: (p: SquadPlayer) => void;
    onPrice: (id: string, v: string) => void;
}) {
    const [q, setQ] = useState('');
    const list = players
        .filter((p) => p.team_code === team && p.status !== 'released')
        .filter((p) => !q.trim() || p.player_name.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => Number(picked.has(b.id)) - Number(picked.has(a.id)) || b.price - a.price);

    return (
        <div className="rounded-lg border border-border bg-card p-3">
            <label className={fieldLabel}>{label}</label>
            <select
                value={team}
                onChange={(e) => onTeam(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
                {TEAMS.filter((t) => t.code !== other).map((t) => (
                    <option key={t.code} value={t.code}>
                        {t.code} · {t.name}
                    </option>
                ))}
            </select>
            <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={`Search ${team}…`} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <ul className="scroll-thin mt-2 max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border">
                {list.map((p) => {
                    const on = picked.has(p.id);
                    return (
                        <li key={p.id} className={cn('flex items-center gap-2 px-2 py-1.5', on && 'bg-[#a855f7]/10')}>
                            <input
                                type="checkbox"
                                checked={on}
                                onChange={() => onToggle(p)}
                                className="h-4 w-4 shrink-0 cursor-pointer accent-[#a855f7]"
                                aria-label={`Trade ${p.player_name}`}
                            />
                            <button type="button" onClick={() => onToggle(p)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                <PlayerAvatar photoKey={p.photo_key} name={p.player_name} className="h-7 w-7" />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="truncate text-sm">{p.player_name}</span>
                                        <PlayerTags p={p} />
                                    </span>
                                    {!on && <span className="text-xs tabular-nums text-muted-foreground">{formatPrice(p.price)}</span>}
                                </span>
                            </button>
                            {on && (
                                <div className="flex shrink-0 items-center gap-1">
                                    <span className="text-xs text-muted-foreground">New ₹ Cr</span>
                                    <Input
                                        type="number"
                                        step="0.05"
                                        min="0"
                                        max="100"
                                        value={picked.get(p.id)}
                                        onChange={(e) => onPrice(p.id, e.target.value)}
                                        className="h-8 w-20 tabular-nums"
                                        aria-label={`New price for ${p.player_name}`}
                                    />
                                </div>
                            )}
                        </li>
                    );
                })}
                {list.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No players</li>}
            </ul>
        </div>
    );
}
