-- CreateTable
CREATE TABLE "InAppMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "content" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "userType" TEXT NOT NULL DEFAULT 'all',
    "icon" TEXT NOT NULL DEFAULT 'Lightbulb',
    "lifecycle" TEXT NOT NULL DEFAULT 'show_always',
    "minWorkouts" INTEGER,
    "maxWorkouts" INTEGER,
    "programTargeting" TEXT,
    "ownerType" TEXT NOT NULL DEFAULT 'platform',
    "ownerId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InAppMessage_placement_active_idx" ON "InAppMessage"("placement", "active");

-- CreateIndex
CREATE INDEX "InAppMessage_placement_userType_active_idx" ON "InAppMessage"("placement", "userType", "active");

-- CreateIndex
CREATE INDEX "InAppMessage_ownerType_ownerId_idx" ON "InAppMessage"("ownerType", "ownerId");

-- AlterTable: Add message tracking fields to UserSettings
ALTER TABLE "UserSettings" ADD COLUMN "dismissedMessageIds" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "UserSettings" ADD COLUMN "seenMessageIds" TEXT NOT NULL DEFAULT '[]';

-- AlterTable: Track which community program a cloned program came from
ALTER TABLE "Program" ADD COLUMN "sourceCommunityProgramId" TEXT;

-- Seed: Migrate existing beginner logger tips
INSERT INTO "InAppMessage" ("id", "content", "placement", "userType", "icon", "lifecycle", "minWorkouts", "maxWorkouts", "priority", "active", "version", "locale", "ownerType", "createdAt", "updatedAt")
VALUES
  ('msg_warm_up_light', 'Warm up with a few repetitions of the exercise at a very light weight.', 'exercise_logger', 'beginner', 'Lightbulb', 'show_always', NULL, 3, 50, true, 1, 'en', 'platform', NOW(), NOW()),
  ('msg_sets_explained', '3 sets of 12 means: do 12 reps, rest, do 12 reps, rest, do 12 reps. Each round is one set.', 'exercise_logger', 'beginner', 'Lightbulb', 'show_always', NULL, 3, 40, true, 1, 'en', 'platform', NOW(), NOW()),
  ('msg_weight_selection', 'Not sure what weight to use? Start lighter than you think. If the last few reps feel challenging, you''re in the right range.', 'exercise_logger', 'beginner', 'Target', 'show_always', NULL, 3, 30, true, 1, 'en', 'platform', NOW(), NOW()),
  ('msg_rest_between_sets', 'Rest 60-90 seconds between sets. No rush. Take a breath, shake out your arms, and go when you feel ready.', 'exercise_logger', 'beginner', 'Clock', 'show_always', NULL, 3, 20, true, 1, 'en', 'platform', NOW(), NOW()),
  ('msg_skip_exercise', 'Not comfortable with an exercise? Go ahead and skip to the next. You don''t need to log everything.', 'exercise_logger', 'beginner', 'Zap', 'show_always', NULL, 3, 10, true, 1, 'en', 'platform', NOW(), NOW()),
  ('msg_program_ready', 'Your program is ready for you! Tap **Start Workout** to begin.', 'training_tab', 'beginner', 'Dumbbell', 'show_once', NULL, 0, 100, true, 1, 'en', 'platform', NOW(), NOW()),
  ('msg_first_workout_done', 'Nice work on your first workout! Check out the [Learn tab](/learn) for strength training tips or explore different programs in the [Programs tab](/programs).', 'training_tab', 'beginner', 'Heart', 'show_once', 1, 1, 90, true, 1, 'en', 'platform', NOW(), NOW()),
  ('msg_stick_nudge', 'You''ve got a few workouts under your belt. Want to make the habit easier to keep? Read [Making It Stick](/learn/making-the-gym-easy).', 'training_tab', 'all', 'BookOpen', 'show_until_dismissed', 3, 8, 50, true, 1, 'en', 'platform', NOW(), NOW());
