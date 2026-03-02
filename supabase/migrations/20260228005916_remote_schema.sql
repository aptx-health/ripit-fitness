-- Baseline schema for self-hosted PostgreSQL
-- Generated from Supabase production, cleaned of Supabase-specific elements
-- (RLS policies, role grants, extensions, OWNER TO statements)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."CardioProgram" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "userId" "text" NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL,
    "archivedAt" timestamp(3) without time zone,
    "isUserCreated" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "copyStatus" "text" DEFAULT 'ready'::"text",
    "goals" "text"[] DEFAULT '{}'::"text"[],
    "level" "text",
    "durationWeeks" integer,
    "durationDisplay" "text",
    "targetDaysPerWeek" integer,
    "equipmentNeeded" "text"[] DEFAULT '{}'::"text"[],
    "focusAreas" "text"[] DEFAULT '{}'::"text"[]
);

CREATE TABLE IF NOT EXISTS "public"."CardioWeek" (
    "id" "text" NOT NULL,
    "weekNumber" integer NOT NULL,
    "cardioProgramId" "text" NOT NULL,
    "userId" "text" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."CommunityProgram" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "programType" "text" DEFAULT 'strength'::"text" NOT NULL,
    "authorUserId" "text" NOT NULL,
    "displayName" "text" NOT NULL,
    "publishedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "originalProgramId" "text" NOT NULL,
    "programData" "jsonb" NOT NULL,
    "weekCount" integer NOT NULL,
    "workoutCount" integer NOT NULL,
    "exerciseCount" integer NOT NULL,
    "goals" "text"[] DEFAULT '{}'::"text"[],
    "level" "text",
    "durationWeeks" integer,
    "durationDisplay" "text",
    "targetDaysPerWeek" integer,
    "equipmentNeeded" "text"[] DEFAULT '{}'::"text"[],
    "focusAreas" "text"[] DEFAULT '{}'::"text"[]
);

CREATE TABLE IF NOT EXISTS "public"."Exercise" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "exerciseDefinitionId" "text" NOT NULL,
    "order" integer NOT NULL,
    "exerciseGroup" "text",
    "workoutId" "text",
    "notes" "text",
    "userId" "text" NOT NULL,
    "isOneOff" boolean DEFAULT false NOT NULL,
    "workoutCompletionId" "text"
);

CREATE TABLE IF NOT EXISTS "public"."ExerciseDefinition" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "normalizedName" "text" NOT NULL,
    "aliases" "text"[],
    "category" "text",
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdBy" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "equipment" "text"[] DEFAULT ARRAY[]::"text"[],
    "instructions" "text",
    "primaryFAUs" "text"[] DEFAULT ARRAY[]::"text"[],
    "secondaryFAUs" "text"[] DEFAULT ARRAY[]::"text"[],
    "userId" "text" NOT NULL,
    "notes" "text",
    CONSTRAINT "valid_primary_faus" CHECK (("primaryFAUs" <@ ARRAY['chest'::"text", 'mid-back'::"text", 'lower-back'::"text", 'front-delts'::"text", 'side-delts'::"text", 'rear-delts'::"text", 'lats'::"text", 'traps'::"text", 'biceps'::"text", 'triceps'::"text", 'forearms'::"text", 'neck'::"text", 'quads'::"text", 'adductors'::"text", 'abductors'::"text", 'hamstrings'::"text", 'glutes'::"text", 'calves'::"text", 'abs'::"text", 'obliques'::"text", 'rotator-cuffs'::"text", 'hip-flexors'::"text", 'serratus-anterior'::"text", 'tibialis-anterior'::"text", 'peroneals'::"text"])),
    CONSTRAINT "valid_secondary_faus" CHECK (("secondaryFAUs" <@ ARRAY['chest'::"text", 'mid-back'::"text", 'lower-back'::"text", 'front-delts'::"text", 'side-delts'::"text", 'rear-delts'::"text", 'lats'::"text", 'traps'::"text", 'biceps'::"text", 'triceps'::"text", 'forearms'::"text", 'neck'::"text", 'quads'::"text", 'adductors'::"text", 'abductors'::"text", 'hamstrings'::"text", 'glutes'::"text", 'calves'::"text", 'abs'::"text", 'obliques'::"text", 'rotator-cuffs'::"text", 'hip-flexors'::"text", 'serratus-anterior'::"text", 'tibialis-anterior'::"text", 'peroneals'::"text"]))
);

