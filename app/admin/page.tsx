'use client';

import { useState, useEffect } from 'react';
import { useCurrentPlayer, useTeams } from '@/lib/realtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import AdminGate, { type AdminCtx } from '@/components/AdminGate';
import { formatCr, purseTone } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import LiveStreamControl from '@/components/LiveStreamControl';

export default function AdminPage() {
    return <AdminGate>{(ctx) => <AuctionControl ctx={ctx} />}</AdminGate>;
}

function AuctionControl({ ctx }: { ctx: AdminCtx }) {
    const { currentPlayer: rawCurrentPlayer } = useCurrentPlayer();
    const currentPlayer = rawCurrentPlayer?.status === 'live' ? rawCurrentPlayer : null;
    const { teams } = useTeams();

    const [playerName, setPlayerName] = useState('');
    const [basePrice, setBasePrice] = useState('');
    const [oldTeam, setOldTeam] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');
    const [photoUrl, setPhotoUrl] = useState('');

    const [bidTeam, setBidTeam] = useState('');
    const [bidAmount, setBidAmount] = useState('');

    const [loading, setLoading] = useState(false);

    const handleLogout = () => ctx.logout();

    // Update form when current player changes
    useEffect(() => {
        if (currentPlayer) {
            setPlayerName(currentPlayer.name);
            setBasePrice(currentPlayer.base_price.toString());
            setOldTeam(currentPlayer.old_team || '');
            setPhotoUrl(currentPlayer.photo_url || '');
            setPhotoPreview(currentPlayer.photo_url || '');
        } else {
            setPlayerName('');
            setBasePrice('');
            setOldTeam('');
            setPhotoUrl('');
            setPhotoPreview('');
            setPhotoFile(null);
            setBidTeam('');
            setBidAmount('');
        }
    }, [currentPlayer]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadPhoto = async () => {
        if (!photoFile || !playerName) {
            alert('Please select a photo and enter player name');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', photoFile);
            formData.append('playerName', playerName);

            const response = await fetch('/api/player/upload-photo', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.success) {
                setPhotoUrl(data.data.photoUrl);
                alert('Photo uploaded successfully!');
            } else {
                alert('Failed to upload photo: ' + data.error);
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Failed to upload photo');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePlayer = async () => {
        if (!playerName || !basePrice) {
            alert('Please enter player name and base price');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/player/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: playerName,
                    photo_url: photoUrl,
                    base_price: parseFloat(basePrice),
                    old_team: oldTeam || null,
                    status: 'live',
                }),
            });

            const data = await response.json();
            if (data.success) {
                alert('Player updated successfully!');
            } else {
                alert('Failed to update player: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating player:', error);
            alert('Failed to update player');
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceBid = async () => {
        if (!currentPlayer || !bidTeam || !bidAmount) {
            alert('Please select a team and enter bid amount');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/player/bid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_id: currentPlayer.id,
                    player_name: currentPlayer.name,
                    team: bidTeam,
                    amount: parseFloat(bidAmount),
                }),
            });

            const data = await response.json();
            if (data.success) {
                setBidAmount('');
                // alert('Bid placed successfully!');
            } else {
                alert('Failed to place bid: ' + data.error);
            }
        } catch (error) {
            console.error('Error placing bid:', error);
            alert('Failed to place bid');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalizeSale = async () => {
        if (!currentPlayer || !currentPlayer.leading_team) {
            alert('No active player or leading team');
            return;
        }

        if (!confirm(`Finalize sale of ${currentPlayer.name} to ${currentPlayer.leading_team} for ₹${currentPlayer.current_bid} Cr?`)) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/player/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_id: currentPlayer.id,
                    team: currentPlayer.leading_team,
                    final_amount: currentPlayer.current_bid,
                }),
            });

            const data = await response.json();
            if (data.success) {
                // Reset form
                setPlayerName('');
                setBasePrice('');
                setOldTeam('');
                setPhotoFile(null);
                setPhotoPreview('');
                setPhotoUrl('');
                setBidTeam('');
                setBidAmount('');
                alert('Sale finalized successfully!');
            } else {
                alert('Failed to finalize sale: ' + data.error);
            }
        } catch (error) {
            console.error('Error finalizing sale:', error);
            alert('Failed to finalize sale');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkUnsold = async () => {
        if (!currentPlayer) {
            alert('No active player');
            return;
        }

        if (!confirm(`Mark ${currentPlayer.name} as UNSOLD?`)) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/player/unsold', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_id: currentPlayer.id,
                }),
            });

            const data = await response.json();
            if (data.success) {
                // Reset form
                setPlayerName('');
                setBasePrice('');
                setOldTeam('');
                setPhotoFile(null);
                setPhotoPreview('');
                setPhotoUrl('');
                setBidTeam('');
                setBidAmount('');
                alert('Player marked as unsold');
            } else {
                alert('Failed to mark as unsold: ' + data.error);
            }
        } catch (error) {
            console.error('Error marking as unsold:', error);
            alert('Failed to mark as unsold');
        } finally {
            setLoading(false);
        }
    };


    const increments = [
        { label: '+5L', value: 0.05 },
        { label: '+10L', value: 0.1 },
        { label: '+20L', value: 0.2 },
        { label: '+25L', value: 0.25 },
        { label: '+50L', value: 0.5 },
        { label: '+1 Cr', value: 1 },
        { label: '+2 Cr', value: 2 },
    ];

    const fieldLabel = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground';

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8 md:py-10">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        IPL Auction
                    </p>
                    <h1 className="font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
                        Control room
                    </h1>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/admin/retention">Retention control</Link>
                    </Button>
                    <Button onClick={handleLogout} variant="ghost" size="sm">
                        Log out
                    </Button>
                    {ctx.userMenu}
                </div>
            </div>

            <Toaster position="top-right" theme="dark" />
            <LiveStreamControl onUnauthorized={ctx.recheck} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Player Setup */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Player setup</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className={fieldLabel}>Player name</label>
                            <Input
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter player name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={fieldLabel}>Base price (₹ Cr)</label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={basePrice}
                                    onChange={(e) => setBasePrice(e.target.value)}
                                    placeholder="e.g. 2"
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Old team (optional)</label>
                                <Input
                                    value={oldTeam}
                                    onChange={(e) => setOldTeam(e.target.value)}
                                    placeholder="e.g. RCB"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={fieldLabel}>Player photo</label>
                            <div className="flex items-start gap-4">
                                {photoPreview && (
                                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                                        <Image src={photoPreview} alt="Preview" fill className="object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-2">
                                    <Input type="file" accept="image/*" onChange={handlePhotoChange} className="h-auto py-1.5" />
                                    {photoFile && (
                                        <Button onClick={handleUploadPhoto} disabled={loading} variant="secondary" size="sm">
                                            Upload photo
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleUpdatePlayer} disabled={loading} className="w-full">
                            {currentPlayer ? 'Update player' : 'Start new player'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Current Player & Bidding */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Current auction</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {currentPlayer ? (
                            <>
                                <div className="flex items-center gap-4 rounded-lg border border-border bg-background p-4">
                                    {currentPlayer.photo_url && (
                                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                                            <Image src={currentPlayer.photo_url} alt={currentPlayer.name} fill className="object-cover" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-lg font-semibold">{currentPlayer.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Base {formatCr(currentPlayer.base_price)}
                                            {currentPlayer.old_team && ` · Previously ${currentPlayer.old_team}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-display text-3xl font-bold tabular-nums text-primary">
                                            {formatCr(currentPlayer.current_bid)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {currentPlayer.leading_team ?? 'No bids yet'}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className={fieldLabel}>Bidding team</label>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {teams.map((team) => (
                                            <button
                                                key={team.id}
                                                onClick={() => setBidTeam(team.name)}
                                                className={cn(
                                                    'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                                                    bidTeam === team.name
                                                        ? 'border-primary bg-primary/10 text-foreground'
                                                        : 'border-border bg-background hover:border-input hover:bg-muted/50'
                                                )}
                                            >
                                                <div className="truncate font-medium">{team.name}</div>
                                                <div className="text-xs text-muted-foreground tabular-nums">
                                                    {formatCr(team.purse_remaining.toFixed(2))}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className={fieldLabel}>Bid amount</label>
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setBidAmount(currentPlayer.base_price.toString())}
                                        >
                                            Base
                                        </Button>
                                        {increments.map((inc) => (
                                            <Button
                                                key={inc.label}
                                                variant="secondary"
                                                size="sm"
                                                className="tabular-nums"
                                                onClick={() => {
                                                    const current = parseFloat(bidAmount) || currentPlayer.current_bid;
                                                    setBidAmount((current + inc.value).toFixed(2));
                                                }}
                                            >
                                                {inc.label}
                                            </Button>
                                        ))}
                                    </div>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={bidAmount}
                                        onChange={(e) => setBidAmount(e.target.value)}
                                        placeholder="Enter bid amount (₹ Cr)"
                                        className="h-12 font-display text-2xl font-bold tabular-nums"
                                    />
                                </div>

                                <Button onClick={handlePlaceBid} disabled={loading} size="lg" className="w-full">
                                    Place bid{bidTeam && bidAmount ? ` · ${bidTeam} ${formatCr(bidAmount)}` : ''}
                                </Button>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={handleMarkUnsold}
                                        disabled={loading || !!currentPlayer?.leading_team}
                                        variant="outline"
                                    >
                                        Mark unsold
                                    </Button>
                                    <Button
                                        onClick={handleFinalizeSale}
                                        disabled={loading || !currentPlayer.leading_team}
                                        variant="success"
                                    >
                                        Finalize sale
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <p className="py-10 text-center text-sm text-muted-foreground">
                                No active player. Start a new one on the left.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Teams Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Teams</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-5">
                        {teams.map((team) => (
                            <div key={team.id} className="bg-card p-4">
                                <div className="truncate text-sm font-medium">{team.name}</div>
                                <div className={cn('font-display text-xl font-bold tabular-nums', purseTone(team.purse_remaining))}>
                                    {formatCr(team.purse_remaining.toFixed(2))}
                                </div>
                                <div className="text-xs text-muted-foreground">{team.players_purchased} bought</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
