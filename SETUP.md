# IPL Auction Tracker - Setup Guide

A real-time IPL auction tracking system built with Next.js 14, Supabase Realtime, and TailwindCSS.

## 🚀 Features

- **Real-time Updates**: Live bidding updates using Supabase Realtime
- **Admin Dashboard**: Complete control panel for managing auctions
- **Public Live View**: Beautiful auction viewer for spectators
- **Team Management**: Track team purses and player purchases
- **Photo Upload**: Player photo management with Supabase Storage
- **Toast Notifications**: Live bid notifications for viewers

## 📋 Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Basic knowledge of Next.js

## 🛠️ Setup Instructions

### 1. Supabase Project Setup

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned

### 2. Database Setup

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/schema.sql`
3. Paste and run the SQL in the editor
4. This will create:
   - `current_player` table
   - `bidding_history` table
   - `teams` table (pre-populated with 10 IPL teams)
   - All necessary indexes and RLS policies

### 3. Storage Bucket Setup

1. In Supabase dashboard, go to **Storage**
2. Create a new bucket named `players`
3. Make it **public** (Settings → Public bucket: ON)
4. This bucket will store player photos

### 4. Environment Variables

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon/public key**
3. Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Run Development Server

```bash
npm run dev
```

The app will be available at:
- **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Live Viewer**: [http://localhost:3000/live](http://localhost:3000/live)

## 📖 Usage Guide

### Admin Dashboard (`/admin`)

1. **Start New Player**:
   - Enter player name
   - Set base price (in Crores)
   - Optionally add old team
   - Upload player photo
   - Click "Start New Player"

2. **Place Bids**:
   - Select team from dropdown
   - Enter bid amount
   - Click "Place Bid"
   - The live page updates instantly!

3. **Finalize Sale**:
   - Once bidding is complete
   - Click "Finalize Sale"
   - Team purse automatically updates
   - Player moves to completed list

### Live Viewer (`/live`)

- Open in a separate browser/device
- See current player with photo
- Watch bids update in real-time
- View team purses
- See completed players list
- Get toast notifications for new bids

## 🏗️ Project Structure

```
auction-tracker/
├── app/
│   ├── admin/
│   │   └── page.tsx          # Admin dashboard
│   ├── live/
│   │   └── page.tsx          # Public live viewer
│   └── api/
│       └── player/
│           ├── update/        # Update player API
│           ├── bid/           # Place bid API
│           ├── finalize/      # Finalize sale API
│           └── upload-photo/  # Photo upload API
├── components/
│   └── ui/                    # Shadcn UI components
├── lib/
│   ├── supabaseClient.ts      # Client-side Supabase
│   ├── supabaseServer.ts      # Server-side Supabase
│   ├── realtime.ts            # Realtime hooks
│   ├── storage.ts             # Storage utilities
│   ├── types.ts               # TypeScript types
│   └── utils.ts               # Utility functions
└── supabase/
    └── schema.sql             # Database schema
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime
- **Storage**: Supabase Storage
- **Styling**: TailwindCSS
- **UI Components**: Shadcn UI
- **Notifications**: Sonner

## 🔧 Troubleshooting

### Realtime not working?

1. Check that you've run the SQL schema (it enables realtime)
2. Verify your environment variables are correct
3. Make sure RLS policies are enabled

### Photos not uploading?

1. Verify the `players` bucket exists
2. Make sure it's set to **public**
3. Check file size (max 5MB)
4. Only JPEG, PNG, WebP allowed

### Dependencies issues?

If you see peer dependency warnings:
```bash
npm install --legacy-peer-deps
```

## 📝 Notes

- The `@theme` CSS warning in globals.css is expected with Tailwind v4
- All lint errors about missing modules will resolve after `npm install`
- Default team purse is ₹100 Cr per team
- Bidding history shows last 50 bids

## 🎯 Next Steps

1. Customize team names/purses in `supabase/schema.sql`
2. Add authentication for admin dashboard
3. Deploy to Vercel/Netlify
4. Add more features (player stats, auction timer, etc.)

## 📄 License

MIT

---

**Built with ❤️ for IPL Auction enthusiasts**
