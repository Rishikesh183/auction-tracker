// TypeScript interfaces for IPL Auction Tracker database tables

export interface CurrentPlayer {
  id: string;
  name: string;
  photo_url: string | null;
  base_price: number;
  old_team: string | null;
  current_bid: number;
  leading_team: string | null;
  status: 'live' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface BiddingHistory {
  id: string;
  player_id: string;
  player_name: string;
  team: string;
  amount: number;
  timestamp: string;
}

export interface Team {
  id: string;
  name: string;
  purse_remaining: number;
  players_purchased: number;
  created_at: string;
  updated_at: string;
  players_retained: number;
}

// Request/Response types for API routes
export interface UpdatePlayerRequest {
  name: string;
  photo_url?: string;
  base_price: number;
  old_team?: string;
  status?: 'live' | 'completed';
}

export interface BidRequest {
  player_id: string;
  player_name: string;
  team: string;
  amount: number;
}

export interface FinalizeRequest {
  player_id: string;
  team: string;
  final_amount: number;
}
