# Team Dashboard - Setup Instructions

## Overview

The Team Dashboard feature adds detailed team views with retained players, auction purchases, and comprehensive analytics.

## Database Setup

### Step 1: Run the Schema Extension

After running the main `schema.sql`, run the team dashboard schema:

```sql
-- In Supabase SQL Editor, run:
-- File: supabase/team-dashboard-schema.sql
```

This creates:
- `retained_players` table
- `auction_purchases` table
- Sample retained players data (optional)

### Step 2: Verify Tables

Check that these tables exist in your Supabase dashboard:
- ✅ `retained_players`
- ✅ `auction_purchases`
- ✅ Realtime enabled on both tables

## Features

### 1. Team Dashboard Page

**Route**: `/team/[teamName]`

**Access**: Click any team name in the Live page's "Team Purse" section

**Displays**:
- Team analytics (purse, player counts, overseas counts)
- Retained players table
- Auction purchases table
- Real-time updates

### 2. Team Analytics

Shows at the top of the dashboard:

| Metric | Description | Indicator |
|--------|-------------|-----------|
| **Total Purse** | Fixed at ₹130 Cr | - |
| **Purse Remaining** | Auto-updates from DB | Green text |
| **Total Players** | Current / 25 limit | Green/Yellow/Red badge |
| **Overseas Players** | Current / 8 limit | Green/Yellow/Red badge |
| **Slots Available** | Remaining player slots | - |
| **Overseas Slots** | Remaining overseas slots | - |

**Color Indicators**:
- 🟢 **Green**: Within safe limits (< 80%)
- 🟡 **Yellow**: Close to limit (80-100%)
- 🔴 **Red**: Exceeds limit (> 100%)

### 3. Retained Players Table

Columns:
- Player Name
- Retained Amount (₹ Cr)
- Type (Indian/Overseas badge)
- Role (Batsman/Bowler/All-rounder/Wicket-keeper)

### 4. Auction Purchases Table

Columns:
- Player Name
- Auction Price (₹ Cr)
- Type (Indian/Overseas badge)
- Role

## Global Consistency

### Automatic Updates

When a player is bought (finalized in admin):

1. **Team Purse**: Deducted automatically
2. **Players Count**: Incremented in `teams` table
3. **Auction Purchase**: Recorded in `auction_purchases` table
4. **All Pages Update**: Live page, Admin page, Team dashboard sync in realtime

### Realtime Sync

All pages subscribe to database changes:
- ✅ Live page updates team purse
- ✅ Admin page shows current counts
- ✅ Team dashboard refreshes analytics
- ✅ No page refresh needed

## Usage Guide

### For Admins

1. **Before Auction**: Add retained players via SQL or admin interface
2. **During Auction**: Use admin page normally
3. **After Sale**: Click "Finalize Sale" - purchase auto-recorded
4. **View Teams**: Click team name on live page to see dashboard

### For Viewers

1. **Live Page**: Click any team name in "Team Purse" section
2. **Team Dashboard**: View retained players and auction purchases
3. **Analytics**: See real-time purse and player counts
4. **Back Button**: Return to live page

## Adding Retained Players

### Via SQL (Recommended)

```sql
INSERT INTO retained_players (team_name, player_name, retained_amount, is_overseas, role) VALUES
  ('Mumbai Indians', 'Rohit Sharma', 16.00, false, 'Batsman'),
  ('Mumbai Indians', 'Jasprit Bumrah', 15.00, false, 'Bowler');
```

### Via Supabase Dashboard

1. Go to Table Editor
2. Select `retained_players`
3. Click "Insert" → "Insert row"
4. Fill in:
   - team_name: Exact team name from `teams` table
   - player_name: Player's full name
   - retained_amount: Amount in Crores (e.g., 16.00)
   - is_overseas: true/false
   - role: One of: Batsman, Bowler, All-rounder, Wicket-keeper

## Customization

### Adjusting Limits

Edit in `app/team/[teamName]/page.tsx`:

```typescript
const [analytics, setAnalytics] = useState<TeamAnalytics>({
  totalPurse: 130,        // Change total purse
  totalPlayerLimit: 25,   // Change player limit
  overseasLimit: 8,       // Change overseas limit
  // ...
});
```

### Adding Player Metadata

To track player nationality and role during auction:

1. Add fields to admin page player form
2. Pass to finalize API
3. Update `auction_purchases` insert in finalize route

Example:
```typescript
// In admin page, add:
const [playerRole, setPlayerRole] = useState('');
const [isOverseas, setIsOverseas] = useState(false);

// In finalize API, update:
.insert({
  team_name: team,
  player_name: playerData.name,
  auction_price: final_amount,
  is_overseas: isOverseas,  // From form
  role: playerRole,         // From form
  player_id: player_id,
});
```

## Troubleshooting

### Team Dashboard Not Loading

1. Check Supabase tables exist
2. Verify team name matches exactly (case-sensitive)
3. Check browser console for errors
4. Ensure RLS policies are enabled

### Analytics Not Updating

1. Verify realtime is enabled on tables
2. Check Supabase realtime connection
3. Ensure `teams` table has correct purse values
4. Refresh page to force re-fetch

### Retained Players Not Showing

1. Check `team_name` matches exactly
2. Verify data exists in `retained_players` table
3. Check RLS policies allow public read
4. Look for SQL errors in Supabase logs

## Testing Checklist

- [ ] Run team dashboard schema SQL
- [ ] Add sample retained players
- [ ] Click team name on live page
- [ ] Verify team dashboard loads
- [ ] Check analytics display correctly
- [ ] Verify retained players table shows data
- [ ] Finalize a player sale in admin
- [ ] Check auction purchases table updates
- [ ] Verify purse deducts correctly
- [ ] Check player count increments
- [ ] Verify realtime updates work
- [ ] Test back button navigation
- [ ] Test on mobile device

## Next Steps

1. **Add Player Metadata Form**: Extend admin page to capture role and nationality
2. **Import Players**: Bulk import retained players via CSV
3. **Export Data**: Add export functionality for team rosters
4. **Team Logos**: Add team logos to dashboard header
5. **Player Photos**: Link player photos in tables
6. **Statistics**: Add batting/bowling averages
7. **Comparison**: Compare teams side-by-side

---

**Note**: The sample retained players data in the schema is optional. Remove it if you want to start with a clean slate and add your own data.
