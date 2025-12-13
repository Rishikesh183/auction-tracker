import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { player_id } = body;

        // Validate required fields
        if (!player_id) {
            return NextResponse.json(
                { error: 'Player ID is required' },
                { status: 400 }
            );
        }

        // Mark player as unsold
        const { data: playerData, error: playerError } = await supabaseServer
            .from('current_player')
            .update({
                status: 'unsold',
            })
            .eq('id', player_id)
            .select()
            .single();

        if (playerError) throw playerError;

        return NextResponse.json({
            success: true,
            data: {
                player: playerData,
            },
        });
    } catch (error) {
        console.error('Error marking player as unsold:', error);
        return NextResponse.json(
            { error: 'Failed to mark player as unsold' },
            { status: 500 }
        );
    }
}
