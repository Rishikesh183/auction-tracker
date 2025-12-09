import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import type { FinalizeRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body: FinalizeRequest = await request.json();
        const { player_id, team, final_amount } = body;

        // Validate required fields
        if (!player_id || !team || !final_amount) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Mark player as completed
        const { data: playerData, error: playerError } = await supabaseServer
            .from('current_player')
            .update({
                status: 'completed',
                current_bid: final_amount,
                leading_team: team,
            })
            .eq('id', player_id)
            .select()
            .single();

        if (playerError) throw playerError;

        // Update team purse and player count
        const { data: teamData, error: teamError } = await supabaseServer
            .from('teams')
            .select('purse_remaining, players_purchased')
            .eq('name', team)
            .single();

        if (teamError) throw teamError;

        const newPurse = teamData.purse_remaining - final_amount;
        const newPlayerCount = teamData.players_purchased + 1;

        const { error: updateTeamError } = await supabaseServer
            .from('teams')
            .update({
                purse_remaining: newPurse,
                players_purchased: newPlayerCount,
            })
            .eq('name', team);

        if (updateTeamError) throw updateTeamError;

        return NextResponse.json({
            success: true,
            data: {
                player: playerData,
                team: {
                    name: team,
                    purse_remaining: newPurse,
                    players_purchased: newPlayerCount,
                },
            },
        });
    } catch (error) {
        console.error('Error finalizing sale:', error);
        return NextResponse.json(
            { error: 'Failed to finalize sale' },
            { status: 500 }
        );
    }
}
