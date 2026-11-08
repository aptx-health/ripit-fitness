// Public API for slice 6, finish summary and saved workouts (features/ios-app/saved-workouts.feature).
// Shapes were fixed by work item 179; every body is a stub that throws `RipitCoreError.notImplemented`.
// The tests in Tests/RipitCoreTests/SavedWorkouts*Tests.swift are the contract, and
// Tests/Fixtures/saved-workouts/saved.json holds the web's answers (scripts/ios/saved-workouts.goldens.ts).
// Change the bodies, not the shapes: property names match the golden's JSON field names.
//
// The rules are the web's:
// - Summary (lib/stats/workout-rollup.ts): only a finished, non-archived workout has one. Working
//   sets are the non-warm-up sets. None: the minimal summary (all counts 0, no exercises). Otherwise
//   one row per exercise definition with working sets, in the order its first working set was
//   logged; volume = Σ weight × reps with the raw number, kg or lbs alike (the web labels it lbs);
//   top set = the first set at the highest weight; bodyweight = highest weight ≤ 0, which has
//   volume 0. "vs last": the most recent finished, non-archived workout before this one with a set
//   of that definition (program or ad-hoc), its working sets' volume and top set (warm-ups only:
//   volume 0, no top set). Duration: durationSeconds, else completed − started rounded, else nil.
//   lifetimeWorkoutCount counts every finished, non-archived workout; workoutsLast7Days those
//   finished at or after `now` − 7 days.
// - Summary text (WorkoutRollupModal.tsx): hero tile "Volume (lbs)" when volume > 0, else
//   "Total Reps"; then Reps (only beside volume), Working Sets, Exercises, Duration (when known).
//   Volume "1,001" (rounded half up, grouped), "10.2k" from 10,000; duration "1h 2m", "5m 03s",
//   "45s"; top weight "156.3" (one decimal, half up) or "195". Trend: "+5% vs last", "-2% vs last",
//   "same as last" (percent rounded half up, as JS Math.round), only when last time's volume > 0;
//   bodyweight: "+13 reps vs last" (today's total reps against last time's top set reps), none when
//   equal. Minimal: no tiles or rows, "Marked complete. Nice work." Save is offered only for an
//   ad-hoc workout that isn't minimal.
// - Suggested name: "Workout — November 7", the local date when the summary opens.
// - Saving (POST /api/workouts/saved): a finished ad-hoc workout only. Name trimmed, required, at
//   most 100 UTF-16 units (as JS counts); notes trimmed, blank is none, at most 2000. Saving the
//   same workout again returns the first saved workout unchanged. workoutData is the web's JSON:
//   every exercise by order (also ones with no sets), its logged sets by set number as
//   {setNumber, reps (text), rir, rpe, isWarmup}, set numbers kept as logged, weight dropped.
//   lastUsedAt = the workout's finish time; origin "session".
// - Groups (lib/saved-workouts/groups.ts): archived, else pinned, else New (an agent or coach
//   workout never started or dismissed), else Recent (last used, or saved if never used, at or
//   after `now` − 30 days), else Older. Pinned newest pin first; archived newest archive first;
//   the others by that activity, newest first.
// - Pin keeps an existing pin time. Archive unpins; dismiss is archive plus dismissedAt. Restore
//   never pins again and sets dismissedAt if unset, so the workout never returns to New.
// - Start (saved/[id]/start): a new ad-hoc workout named after the saved one, with its exercises
//   (name, definition, order, notes, group) and planned sets, linked to it; the saved workout's
//   lastUsedAt = the start time, and an archived one is restored as above.
// - Repeat (completions/[id]/repeat): a finished, non-archived workout with logged sets. A new
//   ad-hoc workout named after it ("Open Workout" when nameless), not linked to any saved workout:
//   the exercises in the order first logged, numbered 1…n, each with one planned set per logged set
//   (warm-ups too), renumbered 1…n, reps as text, no weight.
// - Start and repeat are refused while a workout is open (`workoutOpen`), as the web's DRAFT_EXISTS.
// - Training (lib/training/home.ts): the 5 newest pins (not archived); the 3 most recent finished,
//   non-archived workouts, named after the program workout, else their own name, else "Open
//   Workout", with canRepeat when they have logged sets (warm-ups count) and a duration only when
//   above 0 (durationSeconds, else completed − started).

