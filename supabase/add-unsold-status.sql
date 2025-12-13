-- Update schema to support 'unsold' status
-- Run this in Supabase SQL Editor

-- Update the status check constraint to include 'unsold'
ALTER TABLE current_player DROP CONSTRAINT IF EXISTS current_player_status_check;
ALTER TABLE current_player ADD CONSTRAINT current_player_status_check 
  CHECK (status IN ('live', 'completed', 'unsold'));

-- Note: Existing data will not be affected
-- New players can now be marked as 'unsold'
