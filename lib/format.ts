/** ₹12.5 Cr style amount; up to 2 decimals, no trailing zeros. */
export function formatCr(value: number | string | null | undefined): string {
    const n = Number(value ?? 0);
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

/** Text colour for a team's remaining purse. */
export function purseTone(purse: number): string {
    if (purse > 50) return 'text-success';
    if (purse > 20) return 'text-warning';
    return 'text-destructive';
}

export function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
