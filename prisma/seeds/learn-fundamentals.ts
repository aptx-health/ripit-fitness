/**
 * Learning content: Training Fundamentals articles + collection definitions.
 *
 * Targets beginner-to-intermediate lifters who want to understand
 * how programs, progression, and recovery work.
 */

import type { ArticleSeed, CollectionSeed } from './learn-types'
import {
  safetyBasics,
  howMachinesWork,
  rangeOfMotionAndForm,
  understandingIntensity,
  pickingAStartingWeight,
  warmUpGuide,
} from './learn-articles'

// ---------------------------------------------------------------------------
// Training Fundamentals articles
// ---------------------------------------------------------------------------

export const howProgramsWork: ArticleSeed = {
  title: 'How Training Programs Work',
  slug: 'how-programs-work',
  level: 'beginner',
  readTimeMinutes: 3,
  tags: [
    { name: 'Programs', category: 'topic' },
    { name: 'Beginner Basics', category: 'topic' },
    { name: 'Progressive Overload', category: 'topic' },
  ],
  body: `## What is a program?

A training program is a plan that tells you what to do each time you go to the gym. Instead of wandering around picking random exercises, you follow a structured plan that builds on itself over time.

## How programs are structured

Programs are organized into **weeks**, and each week contains **workouts** (training days):

\`\`\`
Program: "Beginner Full Body"
  Week 1
    Workout 1 (Monday) — Full Body A
    Workout 2 (Wednesday) — Full Body B
    Workout 3 (Friday) — Full Body A
  Week 2
    Workout 1 (Monday) — Full Body B
    Workout 2 (Wednesday) — Full Body A
    ...and so on
\`\`\`

The days don't have to be Monday/Wednesday/Friday — that's just an example. What matters is doing the workouts in order.

## What's in a workout?

Each workout lists exercises with **prescribed sets** — the plan for what you should do:

\`\`\`
Bench Press      3 sets x 10 reps @ RPE 7
Dumbbell Row     3 sets x 10 reps @ RPE 7
Leg Press        3 sets x 12 reps @ RPE 7
\`\`\`

When you do the workout, you **log** what you actually did. Maybe you hit all 10 reps on bench press, or maybe you only got 8 on the last set — that's fine. The app tracks both the plan and the reality.

## Progressive overload — the secret to getting stronger

Progressive overload means gradually increasing the challenge over time. It's the single most important concept in strength training.

Ways to progress:

1. **Add weight.** Last week you did 100 lbs x 10 reps. This week, try 105 lbs x 10.
2. **Add reps.** Last week you did 100 lbs x 8. This week, aim for 100 lbs x 10.
3. **Add sets.** Last week you did 2 sets. This week, do 3.

You don't need to progress every single session. But over the course of weeks and months, the trend should go up.

## Why follow a program instead of winging it?

- **Consistency.** You always know what to do when you walk into the gym.
- **Balance.** Good programs hit all your muscle groups so nothing gets neglected.
- **Tracking.** You can see your progress over time because you're repeating the same exercises.
- **Efficiency.** No time wasted deciding what to do — you just follow the plan.

## Picking your first program

If you're brand new, look for programs labeled **"beginner"** in the app. These programs:

- Use machines (easier to learn, safer).
- Train the full body each session (simpler to schedule).
- Have 3 workouts per week (plenty for a beginner).
- Run for 4-6 weeks (long enough to see progress, short enough to stay fresh).

Don't overthink it. **The best program is the one you actually do.** Pick one, follow it for a month, and go from there.
`,
}

