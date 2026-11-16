'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fieldLabel = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground';

/** Login form. Credentials are checked on the server (/api/admin/session). */
export default function AdminLogin({ onDone }: { onDone: () => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const res = await fetch('/api/admin/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        setBusy(false);
        if (res.ok) onDone();
        else setError('Invalid username or password');
    };

    return (
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="font-display text-3xl font-bold uppercase tracking-wide">Admin login</CardTitle>
                    <p className="text-sm text-muted-foreground">Auction control room</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className={fieldLabel}>Username</label>
                            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
                        </div>
                        <div>
                            <label className={fieldLabel}>Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                        </div>
                        {error && <p className="text-center text-sm text-destructive">{error}</p>}
                        <Button type="submit" className="w-full" disabled={busy}>
                            Log in
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