import Foundation
import GRDB

// MARK: - Summary

public struct RollupTopSet: Sendable, Equatable, Codable {
    public let weight: Double
    public let reps: Int

    public init(weight: Double, reps: Int) {
        self.weight = weight
        self.reps = reps
    }
}

public struct RollupVsLast: Sendable, Equatable, Codable {
    public let previousCompletedAt: Date
    public let previousVolumeLbs: Double
    public let previousTopSet: RollupTopSet?

    public init(previousCompletedAt: Date, previousVolumeLbs: Double, previousTopSet: RollupTopSet?) {
        self.previousCompletedAt = previousCompletedAt
        self.previousVolumeLbs = previousVolumeLbs
        self.previousTopSet = previousTopSet
    }
}

public struct RollupExercise: Sendable, Equatable, Codable {
    public let exerciseDefinitionId: String
    public let name: String
    public let workingSets: Int
    public let reps: Int
    public let volumeLbs: Double
    public let isBodyweight: Bool
    public let topSet: RollupTopSet?
    public let vsLastTime: RollupVsLast?

    public init(exerciseDefinitionId: String, name: String, workingSets: Int, reps: Int, volumeLbs: Double,
                isBodyweight: Bool, topSet: RollupTopSet?, vsLastTime: RollupVsLast?) {
        self.exerciseDefinitionId = exerciseDefinitionId
        self.name = name
        self.workingSets = workingSets
        self.reps = reps
        self.volumeLbs = volumeLbs
        self.isBodyweight = isBodyweight
        self.topSet = topSet
        self.vsLastTime = vsLastTime
    }
}

public struct WorkoutRollup: Sendable, Equatable, Codable {
    public let completionId: String
    public let isMinimal: Bool
    public let durationSeconds: Int?
    public let exerciseCount: Int
    public let workingSetCount: Int
    public let totalReps: Int
    public let totalVolumeLbs: Double
    public let hasBodyweightOnlyExercises: Bool
    public let lifetimeWorkoutCount: Int
    public let workoutsLast7Days: Int
    public let exercises: [RollupExercise]
    /// The program workout's name, else the workout's own; nil when it has none.
    public let workoutName: String?
    public let isAdHoc: Bool

    public init(completionId: String, isMinimal: Bool, durationSeconds: Int?, exerciseCount: Int, workingSetCount: Int,
                totalReps: Int, totalVolumeLbs: Double, hasBodyweightOnlyExercises: Bool, lifetimeWorkoutCount: Int,
                workoutsLast7Days: Int, exercises: [RollupExercise], workoutName: String?, isAdHoc: Bool) {
        self.completionId = completionId
        self.isMinimal = isMinimal
        self.durationSeconds = durationSeconds
        self.exerciseCount = exerciseCount
        self.workingSetCount = workingSetCount
        self.totalReps = totalReps
        self.totalVolumeLbs = totalVolumeLbs
        self.hasBodyweightOnlyExercises = hasBodyweightOnlyExercises
        self.lifetimeWorkoutCount = lifetimeWorkoutCount
        self.workoutsLast7Days = workoutsLast7Days
        self.exercises = exercises
        self.workoutName = workoutName
        self.isAdHoc = isAdHoc
    }

    /// The summary as the web words it.
    public func text() throws -> RollupText {
        throw RipitCoreError.notImplemented
    }
}

public struct RollupTile: Sendable, Equatable, Codable {
    public let label: String
    public let value: String

    public init(label: String, value: String) {
        self.label = label
        self.value = value
    }
}

public struct RollupExerciseText: Sendable, Equatable, Codable {
    public let name: String
    /// "top 195 × 5"; nil for bodyweight.
    public let top: String?
    /// "3 sets · 15 reps · 2,900 lbs", or "2 sets · 22 reps" for bodyweight.
    public let line: String
    /// "+5% vs last", "-2% vs last", "same as last", "+13 reps vs last"; nil when there's nothing to compare.
    public let trend: String?

