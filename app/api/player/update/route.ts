import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import type { UpdatePlayerRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body: UpdatePlayerRequest = await request.json();
        const { name, photo_url, base_price, old_team, status = 'live' } = body;

        // Validate required fields
        if (!name || !base_price) {
            return NextResponse.json(
                { error: 'Name and base price are required' },
                { status: 400 }
            );
        }

        // Check if there's already a live player
        const { data: existingPlayer } = await supabaseServer
            .from('current_player')
            .select('*')
            .eq('status', 'live')
            .single();

        let result;

        if (existingPlayer) {
            // Update existing live player
            const { data, error } = await supabaseServer
                .from('current_player')
                .update({
                    name,
                    photo_url: photo_url || null,
                    base_price,
                    old_team: old_team || null,
                    current_bid: base_price,
                    leading_team: null,
                    status,
                })
                .eq('id', existingPlayer.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Create new player
            const { data, error } = await supabaseServer
                .from('current_player')
                .insert({
                    name,
                    photo_url: photo_url || null,
                    base_price,
                    old_team: old_team || null,
                    current_bid: base_price,
                    leading_team: null,
                    status,
                })
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Error updating player:', error);
        return NextResponse.json(
            { error: 'Failed to update player' },
            { status: 500 }
        );
    }
}
