export interface Tip {
  id: string
  text: string
  tier: 'beginner' | 'ongoing'
}

// Array order matters: tips are shown sequentially on first visit,
// then randomly after all have been seen.
export const TIP_LIBRARY: Tip[] = [
  // --- Tier 1: Beginner FAQ (first 1-3 workouts) ---
  {
    id: 'warm-up-light',
    text: "Warm up with a few repetitions of the exercise at a very light weight.",
    tier: 'beginner',
  },
  {
    id: 'sets-explained',
    text: "3 sets of 12 means: do 12 reps, rest, do 12 reps, rest, do 12 reps. Each round is one set.",
    tier: 'beginner',
  },
  {
    id: 'weight-selection',
    text: "Not sure what weight to use? Start lighter than you think. If the last few reps feel challenging, you're in the right range.",
    tier: 'beginner',
  },
  {
    id: 'rest-between-sets',
    text: "Rest 60-90 seconds between sets. No rush. Take a breath, shake out your arms, and go when you feel ready.",
    tier: 'beginner',
  },
  {
    id: 'skip-exercise',
    text: "Not comfortable with an exercise? Go ahead and skip to the next. You don't need to log everything.",
    tier: 'beginner',
  },
]
