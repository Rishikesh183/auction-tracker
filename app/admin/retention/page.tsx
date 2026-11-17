'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { ArrowLeftRight, Check, ChevronDown, Plus, RotateCcw, Search, Undo2, X } from 'lucide-react';
import { useSquads } from '@/lib/useSquads';
import { summarize, type SquadPlayer, type SquadStatus } from '@/lib/squads';
import { TEAMS, getTeam } from '@/lib/teams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlayerAvatar from '@/components/PlayerAvatar';
import AdminGate, { AdminCheckingSkeleton, type AdminCtx } from '@/components/AdminGate';
import { Spinner } from '@/components/Skeletons';
import { PlayerTags, StatusPill, TeamChip, formatPrice } from '@/components/retention';
import { cn } from '@/lib/utils';
import LiveStreamControl from '@/components/LiveStreamControl';
import TradeForm from '@/components/TradeForm';

async function api(body: Record<string, unknown>) {
    const res = await fetch('/api/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

interface UndoEntry {
    id: number;
    label: string;
    undo: {
        players: unknown[];
        removeIds: string[];
        purse?: { team: string; purse: number | null };
        removeTradeIds?: string[];
        trades?: unknown[];
    };
}
let undoSeq = 0;

const fieldLabel = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground';

export default function AdminRetentionPage() {
    return <AdminGate>{(ctx) => <RetentionControl ctx={ctx} />}</AdminGate>;
}

function RetentionControl({ ctx }: { ctx: AdminCtx }) {
    const { players, purses, trades, loading, error, reload } = useSquads({ fresh: true });
    const [showTrade, setShowTrade] = useState(false);
    const [team, setTeam] = useState(TEAMS[0].code);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [purseInput, setPurseInput] = useState('');
    const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

    const meta = getTeam(team)!;
    const teamPlayers = useMemo(() => players.filter((p) => p.team_code === team), [players, team]);
    const sum = summarize(teamPlayers);
    const ordered = [...sum.pending, ...sum.retained, ...sum.released];
    const q = query.trim().toLowerCase();
    const visible = q ? ordered.filter((p) => p.player_name.toLowerCase().includes(q)) : ordered;

    // Reset per-team UI when switching teams
    useEffect(() => {
        setSelected(new Set());
        setExpanded(null);
        setShowAdd(false);
        setQuery('');
    }, [team]);
    useEffect(() => {
        const v = purses[team];
        setPurseInput(v == null ? '' : String(v));
    }, [team, purses]);

    const undoEntry = async (entry: UndoEntry) => {
        setBusy(true);
        try {
            await api({ action: 'restore', ...entry.undo });
            setUndoStack((st) => st.filter((e) => e.id !== entry.id));
            toast.success(`Undone: ${entry.label}`);
            await reload();
        } catch (e) {
            toast.error(`Undo failed: ${(e as Error).message}`);
        } finally {
            setBusy(false);
        }
    };

    const run = async (body: Record<string, unknown>, okMsg?: string) => {
        setBusy(true);
        try {
            const data = await api(body);
            const label = okMsg ?? String(body.action);
            if (data.undo) {
                const entry: UndoEntry = { id: ++undoSeq, label, undo: data.undo };
                setUndoStack((st) => [entry, ...st].slice(0, 30));
                toast.success(label, { action: { label: 'Undo', onClick: () => undoEntry(entry) }, duration: 6000 });
            } else if (okMsg) {
                toast.success(okMsg);
            }
            await reload();
            return true;
        } catch (e) {
            const msg = (e as Error).message;
            if (msg === 'Not logged in') ctx.recheck();
            toast.error(msg);
            return false;
        } finally {
            setBusy(false);
        }
    };

    const setStatus = async (ids: string[], status: SquadStatus) => {
        if (!ids.length) return;
        const ok = await run({ action: 'setStatus', ids, status }, `${ids.length} marked ${status}`);
        if (ok) setSelected(new Set());
    };

    const finalize = async () => {
        const keep = [...selected].filter((id) => teamPlayers.some((p) => p.id === id));
        const releaseCount = teamPlayers.length - keep.length;
        if (!confirm(`${meta.code}: retain ${keep.length} selected and RELEASE the other ${releaseCount}?`)) return;
        const ok = await run({ action: 'finalizeTeam', team, retainedIds: keep }, `${meta.code} list published`);
        if (ok) setSelected(new Set());
    };

    const toggle = (id: string) =>
        setSelected((s) => {
            const n = new Set(s);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });

    const logout = () => ctx.logout();

    if (loading) return <AdminCheckingSkeleton />;
    if (error) {
        return (
            <div className="mx-auto max-w-lg px-4 py-20 text-center">
                <h1 className="font-display text-3xl font-bold uppercase">Squads table missing</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Run <code>supabase/2027-retention.sql</code> in the Supabase SQL editor. ({error})
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 pb-32 pt-8 md:px-8 md:pt-10">
            <Toaster position="top-right" theme="dark" />

            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">IPL 2027 · Admin</p>
                    <h1 className="font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">Retention control</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy || undoStack.length === 0}
                        onClick={() => undoStack[0] && undoEntry(undoStack[0])}
                        title={undoStack[0] ? `Undo: ${undoStack[0].label}` : 'Nothing to undo'}
                    >
                        <Undo2 />
                        {undoStack[0] ? `Undo · ${undoStack[0].label}` : 'Undo'}
                    </Button>
                    <Button
                        size="sm"
                        variant={showTrade ? 'secondary' : 'outline'}
                        className="border-[#a855f7]/50 text-[#d8b4fe]"
                        onClick={() => setShowTrade(!showTrade)}
                    >
                        <ArrowLeftRight />
                        Trade
                    </Button>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/retention" target="_blank">
                            Open viewer
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/admin">Auction admin</Link>
                    </Button>
                    <Button onClick={logout} variant="ghost" size="sm">
                        Log out
                    </Button>
                    {ctx.userMenu}
                </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
                Mistake? Every action can be undone (button above, or Undo on the toast), newest first, until you reload this page.
            </p>

            <LiveStreamControl onUnauthorized={ctx.recheck} />

            {showTrade && (
                <div className="mt-6">
                    <TradeForm
                        players={players}
                        trades={trades}
                        defaultTeam={team}
                        busy={busy}
                        run={run}
                        onClose={() => setShowTrade(false)}
                    />
                </div>
            )}

            {/* Team picker */}
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {TEAMS.map((t) => {
                    const s = summarize(players.filter((p) => p.team_code === t.code));
                    return (
                        <button
                            key={t.code}
                            onClick={() => setTeam(t.code)}
                            className={cn(
                                'rounded-lg border p-2.5 text-left transition-colors',
                                team === t.code ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted/50'
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <TeamChip code={t.code} />
                                {s.announced && <Check className="h-4 w-4 text-success" />}
                            </div>
                            <div className="mt-1.5 flex gap-2 text-xs tabular-nums">
                                <span className="text-success">{s.retained.length}R</span>
                                <span className="text-destructive">{s.released.length}X</span>
                                <span className="text-muted-foreground">{s.pending.length} left</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Team panel */}
            <Card className="mt-6 overflow-hidden">
                <div className="h-1" style={{ background: meta.accent }} />
                <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between sm:space-y-0">
                    <div>
                        <CardTitle className="font-display text-3xl font-bold uppercase tracking-wide">{meta.name}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                            {sum.retained.length} retained ({formatPrice(Math.round(sum.retainedSpend * 100) / 100)}) ·{' '}
                            {sum.released.length} released · {sum.pending.length} awaiting
                        </p>
                    </div>
                    <form
                        className="flex items-end gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            run({ action: 'setPurse', team, purse: purseInput === '' ? null : purseInput }, 'Purse saved');
                        }}
                    >
                        <div>
                            <label className={fieldLabel}>Auction purse (₹ Cr)</label>
                            <Input
                                type="number"
                                step="0.05"
                                min="0"
                                value={purseInput}
                                onChange={(e) => setPurseInput(e.target.value)}
                                placeholder="TBA"
                                className="w-32 tabular-nums"
                            />
                        </div>
                        <Button type="submit" variant="secondary" disabled={busy}>
                            Save
                        </Button>
                    </form>
                </CardHeader>

                <CardContent className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder={`Search ${meta.code}…`} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setSelected(new Set(sum.pending.map((p) => p.id)))}>
                                Select awaiting
                            </Button>
                            <Button variant="outline" onClick={() => setShowAdd(!showAdd)}>
                                <Plus />
                                Add player
                            </Button>
                        </div>
                    </div>

                    {showAdd && (
                        <AddPlayerForm
                            team={team}
                            busy={busy}
                            onSubmit={async (body) => {
                                const ok = await run({ action: 'addPlayer', team, ...body }, `${body.name} added to ${team}`);
                                if (ok) setShowAdd(false);
                            }}
                        />
                    )}

                    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                        {visible.map((p) => (
                            <AdminRow
                                key={p.id}
                                p={p}
                                checked={selected.has(p.id)}
                                expanded={expanded === p.id}
                                busy={busy}
                                onToggle={() => toggle(p.id)}
                                onExpand={() => setExpanded(expanded === p.id ? null : p.id)}
                                onStatus={(s) => setStatus([p.id], s)}
                                run={run}
                            />
                        ))}
                        {visible.length === 0 && <li className="py-10 text-center text-sm text-muted-foreground">No players</li>}
                    </ul>
                </CardContent>
            </Card>

            {/* Sticky action bar */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3 md:px-8">
                    <span className="mr-auto flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
                        {busy && (
                            <span className="flex items-center gap-1.5 text-primary">
                                <Spinner /> Saving…
                            </span>
                        )}
                        <b className="text-foreground">{selected.size}</b> selected
                        {selected.size > 0 && (
                            <button onClick={() => setSelected(new Set())} className="ml-2 text-xs underline-offset-2 hover:underline">
                                clear
                            </button>
                        )}
                    </span>
                    <Button variant="success" disabled={busy || !selected.size} onClick={() => setStatus([...selected], 'retained')}>
                        <Check />
                        Retain
                    </Button>
                    <Button variant="destructive" disabled={busy || !selected.size} onClick={() => setStatus([...selected], 'released')}>
                        <X />
                        Release
                    </Button>
                    <Button variant="outline" disabled={busy || !selected.size} onClick={() => setStatus([...selected], 'pending')}>
                        <RotateCcw />
                        Reset
                    </Button>
                    <Button disabled={busy} onClick={finalize} title="Selected players retained, everyone else in this team released">
                        Retain selected, release rest
                    </Button>
                </div>
            </div>
        </div>
    );
}

function AdminRow({
    p,
    checked,
    expanded,
    busy,
    onToggle,
    onExpand,
    onStatus,
    run,
}: {
    p: SquadPlayer;
    checked: boolean;
    expanded: boolean;
    busy: boolean;
    onToggle: () => void;
    onExpand: () => void;
    onStatus: (s: SquadStatus) => void;
    run: (body: Record<string, unknown>, ok?: string) => Promise<boolean>;
}) {
    const [name, setName] = useState(p.player_name);
    const [price, setPrice] = useState(String(p.price));
    const [country, setCountry] = useState(p.country ?? '');
    const [isCaptain, setIsCaptain] = useState(p.is_captain);
    const [isWk, setIsWk] = useState(p.is_wk);
    const [moveTo, setMoveTo] = useState('');

    return (
        <li className={cn(checked && 'bg-primary/[0.07]')}>
            <div className="flex items-center gap-3 px-3 py-2">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onToggle}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-primary)]"
                    aria-label={`Select ${p.player_name}`}
                />
                <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <PlayerAvatar photoKey={p.photo_key} name={p.player_name} className="h-8 w-8" />
                    <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{p.player_name}</span>
                            <PlayerTags p={p} />
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{formatPrice(p.price)}</span>
                    </span>
                </button>
                <StatusPill status={p.status} className="hidden sm:inline-flex" />
                <div className="flex shrink-0 gap-1">
                    <Button
                        size="icon"
                        variant={p.status === 'retained' ? 'success' : 'secondary'}
                        className="h-8 w-8"
                        disabled={busy}
                        onClick={() => onStatus(p.status === 'retained' ? 'pending' : 'retained')}
                        title={p.status === 'retained' ? 'Undo retain' : 'Retain'}
                    >
                        <Check />
                    </Button>
                    <Button
                        size="icon"
                        variant={p.status === 'released' ? 'destructive' : 'secondary'}
                        className="h-8 w-8"
                        disabled={busy}
                        onClick={() => onStatus(p.status === 'released' ? 'pending' : 'released')}
                        title={p.status === 'released' ? 'Undo release' : 'Release'}
                    >
                        <X />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onExpand} title="Edit / move">
                        <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
                    </Button>
                </div>
            </div>

            {expanded && (
                <div className="grid gap-4 border-t border-border bg-background/60 px-3 py-4 md:grid-cols-2">
                    <form
                        className="space-y-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            run({ action: 'updatePlayer', id: p.id, name, price, country, isCaptain, isWk }, 'Saved');
                        }}
                    >
                        <div className="grid grid-cols-[1fr_90px_80px] gap-2">
                            <div>
                                <label className={fieldLabel}>Name</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div>
                                <label className={fieldLabel}>₹ Cr</label>
                                <Input type="number" step="0.05" value={price} onChange={(e) => setPrice(e.target.value)} />
                            </div>
                            <div>
                                <label className={fieldLabel}>Country</label>
                                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="IND" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={isCaptain} onChange={(e) => setIsCaptain(e.target.checked)} /> Captain
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={isWk} onChange={(e) => setIsWk(e.target.checked)} /> Wicket-keeper
                            </label>
                            <Button type="submit" size="sm" variant="secondary" className="ml-auto" disabled={busy}>
                                Save
                            </Button>
                        </div>
                    </form>
                    <div className="space-y-3">
                        <div>
                            <label className={fieldLabel}>Trade to another team (marks retained there)</label>
                            <div className="flex gap-2">
                                <select
                                    value={moveTo}
                                    onChange={(e) => setMoveTo(e.target.value)}
                                    className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                                >
                                    <option value="">Choose team…</option>
                                    {TEAMS.filter((t) => t.code !== p.team_code).map((t) => (
                                        <option key={t.code} value={t.code}>
                                            {t.code} · {t.name}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="secondary"
                                    disabled={busy || !moveTo}
                                    onClick={() => {
                                        if (confirm(`Move ${p.player_name} from ${p.team_code} to ${moveTo}?`)) {
                                            run({ action: 'movePlayer', id: p.id, team: moveTo }, `${p.player_name} → ${moveTo}`);
                                        }
                                    }}
                                >
                                    Move
                                </Button>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={busy}
                            onClick={() => {
                                if (confirm(`Delete ${p.player_name} from the list completely? (Use Release for normal releases.)`)) {
                                    run({ action: 'deletePlayer', id: p.id }, 'Deleted');
                                }
                            }}
                        >
                            Delete from list
                        </Button>
                    </div>
                </div>
            )}
        </li>
    );
}

function AddPlayerForm({
    team,
    busy,
    onSubmit,
}: {
    team: string;
    busy: boolean;
    onSubmit: (body: Record<string, unknown> & { name: string }) => void;
}) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [country, setCountry] = useState('');
    const [isCaptain, setIsCaptain] = useState(false);
    const [isWk, setIsWk] = useState(false);
    const [isTrade, setIsTrade] = useState(false);
    const [status, setStatus] = useState<SquadStatus>('retained');

    return (
        <form
            className="space-y-3 rounded-lg border border-primary/30 bg-primary/[0.04] p-4"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit({ name: name.trim(), price: price || 0, country, isCaptain, isWk, isTrade, status });
            }}
        >
            <div className="text-sm font-semibold">Add player to {team}</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_90px_140px]">
                <div>
                    <label className={fieldLabel}>Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <div>
                    <label className={fieldLabel}>₹ Cr</label>
                    <Input type="number" step="0.05" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.3" />
                </div>
                <div>
                    <label className={fieldLabel}>Country</label>
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="IND" />
                </div>
                <div>
                    <label className={fieldLabel}>Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as SquadStatus)}
                        className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                        <option value="retained">Retained</option>
                        <option value="pending">Awaiting</option>
                        <option value="released">Released</option>
                    </select>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={isCaptain} onChange={(e) => setIsCaptain(e.target.checked)} /> Captain
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={isWk} onChange={(e) => setIsWk(e.target.checked)} /> Wicket-keeper
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={isTrade} onChange={(e) => setIsTrade(e.target.checked)} /> Traded in
                </label>
                <Button type="submit" className="ml-auto" disabled={busy || !name.trim()}>
                    <Plus />
                    Add
                </Button>
            </div>
        </form>
    );
}
