# Getting Started with FitCSV

## What We've Built

✅ **Complete POC with:**
- Next.js 15 app with Supabase Auth
- Database schema (Prisma + PostgreSQL)
- Row Level Security policies
- Auth pages (login/signup)
- Programs dashboard
- Seed script for sample data

## Test the App Locally

### 1. Start the Development Server

```bash
doppler run -- npm run dev
```

Open http://localhost:3000

### 2. Create an Account

1. Click "Get Started" or go to http://localhost:3000/signup
2. Enter your email and password
3. Click "Sign up"
4. Check your email for confirmation (Supabase sends a confirmation email)
5. Click the confirmation link
6. Go back to http://localhost:3000/login and sign in

### 3. Seed Sample Data

After creating your account, you need to add your user ID to Doppler:

1. Go to Supabase Dashboard → Authentication → Users
2. Copy your user ID (looks like: `a1b2c3d4-...`)
3. Add it to Doppler:
   ```bash
   doppler secrets set SEED_USER_ID="your-user-id-here"
   ```
4. Run the seed script:
   ```bash
   doppler run -- npx prisma db seed
   ```

This creates a sample "3-Day Strength Program" with:
- Week 1
- 3 workouts (Upper Body, Lower Body, Full Body)
- Sample exercises with prescribed sets

### 4. View Your Program

1. Sign in at http://localhost:3000/login
2. You'll be redirected to `/programs`
3. You should see your sample program marked as "ACTIVE"

## What's Working

- ✅ User signup/login
- ✅ Session management
- ✅ Programs list page
- ✅ Database with RLS (your data is isolated)
- ✅ Sample program seeding

## What's Next

To complete the POC, we still need to build:

1. **Week View**: Click a program → see list of workouts for the current week
2. **Workout Logging**: Click a workout → log sets/reps/weight for each exercise
3. **Mark Complete**: Ability to mark workouts as completed
4. **Week Navigation**: Navigate between weeks with arrows

## Troubleshooting

### "Can't reach database"
- Verify Doppler secrets are correct: `doppler secrets`
- Check DATABASE_URL uses port 6543 (pooler)
- Check DIRECT_URL uses port 5432 (direct connection)

### "Unauthorized" or auth not working
- Clear browser cookies
- Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Doppler
- Verify email confirmation was clicked

### "No programs yet"
- Run the seed script (see step 3 above)
- Make sure SEED_USER_ID matches your actual user ID from Supabase

### Prisma errors
- Re-generate client: `doppler run -- npx prisma generate`
- Push schema again: `doppler run -- npx prisma db push`

## Development Workflow

```bash
# Start dev server
doppler run -- npm run dev

# View database
doppler run -- npx prisma studio

# Regenerate Prisma client after schema changes
doppler run -- npx prisma generate

# Push schema changes (for prototyping)
doppler run -- npx prisma db push

# Create migration (for production features)
doppler run -- npx prisma migrate dev --name feature_name
```

## Next Steps

Want to continue building? The next features to add are:

1. **Week/Workout Detail Pages** (`/programs/[id]/weeks/[weekId]`)
2. **Exercise Logging Modal** (click exercise → enter sets/reps)
3. **Completion Tracking** (mark workouts done, show checkmarks)
4. **CSV Import** (upload CSV → parse → create program)

Ready to continue?
