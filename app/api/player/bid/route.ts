import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import type { BidRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body: BidRequest = await request.json();
        const { player_id, player_name, team, amount } = body;

        // Validate required fields
        if (!player_id || !player_name || !team || !amount) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Insert bid into bidding history
        const { data: bidData, error: bidError } = await supabaseServer
            .from('bidding_history')
            .insert({
                player_id,
                player_name,
                team,
                amount,
            })
            .select()
            .single();

        if (bidError) throw bidError;

        // Update current player with new bid
        const { data: playerData, error: playerError } = await supabaseServer
            .from('current_player')
            .update({
                current_bid: amount,
                leading_team: team,
            })
            .eq('id', player_id)
            .select()
            .single();

        if (playerError) throw playerError;

        return NextResponse.json({
            success: true,
            data: {
                bid: bidData,
                player: playerData,
            },
        });
    } catch (error) {
        console.error('Error placing bid:', error);
        return NextResponse.json(
            { error: 'Failed to place bid' },
            { status: 500 }
        );
    }
}
