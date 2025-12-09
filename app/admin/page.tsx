'use client';

import { useState, useEffect } from 'react';
import { useCurrentPlayer, useTeams } from '@/lib/realtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function AdminPage() {
    const { currentPlayer } = useCurrentPlayer();
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

    // Update form when current player changes
    useEffect(() => {
        if (currentPlayer) {
            setPlayerName(currentPlayer.name);
            setBasePrice(currentPlayer.base_price.toString());
            setOldTeam(currentPlayer.old_team || '');
            setPhotoUrl(currentPlayer.photo_url || '');
            setPhotoPreview(currentPlayer.photo_url || '');
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8 text-center">
                    IPL Auction Admin Dashboard
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Player Setup */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                        <CardHeader>
                            <CardTitle className="text-2xl">Player Setup</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Player Name</label>
                                <Input
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    placeholder="Enter player name"
                                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Base Price (₹ Cr)</label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={basePrice}
                                    onChange={(e) => setBasePrice(e.target.value)}
                                    placeholder="Enter base price"
                                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Old Team (Optional)</label>
                                <Input
                                    value={oldTeam}
                                    onChange={(e) => setOldTeam(e.target.value)}
                                    placeholder="Enter old team"
                                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Player Photo</label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="bg-white/10 border-white/30 text-white file:text-white"
                                />
                                {photoPreview && (
                                    <div className="mt-2 relative w-32 h-32 rounded-lg overflow-hidden">
                                        <Image
                                            src={photoPreview}
                                            alt="Preview"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                {photoFile && (
                                    <Button
                                        onClick={handleUploadPhoto}
                                        disabled={loading}
                                        className="mt-2 bg-green-600 hover:bg-green-700"
                                    >
                                        Upload Photo
                                    </Button>
                                )}
                            </div>

                            <Button
                                onClick={handleUpdatePlayer}
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {currentPlayer ? 'Update Player' : 'Start New Player'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Current Player & Bidding */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                        <CardHeader>
                            <CardTitle className="text-2xl">Current Auction</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {currentPlayer ? (
                                <>
                                    <div className="bg-white/5 rounded-lg p-4 space-y-2">
                                        <h3 className="text-xl font-bold">{currentPlayer.name}</h3>
                                        {currentPlayer.photo_url && (
                                            <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                                                <Image
                                                    src={currentPlayer.photo_url}
                                                    alt={currentPlayer.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <p className="text-sm">Base Price: ₹{currentPlayer.base_price} Cr</p>
                                        {currentPlayer.old_team && (
                                            <p className="text-sm">Old Team: {currentPlayer.old_team}</p>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">Current Bid:</span>
                                            <Badge className="bg-yellow-500 text-black">
                                                ₹{currentPlayer.current_bid} Cr
                                            </Badge>
                                        </div>
                                        {currentPlayer.leading_team && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">Leading Team:</span>
                                                <Badge className="bg-green-500 text-black">
                                                    {currentPlayer.leading_team}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-semibold">Place New Bid</h4>

                                        {/* TEAM BUTTON SELECTOR */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {teams.map((team) => (
                                                <button
                                                    key={team.id}
                                                    onClick={() => setBidTeam(team.name)}
                                                    className={`p-3 rounded-lg border text-sm font-medium
                    ${bidTeam === team.name
                                                            ? "bg-orange-600 border-orange-400 text-white"
                                                            : "bg-white/10 border-white/30 text-white hover:bg-white/20"
                                                        }
                `}
                                                >
                                                    {team.name}
                                                    <div className="text-xs opacity-80">
                                                        ₹{team.purse_remaining.toFixed(2)} Cr
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={bidAmount}
                                            onChange={(e) => setBidAmount(e.target.value)}
                                            placeholder="Enter bid amount"
                                            className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                                        />

                                        <Button
                                            onClick={handlePlaceBid}
                                            disabled={loading}
                                            className="w-full bg-orange-600 hover:bg-orange-700"
                                        >
                                            Place Bid
                                        </Button>

                                        <Button
                                            onClick={handleFinalizeSale}
                                            disabled={loading || !currentPlayer.leading_team}
                                            className="w-full bg-green-600 hover:bg-green-700"
                                        >
                                            Finalize Sale
                                        </Button>
                                    </div>

                                </>
                            ) : (
                                <p className="text-center text-white/60 py-8">
                                    No active player. Start a new auction above.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Teams Overview */}
                <Card className="mt-8 bg-white/10 backdrop-blur-lg border-white/20 text-white">
                    <CardHeader>
                        <CardTitle className="text-2xl">Teams Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {teams.map((team) => (
                                <div
                                    key={team.id}
                                    className="bg-white/5 rounded-lg p-4 text-center space-y-1"
                                >
                                    <h4 className="font-semibold text-sm">{team.name}</h4>
                                    <p className="text-lg font-bold text-green-400">
                                        ₹{team.purse_remaining.toFixed(2)} Cr
                                    </p>
                                    <p className="text-xs text-white/60">
                                        {team.players_purchased} players
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
