// TypeScript interfaces for Team Dashboard

export interface RetainedPlayer {
    id: string;
    team_name: string;
    player_name: string;
    retained_amount: number;
    is_overseas: boolean;
    role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
    created_at: string;
}

export interface AuctionPurchase {
    id: string;
    team_name: string;
    player_name: string;
    auction_price: number;
    is_overseas: boolean;
    role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
    player_id: string | null;
    purchased_at: string;
}

export interface TeamAnalytics {
    totalPurse: number;
    purseRemaining: number;
    totalPlayerLimit: number;
    overseasLimit: number;
    currentPlayersCount: number;
    currentOverseasCount: number;
    retainedPlayersCount: number;
    auctionPurchasesCount: number;
}

export interface TeamDashboardData {
    teamName: string;
    retainedPlayers: RetainedPlayer[];
    auctionPurchases: AuctionPurchase[];
    analytics: TeamAnalytics;
}