CREATE TABLE IF NOT EXISTS "public"."ExercisePerformanceLog" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "completedAt" timestamp(3) without time zone NOT NULL,
    "type" "text" NOT NULL,
    "exerciseDefinitionId" "text",
    "equipment" "text",
    "exerciseName" "text" NOT NULL,
    "totalSets" integer,
    "totalReps" integer,
    "totalVolumeLbs" double precision,
    "maxWeightLbs" double precision,
    "estimated1RMLbs" double precision,
    "avgRPE" double precision,
    "distance" double precision,
    "distanceUnit" "text",
    "duration" integer,
    "avgPaceSeconds" integer,
    "workoutCompletionId" "text",
    "cardioSessionId" "text"
);

CREATE TABLE IF NOT EXISTS "public"."LoggedCardioSession" (
    "id" "text" NOT NULL,
    "prescribedSessionId" "text",
    "userId" "text" NOT NULL,
    "completedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "name" "text" NOT NULL,
    "equipment" "text" NOT NULL,
    "duration" integer NOT NULL,
    "avgHR" integer,
    "peakHR" integer,
    "avgPower" integer,
    "peakPower" integer,
    "distance" double precision,
    "elevationGain" integer,
    "elevationLoss" integer,
    "avgPace" "text",
    "cadence" integer,
    "strokeRate" integer,
    "strokeCount" integer,
    "calories" integer,
    "intensityZone" "text",
    "intervalStructure" "text",
    "notes" "text"
);

CREATE TABLE IF NOT EXISTS "public"."LoggedSet" (
    "id" "text" NOT NULL,
    "setNumber" integer NOT NULL,
    "reps" integer NOT NULL,
    "weight" double precision NOT NULL,
    "weightUnit" "text" DEFAULT 'lbs'::"text" NOT NULL,
    "rpe" integer,
    "rir" integer,
    "exerciseId" "text" NOT NULL,
    "completionId" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" "text" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."PrescribedCardioSession" (
    "id" "text" NOT NULL,
    "weekId" "text" NOT NULL,
    "dayNumber" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "targetDuration" integer NOT NULL,
    "intensityZone" "text",
    "equipment" "text",
    "targetHRRange" "text",
    "targetPowerRange" "text",
    "intervalStructure" "text",
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" "text" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."PrescribedSet" (
    "id" "text" NOT NULL,
    "setNumber" integer NOT NULL,
    "reps" "text" NOT NULL,
    "weight" "text",
    "rpe" integer,
    "rir" integer,
    "exerciseId" "text" NOT NULL,
    "userId" "text" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."Program" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "userId" "text" NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isUserCreated" boolean DEFAULT false NOT NULL,
    "programType" "text" DEFAULT 'strength'::"text" NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL,
    "archivedAt" timestamp(3) without time zone,
    "copyStatus" "text" DEFAULT 'ready'::"text",
    "goals" "text"[] DEFAULT '{}'::"text"[],
    "level" "text",
    "durationWeeks" integer,
    "durationDisplay" "text",
    "targetDaysPerWeek" integer,
    "equipmentNeeded" "text"[] DEFAULT '{}'::"text"[],
    "focusAreas" "text"[] DEFAULT '{}'::"text"[]
);

