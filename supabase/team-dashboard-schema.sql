-- IPL Auction Tracker - Team Dashboard Schema Extensions
-- Run this AFTER the main schema.sql

-- Table: retained_players
-- Stores players retained by teams before auction
CREATE TABLE IF NOT EXISTS retained_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_name TEXT NOT NULL,
  player_name TEXT NOT NULL,
  retained_amount DECIMAL(10, 2) NOT NULL,
  is_overseas BOOLEAN DEFAULT false,
  role TEXT CHECK (role IN ('Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: auction_purchases
-- Stores players bought during auction
CREATE TABLE IF NOT EXISTS auction_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_name TEXT NOT NULL,
  player_name TEXT NOT NULL,
  auction_price DECIMAL(10, 2) NOT NULL,
  is_overseas BOOLEAN DEFAULT false,
  role TEXT CHECK (role IN ('Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper')),
  player_id UUID REFERENCES current_player(id) ON DELETE SET NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_retained_players_team ON retained_players(team_name);
CREATE INDEX IF NOT EXISTS idx_auction_purchases_team ON auction_purchases(team_name);

-- Enable Row Level Security
ALTER TABLE retained_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read access
CREATE POLICY "Allow public read access on retained_players"
  ON retained_players FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on auction_purchases"
  ON auction_purchases FOR SELECT
  USING (true);

-- RLS Policies: Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users on retained_players"
  ON retained_players FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on auction_purchases"
  ON auction_purchases FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE retained_players;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_purchases;

-- Sample data for retained players (optional - remove if not needed)
-- Mumbai Indians retained players
INSERT INTO retained_players (team_name, player_name, retained_amount, is_overseas, role) VALUES
  ('Mumbai Indians', 'Rohit Sharma', 16.00, false, 'Batsman'),
  ('Mumbai Indians', 'Jasprit Bumrah', 15.00, false, 'Bowler'),
  ('Mumbai Indians', 'Suryakumar Yadav', 14.00, false, 'Batsman'),
  ('Mumbai Indians', 'Hardik Pandya', 16.00, false, 'All-rounder')
ON CONFLICT DO NOTHING;

-- Chennai Super Kings retained players
INSERT INTO retained_players (team_name, player_name, retained_amount, is_overseas, role) VALUES
  ('Chennai Super Kings', 'MS Dhoni', 12.00, false, 'Wicket-keeper'),
  ('Chennai Super Kings', 'Ravindra Jadeja', 16.00, false, 'All-rounder'),
  ('Chennai Super Kings', 'Ruturaj Gaikwad', 14.00, false, 'Batsman')
ON CONFLICT DO NOTHING;

-- Royal Challengers Bangalore retained players
INSERT INTO retained_players (team_name, player_name, retained_amount, is_overseas, role) VALUES
  ('Royal Challengers Bangalore', 'Virat Kohli', 15.00, false, 'Batsman'),
  ('Royal Challengers Bangalore', 'Glenn Maxwell', 11.00, true, 'All-rounder')
ON CONFLICT DO NOTHING;
