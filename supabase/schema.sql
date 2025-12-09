-- IPL Auction Tracker Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: current_player
-- Stores the currently active player being auctioned
CREATE TABLE IF NOT EXISTS current_player (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  photo_url TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  old_team TEXT,
  current_bid DECIMAL(10, 2) DEFAULT 0,
  leading_team TEXT,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: bidding_history
-- Tracks all bids placed during the auction
CREATE TABLE IF NOT EXISTS bidding_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES current_player(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: teams
-- Manages team information and remaining purse
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  purse_remaining DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  players_purchased INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_current_player_status ON current_player(status);
CREATE INDEX IF NOT EXISTS idx_bidding_history_player_id ON bidding_history(player_id);
CREATE INDEX IF NOT EXISTS idx_bidding_history_timestamp ON bidding_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- Enable Row Level Security
ALTER TABLE current_player ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read access for live viewing
CREATE POLICY "Allow public read access on current_player"
  ON current_player FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on bidding_history"
  ON bidding_history FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on teams"
  ON teams FOR SELECT
  USING (true);

-- RLS Policies: Allow all operations for authenticated users (admin)
CREATE POLICY "Allow all operations for authenticated users on current_player"
  ON current_player FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on bidding_history"
  ON bidding_history FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on teams"
  ON teams FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE current_player;
ALTER PUBLICATION supabase_realtime ADD TABLE bidding_history;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;

-- Insert default IPL teams
INSERT INTO teams (name, purse_remaining, players_purchased) VALUES
  ('Mumbai Indians', 100.00, 0),
  ('Chennai Super Kings', 100.00, 0),
  ('Royal Challengers Bangalore', 100.00, 0),
  ('Kolkata Knight Riders', 100.00, 0),
  ('Delhi Capitals', 100.00, 0),
  ('Punjab Kings', 100.00, 0),
  ('Rajasthan Royals', 100.00, 0),
  ('Sunrisers Hyderabad', 100.00, 0),
  ('Gujarat Titans', 100.00, 0),
  ('Lucknow Super Giants', 100.00, 0)
ON CONFLICT (name) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_current_player_updated_at
  BEFORE UPDATE ON current_player
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