CREATE TABLE IF NOT EXISTS "public"."UserCardioMetricPreferences" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "equipment" "text" NOT NULL,
    "customMetrics" "text"[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."UserSettings" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "displayName" "text",
    "defaultWeightUnit" "text" DEFAULT 'lbs'::"text" NOT NULL,
    "defaultIntensityRating" "text" DEFAULT 'rpe'::"text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."Week" (
    "id" "text" NOT NULL,
    "weekNumber" integer NOT NULL,
    "programId" "text" NOT NULL,
    "userId" "text" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."Workout" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "dayNumber" integer NOT NULL,
    "weekId" "text" NOT NULL,
    "userId" "text" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."WorkoutCompletion" (
    "id" "text" NOT NULL,
    "workoutId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "completedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "text" NOT NULL,
    "notes" "text",
    "cycleNumber" integer DEFAULT 1 NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL
);

-- BetterAuth tables

CREATE TABLE IF NOT EXISTS "public"."account" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "accountId" "text" NOT NULL,
    "providerId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "accessToken" "text",
    "refreshToken" "text",
    "idToken" "text",
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    "scope" "text",
    "password" "text",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."session" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "token" "text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" "text",
    "userAgent" "text",
    "userId" "text" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."user" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "emailVerified" boolean NOT NULL,
    "image" "text",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."verification" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "identifier" "text" NOT NULL,
    "value" "text" NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- PRIMARY KEYS
-- ============================================================================

ALTER TABLE ONLY "public"."CardioProgram"
    ADD CONSTRAINT "CardioProgram_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."CardioWeek"
    ADD CONSTRAINT "CardioWeek_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."ExerciseDefinition"
    ADD CONSTRAINT "ExerciseDefinition_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."ExercisePerformanceLog"
    ADD CONSTRAINT "ExercisePerformanceLog_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."Exercise"
    ADD CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."LoggedCardioSession"
    ADD CONSTRAINT "LoggedCardioSession_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."LoggedSet"
    ADD CONSTRAINT "LoggedSet_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."PrescribedCardioSession"
    ADD CONSTRAINT "PrescribedCardioSession_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."PrescribedSet"
    ADD CONSTRAINT "PrescribedSet_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."Program"
    ADD CONSTRAINT "Program_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."UserCardioMetricPreferences"
    ADD CONSTRAINT "UserCardioMetricPreferences_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."UserSettings"
    ADD CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."Week"
    ADD CONSTRAINT "Week_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."WorkoutCompletion"
    ADD CONSTRAINT "WorkoutCompletion_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."Workout"
    ADD CONSTRAINT "Workout_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."account"
    ADD CONSTRAINT "account_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."CommunityProgram"
    ADD CONSTRAINT "community_programs_original_program_id_key" UNIQUE ("originalProgramId");

ALTER TABLE ONLY "public"."CommunityProgram"
    ADD CONSTRAINT "community_programs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."session"
    ADD CONSTRAINT "session_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."session"
    ADD CONSTRAINT "session_token_key" UNIQUE ("token");

ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."verification"
    ADD CONSTRAINT "verification_pkey" PRIMARY KEY ("id");

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX "CardioProgram_active_listing_idx" ON "public"."CardioProgram" USING "btree" ("userId", "isActive" DESC, "createdAt" DESC) WHERE ("isArchived" = false);
CREATE INDEX "CardioProgram_userId_isActive_idx" ON "public"."CardioProgram" USING "btree" ("userId", "isActive");
CREATE INDEX "CardioProgram_userId_isArchived_idx" ON "public"."CardioProgram" USING "btree" ("userId", "isArchived");

CREATE INDEX "CardioWeek_cardioProgramId_idx" ON "public"."CardioWeek" USING "btree" ("cardioProgramId");
CREATE UNIQUE INDEX "CardioWeek_cardioProgramId_weekNumber_key" ON "public"."CardioWeek" USING "btree" ("cardioProgramId", "weekNumber");
CREATE INDEX "CardioWeek_userId_idx" ON "public"."CardioWeek" USING "btree" ("userId");

CREATE INDEX "CommunityProgram_authorUserId_idx" ON "public"."CommunityProgram" USING "btree" ("authorUserId");
CREATE INDEX "CommunityProgram_equipmentNeeded_idx" ON "public"."CommunityProgram" USING "gin" ("equipmentNeeded");
CREATE INDEX "CommunityProgram_goals_idx" ON "public"."CommunityProgram" USING "gin" ("goals");
CREATE INDEX "CommunityProgram_level_idx" ON "public"."CommunityProgram" USING "btree" ("level");
CREATE INDEX "CommunityProgram_originalProgramId_idx" ON "public"."CommunityProgram" USING "btree" ("originalProgramId");
CREATE INDEX "CommunityProgram_programType_idx" ON "public"."CommunityProgram" USING "btree" ("programType");
CREATE INDEX "CommunityProgram_programType_publishedAt_idx" ON "public"."CommunityProgram" USING "btree" ("programType", "publishedAt" DESC);
CREATE INDEX "CommunityProgram_publishedAt_idx" ON "public"."CommunityProgram" USING "btree" ("publishedAt" DESC);

CREATE INDEX "ExerciseDefinition_createdBy_idx" ON "public"."ExerciseDefinition" USING "btree" ("createdBy");
CREATE INDEX "ExerciseDefinition_isSystem_idx" ON "public"."ExerciseDefinition" USING "btree" ("isSystem");
CREATE INDEX "ExerciseDefinition_normalizedName_idx" ON "public"."ExerciseDefinition" USING "btree" ("normalizedName");
CREATE UNIQUE INDEX "ExerciseDefinition_normalizedName_key" ON "public"."ExerciseDefinition" USING "btree" ("normalizedName");
CREATE INDEX "ExerciseDefinition_primaryFAUs_idx" ON "public"."ExerciseDefinition" USING "btree" ("primaryFAUs");
CREATE INDEX "ExerciseDefinition_userId_idx" ON "public"."ExerciseDefinition" USING "btree" ("userId");

CREATE INDEX "ExercisePerformanceLog_userId_completedAt_idx" ON "public"."ExercisePerformanceLog" USING "btree" ("userId", "completedAt");
CREATE INDEX "ExercisePerformanceLog_userId_equipment_completedAt_idx" ON "public"."ExercisePerformanceLog" USING "btree" ("userId", "equipment", "completedAt");
CREATE INDEX "ExercisePerformanceLog_userId_exerciseDefinitionId_complete_idx" ON "public"."ExercisePerformanceLog" USING "btree" ("userId", "exerciseDefinitionId", "completedAt");
CREATE INDEX "ExercisePerformanceLog_userId_type_completedAt_idx" ON "public"."ExercisePerformanceLog" USING "btree" ("userId", "type", "completedAt");

CREATE INDEX "Exercise_exerciseDefinitionId_idx" ON "public"."Exercise" USING "btree" ("exerciseDefinitionId");
CREATE INDEX "Exercise_exerciseDefinitionId_userId_idx" ON "public"."Exercise" USING "btree" ("exerciseDefinitionId", "userId");
CREATE INDEX "Exercise_userId_idx" ON "public"."Exercise" USING "btree" ("userId");
CREATE INDEX "Exercise_workoutCompletionId_idx" ON "public"."Exercise" USING "btree" ("workoutCompletionId");
CREATE INDEX "Exercise_workoutId_idx" ON "public"."Exercise" USING "btree" ("workoutId");

CREATE INDEX "LoggedCardioSession_prescribedSessionId_idx" ON "public"."LoggedCardioSession" USING "btree" ("prescribedSessionId");
CREATE INDEX "LoggedCardioSession_prescribedSessionId_userId_completedAt_idx" ON "public"."LoggedCardioSession" USING "btree" ("prescribedSessionId", "userId", "completedAt");
CREATE INDEX "LoggedCardioSession_userId_completedAt_idx" ON "public"."LoggedCardioSession" USING "btree" ("userId", "completedAt");
CREATE INDEX "LoggedCardioSession_userId_status_completedAt_idx" ON "public"."LoggedCardioSession" USING "btree" ("userId", "status", "completedAt");

CREATE INDEX "LoggedSet_completionId_exerciseId_idx" ON "public"."LoggedSet" USING "btree" ("completionId", "exerciseId");
CREATE INDEX "LoggedSet_completionId_idx" ON "public"."LoggedSet" USING "btree" ("completionId");
CREATE INDEX "LoggedSet_exerciseId_idx" ON "public"."LoggedSet" USING "btree" ("exerciseId");
CREATE INDEX "LoggedSet_userId_idx" ON "public"."LoggedSet" USING "btree" ("userId");

CREATE INDEX "PrescribedCardioSession_userId_idx" ON "public"."PrescribedCardioSession" USING "btree" ("userId");
CREATE UNIQUE INDEX "PrescribedCardioSession_weekId_dayNumber_key" ON "public"."PrescribedCardioSession" USING "btree" ("weekId", "dayNumber");
CREATE INDEX "PrescribedCardioSession_weekId_idx" ON "public"."PrescribedCardioSession" USING "btree" ("weekId");

CREATE INDEX "PrescribedSet_exerciseId_idx" ON "public"."PrescribedSet" USING "btree" ("exerciseId");
CREATE INDEX "PrescribedSet_userId_idx" ON "public"."PrescribedSet" USING "btree" ("userId");

CREATE INDEX "Program_active_listing_idx" ON "public"."Program" USING "btree" ("userId", "createdAt" DESC) WHERE ("isArchived" = false);
CREATE INDEX "Program_userId_idx" ON "public"."Program" USING "btree" ("userId");
CREATE INDEX "Program_userId_isActive_idx" ON "public"."Program" USING "btree" ("userId", "isActive");
CREATE INDEX "Program_userId_isArchived_idx" ON "public"."Program" USING "btree" ("userId", "isArchived");
CREATE INDEX "Program_userId_isUserCreated_idx" ON "public"."Program" USING "btree" ("userId", "isUserCreated");

CREATE UNIQUE INDEX "UserCardioMetricPreferences_userId_equipment_key" ON "public"."UserCardioMetricPreferences" USING "btree" ("userId", "equipment");
CREATE INDEX "UserCardioMetricPreferences_userId_idx" ON "public"."UserCardioMetricPreferences" USING "btree" ("userId");

CREATE INDEX "UserSettings_userId_idx" ON "public"."UserSettings" USING "btree" ("userId");
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "public"."UserSettings" USING "btree" ("userId");

CREATE INDEX "Week_programId_idx" ON "public"."Week" USING "btree" ("programId");
CREATE UNIQUE INDEX "Week_programId_weekNumber_key" ON "public"."Week" USING "btree" ("programId", "weekNumber");
CREATE INDEX "Week_userId_idx" ON "public"."Week" USING "btree" ("userId");

CREATE INDEX "WorkoutCompletion_userId_completedAt_idx" ON "public"."WorkoutCompletion" USING "btree" ("userId", "completedAt");
CREATE INDEX "WorkoutCompletion_userId_isArchived_idx" ON "public"."WorkoutCompletion" USING "btree" ("userId", "isArchived");
CREATE INDEX "WorkoutCompletion_userId_status_completedAt_idx" ON "public"."WorkoutCompletion" USING "btree" ("userId", "status", "completedAt");
CREATE INDEX "WorkoutCompletion_workoutId_userId_idx" ON "public"."WorkoutCompletion" USING "btree" ("workoutId", "userId");
CREATE INDEX "WorkoutCompletion_workoutId_userId_isArchived_idx" ON "public"."WorkoutCompletion" USING "btree" ("workoutId", "userId", "isArchived");

CREATE INDEX "Workout_userId_idx" ON "public"."Workout" USING "btree" ("userId");
CREATE UNIQUE INDEX "Workout_weekId_dayNumber_key" ON "public"."Workout" USING "btree" ("weekId", "dayNumber");
CREATE INDEX "Workout_weekId_idx" ON "public"."Workout" USING "btree" ("weekId");

CREATE INDEX "account_userId_idx" ON "public"."account" USING "btree" ("userId");

CREATE INDEX "session_userId_idx" ON "public"."session" USING "btree" ("userId");

CREATE INDEX "verification_identifier_idx" ON "public"."verification" USING "btree" ("identifier");

CREATE UNIQUE INDEX "workout_completion_unique_active" ON "public"."WorkoutCompletion" USING "btree" ("workoutId", "userId") WHERE ("isArchived" = false);
COMMENT ON INDEX "public"."workout_completion_unique_active" IS 'Ensures only one non-archived completion exists per workout per user. Archived completions from program restarts are allowed to coexist.';

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

ALTER TABLE ONLY "public"."CardioWeek"
    ADD CONSTRAINT "CardioWeek_cardioProgramId_fkey" FOREIGN KEY ("cardioProgramId") REFERENCES "public"."CardioProgram"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."Exercise"
    ADD CONSTRAINT "Exercise_exerciseDefinitionId_fkey" FOREIGN KEY ("exerciseDefinitionId") REFERENCES "public"."ExerciseDefinition"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."Exercise"
    ADD CONSTRAINT "Exercise_workoutCompletionId_fkey" FOREIGN KEY ("workoutCompletionId") REFERENCES "public"."WorkoutCompletion"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."Exercise"
    ADD CONSTRAINT "Exercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "public"."Workout"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."LoggedCardioSession"
    ADD CONSTRAINT "LoggedCardioSession_prescribedSessionId_fkey" FOREIGN KEY ("prescribedSessionId") REFERENCES "public"."PrescribedCardioSession"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY "public"."LoggedSet"
    ADD CONSTRAINT "LoggedSet_completionId_fkey" FOREIGN KEY ("completionId") REFERENCES "public"."WorkoutCompletion"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."LoggedSet"
    ADD CONSTRAINT "LoggedSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercise"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."PrescribedCardioSession"
    ADD CONSTRAINT "PrescribedCardioSession_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "public"."CardioWeek"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."PrescribedSet"
    ADD CONSTRAINT "PrescribedSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercise"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."Week"
    ADD CONSTRAINT "Week_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."Program"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."WorkoutCompletion"
    ADD CONSTRAINT "WorkoutCompletion_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "public"."Workout"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."Workout"
    ADD CONSTRAINT "Workout_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "public"."Week"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."account"
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."session"
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE;