export const readingYourWorkout: ArticleSeed = {
  title: 'Reading Your Workout: Sets, Reps, RPE, and RIR',
  slug: 'reading-your-workout',
  level: 'beginner',
  readTimeMinutes: 3,
  tags: [
    { name: 'Beginner Basics', category: 'topic' },
    { name: 'Programs', category: 'topic' },
  ],
  body: `## Decoding workout notation

When you open a workout, you'll see something like this:

\`\`\`
Bench Press    3 x 10 @ RPE 7
\`\`\`

Here's what each piece means:

## Sets

A **set** is one round of an exercise. "3 sets" means you'll do the exercise three times, resting between each one.

\`\`\`
Set 1: Do 10 reps → rest
Set 2: Do 10 reps → rest
Set 3: Do 10 reps → done
\`\`\`

## Reps

A **rep** (repetition) is one complete movement. One push on chest press = 1 rep. Ten pushes = 10 reps.

"3 x 10" = 3 sets of 10 reps = 30 total reps, split into 3 rounds.

## RPE (Rate of Perceived Exertion)

RPE tells you **how hard** the set should feel on a 1-10 scale:

| RPE | What it means |
|-----|---------------|
| **6** | Could easily do 4 more reps |
| **7** | Could do 3 more reps — solid effort |
| **8** | Could do 2 more — this is hard |
| **9** | Maybe 1 more rep — near your limit |
| **10** | Absolute max — no more reps possible |

For most of your training, you'll be in the **RPE 7-8 range**. That means the set is challenging but you finish it with a little gas left in the tank.

## RIR (Reps in Reserve)

RIR is the flip side of RPE — it counts how many reps you have **left** instead of how hard it feels:

- RPE 7 = RIR 3 (could do 3 more)
- RPE 8 = RIR 2 (could do 2 more)
- RPE 9 = RIR 1 (could do 1 more)

The app lets you use whichever scale you prefer. They mean the same thing.

## Weight

Some programs prescribe a specific weight ("135 lbs") while others just specify the intensity ("RPE 7"). If a weight is listed, treat it as a suggestion — use whatever weight gets you to the target RPE.

## Putting it all together

\`\`\`
Leg Press    3 x 12 @ RPE 7
\`\`\`

Translation: "Do leg press for 3 sets of 12 reps. Each set should feel like a 7 out of 10 effort — you finish and think, 'I could have done about 3 more reps.'"

## What to log

After each set, log:
- **The weight you used**
- **The reps you completed** (it's fine if it's different from what was prescribed)
- **The RPE or RIR** (how hard it actually felt)

This data helps you track progress and adjust weights over time. Don't stress about being perfectly precise — an honest estimate is exactly what the app needs.
`,
}

export const whenToIncreaseWeight: ArticleSeed = {
  title: 'When to Increase Weight',
  slug: 'when-to-increase-weight',
  level: 'intermediate',
  readTimeMinutes: 3,
  tags: [
    { name: 'Progressive Overload', category: 'topic' },
    { name: 'Strength Training', category: 'topic' },
  ],
  body: `## The simple rule

**If you hit the top of your prescribed rep range at or below the target RPE for all sets, increase the weight next session.**

That's it. Everything below is just explaining that rule with examples.

## Example in action

Your program says: **Bench Press — 3 x 8-10 @ RPE 7-8**

| Session | Set 1 | Set 2 | Set 3 | Action |
|---------|-------|-------|-------|--------|
| Week 1 | 100 lbs x 8 @ RPE 8 | 100 x 8 @ RPE 8 | 100 x 7 @ RPE 9 | Stay at 100 lbs (didn't hit 10 on all sets) |
| Week 2 | 100 x 10 @ RPE 8 | 100 x 9 @ RPE 8 | 100 x 8 @ RPE 8 | Stay (not all sets at 10 reps) |
| Week 3 | 100 x 10 @ RPE 7 | 100 x 10 @ RPE 8 | 100 x 10 @ RPE 8 | **Go up!** All sets hit 10 reps within RPE range |
| Week 4 | 105 x 8 @ RPE 8 | 105 x 8 @ RPE 8 | 105 x 7 @ RPE 9 | Stay — building back up at new weight |

Notice: when you increase weight, your reps drop back down. That's normal and expected. You'll build them back up over the next few sessions.

## How much to increase

| Exercise type | Increase by |
|--------------|-------------|
| Lower body (squat, leg press, deadlift) | 5-10 lbs |
| Upper body (bench, rows, shoulder press) | 2.5-5 lbs |
| Isolation (curls, tricep extensions) | 2.5-5 lbs |
| Machine exercises | 1 pin (usually 10-15 lbs) |

Smaller jumps = more sustainable progress. There's no prize for going up 20 lbs in one shot.

## What if you're stuck?

If you've been at the same weight for 3+ sessions without hitting the top of the rep range:

1. **Check your sleep and nutrition.** Recovery matters more than most people think.
2. **Check your RPE honesty.** Are you really at RPE 8, or are you sandbagging at RPE 6?
3. **Try adding one rep per session** instead of waiting for a perfect set of all top-range reps.
4. **Consider a deload week.** Drop the weight by 20-30% for a week, then come back. You'll often blast through the plateau.

## Progression isn't always linear

Beginners can often add weight every session ("newbie gains"). After a few months, progress slows to every week or two. After a year or more, monthly progress is normal.

This is completely fine. The timeline gets longer, but the progress doesn't stop. The key is showing up consistently and trusting the process.

## The bottom line

- Hit all your reps at the target intensity? Go up.
- Didn't hit them all? Stay and build.
- Stuck for weeks? Check recovery, try a deload.
- **Never sacrifice form for a weight increase.** Adding 5 lbs with good form beats adding 20 lbs with terrible form, every single time.
`,
}