    public init(name: String, top: String?, line: String, trend: String?) {
        self.name = name
        self.top = top
        self.line = line
        self.trend = trend
    }
}

public struct RollupText: Sendable, Equatable, Codable {
    /// "#8": the lifetime count.
    public let workoutNumber: String
    public let last7Days: String
    /// Hero first.
    public let tiles: [RollupTile]
    public let exercises: [RollupExerciseText]
    /// "Marked complete. Nice work." on the minimal summary, else nil.
    public let note: String?
    public let canSave: Bool

    public init(workoutNumber: String, last7Days: String, tiles: [RollupTile], exercises: [RollupExerciseText],
                note: String?, canSave: Bool) {
        self.workoutNumber = workoutNumber
        self.last7Days = last7Days
        self.tiles = tiles
        self.exercises = exercises
        self.note = note
        self.canSave = canSave
    }
}

public enum SavedWorkoutNaming {
    /// "Workout — November 7": the date in `timeZone` at `date`.
    public static func suggestedName(at date: Date, timeZone: TimeZone) throws -> String {
        throw RipitCoreError.notImplemented
    }
}

// MARK: - Saved workouts

/// One planned set in a saved workout's `workoutData`, as the web stores it.
public struct SavedSet: Sendable, Equatable, Codable {
    public let setNumber: Int
    /// Text, like a prescribed set ("8", "3-5").
    public let reps: String
    public let rir: Int?
    public let rpe: Int?
    public let isWarmup: Bool

    public init(setNumber: Int, reps: String, rir: Int?, rpe: Int?, isWarmup: Bool) {
        self.setNumber = setNumber
        self.reps = reps
        self.rir = rir
        self.rpe = rpe
        self.isWarmup = isWarmup
    }
}

/// One exercise in a saved workout's `workoutData`, as the web stores it.
public struct SavedExercise: Sendable, Equatable, Codable {
    public let name: String
    public let exerciseDefinitionId: String
    public let order: Int
    public let notes: String?
    public let exerciseGroup: String?
    public let sets: [SavedSet]

    public init(name: String, exerciseDefinitionId: String, order: Int, notes: String?, exerciseGroup: String?, sets: [SavedSet]) {
        self.name = name
        self.exerciseDefinitionId = exerciseDefinitionId
        self.order = order
        self.notes = notes
        self.exerciseGroup = exerciseGroup
        self.sets = sets
    }
}

public struct SavedWorkoutSummary: Sendable, Equatable, Codable, Identifiable {
    public let id: String
    public let name: String
    public let notes: String?
    public let exerciseCount: Int
    public let createdAt: Date
    public let lastUsedAt: Date?
    public let pinnedAt: Date?
    /// "session" (saved from a workout), "agent" or "coach".
    public let origin: String
    public let archivedAt: Date?
    public let dismissedAt: Date?

    public init(id: String, name: String, notes: String?, exerciseCount: Int, createdAt: Date, lastUsedAt: Date?,
                pinnedAt: Date?, origin: String, archivedAt: Date?, dismissedAt: Date?) {
        self.id = id
        self.name = name
        self.notes = notes
        self.exerciseCount = exerciseCount
        self.createdAt = createdAt
        self.lastUsedAt = lastUsedAt
        self.pinnedAt = pinnedAt
        self.origin = origin
        self.archivedAt = archivedAt
        self.dismissedAt = dismissedAt
    }
}

/// Library › Workouts, each group in display order.
public struct SavedWorkoutGroups: Sendable, Equatable, Codable {
    public let new: [SavedWorkoutSummary]
    public let pinned: [SavedWorkoutSummary]
    public let recent: [SavedWorkoutSummary]
    public let older: [SavedWorkoutSummary]
    public let archived: [SavedWorkoutSummary]

    public init(new: [SavedWorkoutSummary], pinned: [SavedWorkoutSummary], recent: [SavedWorkoutSummary],
                older: [SavedWorkoutSummary], archived: [SavedWorkoutSummary]) {
        self.new = new
        self.pinned = pinned
        self.recent = recent
        self.older = older
        self.archived = archived
    }
}

