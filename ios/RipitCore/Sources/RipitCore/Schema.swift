// The local SQLite schema (work item 154). It mirrors the web app's Prisma models closely enough
// that slice 2 can import a ripit.fit export row for row:
// Program > Week > Workout > Exercise > PrescribedSet (the plan) and LoggedSet (what happened),
// plus WorkoutCompletion (also ad-hoc workouts), SavedWorkout and ExerciseDefinition.
//
// Differences from Prisma, on purpose:
// - No userId columns: one person per phone.
// - String[] and Json columns are JSON text.
// - workoutCompletion.completedAt is NULL while status is 'draft' (the web sets it on create).
//
// Migrations are append-only: never edit a shipped one, add a new identifier instead.

import Foundation
import GRDB

enum Schema {
    static let migrations: [(String, @Sendable (Database) throws -> Void)] = [
        ("v1-exercise-catalog", v1ExerciseCatalog),
        ("v2-training-model", v2TrainingModel),
        ("v3-program-cycle", v3ProgramCycle),
        ("v4-import-hash", v4ImportHash),
    ]

    static func v1ExerciseCatalog(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE exerciseDefinition (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                normalizedName TEXT NOT NULL UNIQUE,
                aliases TEXT NOT NULL DEFAULT '[]',
                category TEXT,
                isSystem BOOLEAN NOT NULL DEFAULT 0,
                createdBy TEXT,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                equipment TEXT NOT NULL DEFAULT '[]',
                instructions TEXT,
                notes TEXT,
                imageUrls TEXT NOT NULL DEFAULT '[]',
                primaryFAUs TEXT NOT NULL DEFAULT '[]',
                secondaryFAUs TEXT NOT NULL DEFAULT '[]',
                force TEXT,
                mechanic TEXT,
                level TEXT,
                movementPattern TEXT,
                intensityClass TEXT,
                isBodyweight BOOLEAN NOT NULL DEFAULT 0,
                taggedAt DATETIME,
                taggedBy TEXT
            );
            CREATE INDEX exerciseDefinition_isSystem ON exerciseDefinition(isSystem);
            """)
    }

    static func v2TrainingModel(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE program (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                isActive BOOLEAN NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                isUserCreated BOOLEAN NOT NULL DEFAULT 0,
                programType TEXT NOT NULL DEFAULT 'strength',
                isArchived BOOLEAN NOT NULL DEFAULT 0,
                archivedAt DATETIME,
                deletedAt DATETIME,
                goals TEXT NOT NULL DEFAULT '[]',
                level TEXT,
                durationWeeks INTEGER,
                durationDisplay TEXT,
                targetDaysPerWeek INTEGER,
                equipmentNeeded TEXT NOT NULL DEFAULT '[]',
                focusAreas TEXT NOT NULL DEFAULT '[]',
                sourceCommunityProgramId TEXT
            );
            CREATE INDEX program_isActive ON program(isActive);

            CREATE TABLE week (
                id TEXT PRIMARY KEY NOT NULL,
                weekNumber INTEGER NOT NULL,
                name TEXT,
                description TEXT,
                programId TEXT NOT NULL REFERENCES program(id) ON DELETE CASCADE,
                UNIQUE (programId, weekNumber)
            );

            CREATE TABLE workout (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                dayNumber INTEGER NOT NULL,
                weekId TEXT NOT NULL REFERENCES week(id) ON DELETE CASCADE,
                UNIQUE (weekId, dayNumber)
            );

            CREATE TABLE savedWorkout (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                notes TEXT,
                sourceCompletionId TEXT UNIQUE,
                workoutData TEXT NOT NULL,
                exerciseCount INTEGER NOT NULL,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                lastUsedAt DATETIME,
                pinnedAt DATETIME,
                origin TEXT NOT NULL DEFAULT 'session',
                archivedAt DATETIME,
                dismissedAt DATETIME
            );

            CREATE TABLE workoutCompletion (
                id TEXT PRIMARY KEY NOT NULL,
                workoutId TEXT REFERENCES workout(id) ON DELETE CASCADE,
                savedWorkoutId TEXT,
                completedAt DATETIME,
                startedAt DATETIME,
                status TEXT NOT NULL,
                notes TEXT,
                isArchived BOOLEAN NOT NULL DEFAULT 0,
                cycleNumber INTEGER NOT NULL DEFAULT 1,
                isAdHoc BOOLEAN NOT NULL DEFAULT 0,
                name TEXT,
                durationSeconds INTEGER,
                sessionRpe INTEGER
            );
            CREATE INDEX workoutCompletion_status_completedAt ON workoutCompletion(status, completedAt);
            CREATE INDEX workoutCompletion_workoutId ON workoutCompletion(workoutId);

            CREATE TABLE exercise (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                exerciseDefinitionId TEXT NOT NULL REFERENCES exerciseDefinition(id),
                "order" INTEGER NOT NULL,
                exerciseGroup TEXT,
                workoutId TEXT REFERENCES workout(id) ON DELETE CASCADE,
                notes TEXT,
                isOneOff BOOLEAN NOT NULL DEFAULT 0,
                workoutCompletionId TEXT REFERENCES workoutCompletion(id) ON DELETE CASCADE
            );
            CREATE INDEX exercise_workoutId ON exercise(workoutId);
            CREATE INDEX exercise_exerciseDefinitionId ON exercise(exerciseDefinitionId);
            CREATE INDEX exercise_workoutCompletionId ON exercise(workoutCompletionId);

            CREATE TABLE prescribedSet (
                id TEXT PRIMARY KEY NOT NULL,
                setNumber INTEGER NOT NULL,
                reps TEXT NOT NULL,
                weight TEXT,
                rpe INTEGER,
                rir INTEGER,
                isWarmup BOOLEAN NOT NULL DEFAULT 0,
                exerciseId TEXT NOT NULL REFERENCES exercise(id) ON DELETE CASCADE
            );
            CREATE INDEX prescribedSet_exerciseId ON prescribedSet(exerciseId);

            CREATE TABLE loggedSet (
                id TEXT PRIMARY KEY NOT NULL,
                setNumber INTEGER NOT NULL,
                reps INTEGER NOT NULL,
                weight REAL NOT NULL,
                weightUnit TEXT NOT NULL DEFAULT 'lbs',
                rpe INTEGER,
                rir INTEGER,
                isWarmup BOOLEAN NOT NULL DEFAULT 0,
                exerciseId TEXT NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
                completionId TEXT NOT NULL REFERENCES workoutCompletion(id) ON DELETE CASCADE,
                createdAt DATETIME NOT NULL,
                UNIQUE (completionId, exerciseId, setNumber)
            );
            CREATE INDEX loggedSet_exerciseId ON loggedSet(exerciseId);
            CREATE INDEX loggedSet_completionId ON loggedSet(completionId);
            """)
    }

    /// The program's current cycle (slice 3). The web has no such column: restart there archives
    /// completions but never raises the cycle; the phone does (features/ios-app/programs.feature).
    static func v3ProgramCycle(_ db: Database) throws {
        try db.execute(sql: "ALTER TABLE program ADD COLUMN cycleNumber INTEGER NOT NULL DEFAULT 1")
    }

    /// Where a row came from (work item 164). NULL: created on the phone, never touched by an import.
    /// Otherwise a hash of the file's values at the last import, so a later export updates only rows
    /// the web changed since. Exercise definitions from a file hold 'insert-only'.
    static func v4ImportHash(_ db: Database) throws {
        for table in ["exerciseDefinition", "program", "week", "workout", "exercise", "prescribedSet",
                      "workoutCompletion", "loggedSet", "savedWorkout"] {
            try db.execute(sql: "ALTER TABLE \(table) ADD COLUMN importHash TEXT")
        }
    }
}
