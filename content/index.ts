/**
 * Content index for learning materials.
 *
 * Defines the structure and metadata for all learning content.
 * Content is authored as markdown files and rendered in multiple contexts:
 * - Learn tab (full articles)
 * - Beginner primer wizard (condensed, paged)
 * - Pre-workout warm-up page
 */

export interface ContentArticle {
  slug: string;
  title: string;
  summary: string;
  /** Relative path from content/ directory */
  file: string;
  /** Estimated reading time in minutes */
  readingTime: number;
}

export interface ContentSection {
  id: string;
  title: string;
  description: string;
  articles: ContentArticle[];
}

export const beginnerGuide: ContentSection = {
  id: 'beginner-guide',
  title: "Beginner's Guide",
  description:
    'Everything you need to know before your first workout. Start here.',
  articles: [
    {
      slug: 'safety-basics',
      title: 'Safety Basics',
      summary:
        'When to stop, how to breathe, and why lighter weight is smarter.',
      file: 'beginner-guide/01-safety-basics.md',
      readingTime: 2,
    },
    {
      slug: 'how-machines-work',
      title: 'How Gym Machines Work',
      summary: 'Adjusting seats, weight pins, cable attachments, and more.',
      file: 'beginner-guide/02-how-machines-work.md',
      readingTime: 3,
    },
    {
      slug: 'range-of-motion-and-form',
      title: 'Range of Motion and Form',
      summary: 'Full ROM, controlled movement, and a simple form checklist.',
      file: 'beginner-guide/03-range-of-motion-and-form.md',
      readingTime: 3,
    },
    {
      slug: 'understanding-intensity',
      title: 'Understanding Intensity',
      summary: 'RPE and RIR explained in plain English.',
      file: 'beginner-guide/04-understanding-intensity.md',
      readingTime: 2,
    },
    {
      slug: 'picking-a-starting-weight',
      title: 'Picking a Starting Weight',
      summary: 'How to find the right weight for your first session.',
      file: 'beginner-guide/05-picking-a-starting-weight.md',
      readingTime: 3,
    },
  ],
};

export const warmupGuide: ContentSection = {
  id: 'warmup',
  title: 'Warm-Up Guide',
  description:
    'A quick 5-minute routine to do before every workout. Reduces injury risk and improves performance.',
  articles: [
    {
      slug: 'warmup-guide',
      title: 'Pre-Workout Warm-Up',
      summary:
        'Heart rate, joint mobility, warm-up sets, and cool-down guidance.',
      file: 'warmup/warmup-guide.md',
      readingTime: 3,
    },
  ],
};

export const trainingFundamentals: ContentSection = {
  id: 'training-fundamentals',
  title: 'Training Fundamentals',
  description:
    'Core concepts that help you get the most out of your training.',
  articles: [
    {
      slug: 'how-programs-work',
      title: 'How Programs Work',
      summary: 'Weeks, progressive overload, and why programs beat winging it.',
      file: 'learn/how-programs-work.md',
      readingTime: 3,
    },
    {
      slug: 'reading-your-workout',
      title: 'Reading Your Workout',
      summary: 'Sets, reps, RPE, RIR, and weight notation explained.',
      file: 'learn/reading-your-workout.md',
      readingTime: 3,
    },
    {
      slug: 'when-to-increase-weight',
      title: 'When to Increase Weight',
      summary:
        'The simple rule for progressing and what to do when the new weight is hard.',
      file: 'learn/when-to-increase-weight.md',
      readingTime: 3,
    },
    {
      slug: 'rest-periods',
      title: 'Rest Periods',
      summary: 'How long to rest between sets and why it matters.',
      file: 'learn/rest-periods.md',
      readingTime: 3,
    },
  ],
};

/** All content sections in display order */
export const allSections: ContentSection[] = [
  beginnerGuide,
  warmupGuide,
  trainingFundamentals,
];