export const restPeriods: ArticleSeed = {
  title: 'Rest Periods: Why They Matter',
  slug: 'rest-periods',
  level: 'intermediate',
  readTimeMinutes: 3,
  tags: [
    { name: 'Recovery', category: 'topic' },
    { name: 'Strength Training', category: 'topic' },
  ],
  body: `## How long should you rest between sets?

Resting between sets isn't "being lazy" — it's part of the training. The length of your rest directly affects what you get out of the next set.

## General guidelines

| Goal | Rest period | Why |
|------|-------------|-----|
| **Strength** (heavy weight, low reps) | 2-5 minutes | Your nervous system and energy stores need time to fully recover so you can lift heavy again. |
| **Muscle growth** (moderate weight, 8-12 reps) | 60-90 seconds | Moderate rest keeps metabolic stress high, which helps stimulate muscle growth. |
| **Endurance** (light weight, 15+ reps) | 30-60 seconds | Short rest trains your muscles to resist fatigue. |

**If you're a beginner, rest 90 seconds to 2 minutes between sets.** That's a safe default for any exercise.

## Why not just rest as long as you want?

You can — and for heavy compound lifts (squats, deadlifts, bench press), longer rest is actually better. But there are tradeoffs:

- **Too short** (under 60 seconds for most exercises): You won't recover enough, your reps will drop, and your form will suffer.
- **Too long** (5+ minutes for isolation work): Your muscles cool down, your workout takes forever, and you lose the metabolic stimulus.

## How to time your rest

You don't need to be obsessive about it. Here are two approaches:

### 1. Use a timer (precise)
Start a timer after your last rep. When it hits your target (e.g., 90 seconds), start the next set. Most workout apps (including this one) have a built-in rest timer.

### 2. The breathing test (practical)
Wait until your breathing returns mostly to normal. If you can hold a conversation, you're ready. This naturally scales — harder sets need more recovery, which means you'll breathe harder and wait longer.

## Rest between exercises

When you switch to a new exercise, take a little extra time — 2-3 minutes is fine. You're transitioning to a different movement pattern, and your body needs a moment to shift gears.

## What to do during rest periods

- **Breathe.** Seriously — controlled breathing helps recovery.
- **Sip water.** Stay hydrated.
- **Log your set.** Note the weight, reps, and RPE while it's fresh.
- **Lightly move around.** Walking in place is better than sitting completely still.

## Supersets: the shortcut

A **superset** is when you do two exercises back-to-back with no rest between them, then rest after both. This works well when the exercises target different muscle groups:

\`\`\`
Bench Press (set 1) → immediately → Dumbbell Row (set 1) → rest 90s → repeat
\`\`\`

Your chest rests while your back works, and vice versa. This cuts your workout time significantly without hurting performance.

## The takeaway

- Rest is not optional — it's part of training.
- 90 seconds to 2 minutes is a solid default for beginners.
- Heavier compound lifts deserve longer rest (2-3+ minutes).
- Don't stress about being exact. Breathing normally again = ready for the next set.
`,
}

// ---------------------------------------------------------------------------
// All articles, in display order within their collections
// ---------------------------------------------------------------------------

export const ALL_ARTICLES: ArticleSeed[] = [
  // Getting Started collection
  safetyBasics,
  howMachinesWork,
  rangeOfMotionAndForm,
  understandingIntensity,
  pickingAStartingWeight,
  // Warm-Up Guide collection
  warmUpGuide,
  // Training Fundamentals / Level Up
  howProgramsWork,
  readingYourWorkout,
  whenToIncreaseWeight,
  restPeriods,
]

// ---------------------------------------------------------------------------
// Collection definitions
// ---------------------------------------------------------------------------

export const ALL_COLLECTIONS: CollectionSeed[] = [
  {
    name: 'Getting Started',
    description:
      'Everything you need to know before your first gym session. Safety, machines, form, and finding the right weight.',
    displayOrder: 1,
    articleSlugs: [
      'safety-basics',
      'how-machines-work',
      'range-of-motion-and-form',
      'understanding-intensity',
      'picking-a-starting-weight',
    ],
  },
  {
    name: 'Warm-Up Guide',
    description:
      'A quick, effective warm-up routine to do before every lifting session.',
    displayOrder: 2,
    articleSlugs: ['how-to-warm-up'],
  },
  {
    name: 'Level Up',
    description:
      'Ready to progress? Learn about programs, progressive overload, and training smarter.',
    displayOrder: 3,
    articleSlugs: [
      'how-programs-work',
      'reading-your-workout',
      'when-to-increase-weight',
      'rest-periods',
    ],
  },
  {
    name: 'Refresher',
    description:
      'Returning to the gym after a break? A curated mix of safety and fundamentals to get you back on track.',
    displayOrder: 4,
    articleSlugs: [
      'safety-basics',
      'how-to-warm-up',
      'range-of-motion-and-form',
      'when-to-increase-weight',
    ],
  },
]
