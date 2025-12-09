# Environment Variables Reference

## Required Environment Variables

You need to create a `.env.local` file in the project root with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## How to Get These Values

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
4. Copy the **anon/public** key (long string starting with `eyJ...`)
5. Create `.env.local` file in project root
6. Paste the values

## Important Notes

- The `.env.local` file is gitignored for security
- Never commit your actual keys to version control
- Both variables must start with `NEXT_PUBLIC_` to be accessible in the browser
- Restart the dev server after adding environment variables

## Example

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzQ1Njc4OSwiZXhwIjoxOTM5MDMyNzg5fQ.example-key-here
```