public enum SavedWorkoutError: Error, Equatable {
    /// The name is blank after trimming.
    case nameRequired
    /// Over 100 UTF-16 units after trimming.
    case nameTooLong
    /// Over 2000 UTF-16 units after trimming.
    case notesTooLong
    /// Only a finished workout can be saved.
    case notFinished
    /// A program workout can't be saved, as on the web.
    case notAdHoc
    /// A workout is already open (its id): resume or discard it first.
    case workoutOpen(String)
    /// The workout has no logged sets.
    case nothingToRepeat
}

// MARK: - Training

public struct PinnedWorkout: Sendable, Equatable, Codable, Identifiable {
    public let id: String
    public let name: String
    public let exerciseCount: Int
    public let pinnedAt: Date

    public init(id: String, name: String, exerciseCount: Int, pinnedAt: Date) {
        self.id = id
        self.name = name
        self.exerciseCount = exerciseCount
        self.pinnedAt = pinnedAt
    }
}

public struct RecentWorkout: Sendable, Equatable, Codable, Identifiable {
    /// The workoutCompletion id; pass it to `repeatWorkout`.
    public let id: String
    public let name: String
    public let completedAt: Date
    public let durationSeconds: Int?
    public let canRepeat: Bool

    public init(id: String, name: String, completedAt: Date, durationSeconds: Int?, canRepeat: Bool) {
        self.id = id
        self.name = name
        self.completedAt = completedAt
        self.durationSeconds = durationSeconds
        self.canRepeat = canRepeat
    }
}

// MARK: - Database

extension AppDatabase {
    /// The summary of a finished, non-archived workout; nil for any other id.
    public func workoutRollup(_ completionId: String, now: Date) throws -> WorkoutRollup? {
        throw RipitCoreError.notImplemented
    }

    /// Saves a finished ad-hoc workout to repeat and returns the saved workout's id.
    public func saveWorkout(fromCompletion completionId: String, name: String, notes: String?, at date: Date) throws -> String {
        throw RipitCoreError.notImplemented
    }

    /// nil once deleted.
    public func savedWorkout(_ id: String) throws -> SavedWorkoutSummary? {
        throw RipitCoreError.notImplemented
    }

    /// The saved workout's exercises and planned sets (its workoutData).
    public func savedWorkoutPlan(_ id: String) throws -> [SavedExercise] {
        throw RipitCoreError.notImplemented
    }

    public func savedWorkoutGroups(now: Date) throws -> SavedWorkoutGroups {
        throw RipitCoreError.notImplemented
    }

    public func pinSavedWorkout(_ id: String, at date: Date) throws {
        throw RipitCoreError.notImplemented
    }

    public func unpinSavedWorkout(_ id: String) throws {
        throw RipitCoreError.notImplemented
    }

    /// Trimmed; refused like saving (`nameRequired`, `nameTooLong`).
    public func renameSavedWorkout(_ id: String, to name: String) throws {
        throw RipitCoreError.notImplemented
    }

    public func archiveSavedWorkout(_ id: String, at date: Date) throws {
        throw RipitCoreError.notImplemented
    }

    /// Dismiss, from New: archive and mark dismissed.
    public func dismissSavedWorkout(_ id: String, at date: Date) throws {
        throw RipitCoreError.notImplemented
    }

    public func restoreSavedWorkout(_ id: String, at date: Date) throws {
        throw RipitCoreError.notImplemented
    }

    /// Past workouts started from it are kept.
    public func deleteSavedWorkout(_ id: String) throws {
        throw RipitCoreError.notImplemented
    }

    /// Starts an ad-hoc workout from a saved workout and returns the new workout's id.
    public func startSavedWorkout(_ id: String, at date: Date) throws -> String {
        throw RipitCoreError.notImplemented
    }

    /// Starts an ad-hoc workout with a finished workout's exercises and returns the new workout's id.
    public func repeatWorkout(_ completionId: String, at date: Date) throws -> String {
        throw RipitCoreError.notImplemented
    }

    public func trainingPinned() throws -> [PinnedWorkout] {
        throw RipitCoreError.notImplemented
    }

    public func trainingRecent() throws -> [RecentWorkout] {
        throw RipitCoreError.notImplemented
    }
}
