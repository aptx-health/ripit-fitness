import type { Prisma } from '@prisma/client'

/** The fields a Library → Workouts row needs, as the saved-workout routes return them. */
export const SAVED_LIST_FIELDS = {
  id: true,
  name: true,
  notes: true,
  exerciseCount: true,
  lastUsedAt: true,
  pinnedAt: true,
  createdAt: true,
  origin: true,
  archivedAt: true,
  dismissedAt: true,
  tags: true,
} satisfies Prisma.SavedWorkoutSelect
