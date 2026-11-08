// Public API for slice 5, logging help (features/ios-app/logging-help.feature). Shapes were fixed by
// work item 174; the bodies throw `notImplemented` until slice 5's build fills them in. The tests in
// Tests/RipitCoreTests/LoggingHelp*Tests.swift are the contract, and
// Tests/Fixtures/logging-help/history.json holds the web's answers (scripts/ios/logging-help-goldens.ts).
// Change the bodies, not the shapes: property names match the golden's JSON field names.
//
// The rules are the web's:
// - Rest timer (hooks/useRestTimer.ts): per exercise, counts up from when its latest set in this
//   workout was logged, so it resets on each new set and keeps true time across backgrounding and
//   relaunch. No sets in this workout: no timer. Shown as "m:ss" ("0:00", "2:05", "61:40").
// - Workout clock (hooks/useWorkoutTimer.ts): from the workout's start, never below 0. Shown as
//   "mm:ss" under an hour ("00:00", "05:30") and "h:mm:ss" after ("1:02:03").
//   Both clocks floor to whole seconds.
// - Last time (lib/queries/exercise-history.ts, lib/format/last-session-reference.ts,
//   lib/workout/prefill.ts): the most recent finished workout (archived or not) with a set of this
//   exercise definition, its sets by set number. The summary is the web's line, e.g.
//   "185 lbs × 5 × 3 @ RPE 8"; nil when that workout had only warm-ups. Tapping fills the form from
//   its last working set (`fill`); nil when there is no summary. Never logged: no LastTime at all.
// - Effort presets (lib/constants/intensity-presets.ts): RPE 6 to 10 in half steps, RIR 0 to "5+".
// - Exercise history (ExerciseHistoryPanel.tsx, lib/stats/exercise-history-derivation.ts): the 4 most
//   recent finished workouts with this exercise, newest first. e1RM is the best working set's Epley
//   in lbs (a single is its own weight, no rep cap, kg × 2.20462), from non-warm-up sets with a
//   weight above 0; ties go to the lower set number. The highest e1RM is the PR (ties to the newer
//   workout), flagged only when 2 or more of the shown workouts have an e1RM. Warm-ups are listed
//   apart. workoutName is the program workout's name, else the workout's name, else "Open Workout".

import Foundation
import GRDB

// MARK: - Effort

public enum EffortKind: String, Sendable, Codable {
    case rpe, rir
}

public struct IntensityPreset: Sendable, Equatable, Codable {
    public let value: Double
    public let label: String
    public let description: String

    public init(value: Double, label: String, description: String) {
        self.value = value
        self.label = label
        self.description = description
    }
}

public enum IntensityPresets {
    /// The web's preset list for RPE or RIR, in its order.
    public static func presets(_ kind: EffortKind) throws -> [IntensityPreset] {
        throw RipitCoreError.notImplemented
    }
}

// MARK: - Clocks

public enum LoggingClock {
    /// Whole seconds from `start` to `now`, floored, never below 0.
    public static func elapsedSeconds(from start: Date, to now: Date) throws -> Int {
        throw RipitCoreError.notImplemented
    }

    /// The rest timer's text: "m:ss", minutes not capped ("0:00", "2:05", "61:40").
    public static func restText(_ seconds: Int) throws -> String {
        throw RipitCoreError.notImplemented
    }

    /// The workout clock's text: "mm:ss" under an hour, else "h:mm:ss".
    public static func workoutText(_ seconds: Int) throws -> String {
        throw RipitCoreError.notImplemented
    }
}

/// A running rest timer for one exercise in one workout.
public struct RestTimer: Sendable, Equatable {
    public let exerciseId: String
    /// When the exercise's latest set in this workout was logged. The timer shows
    /// `LoggingClock.elapsedSeconds(from: startedAt, to: now)`.
    public let startedAt: Date
    /// Sets of this exercise logged in this workout.
    public let setCount: Int

    public init(exerciseId: String, startedAt: Date, setCount: Int) {
        self.exerciseId = exerciseId
        self.startedAt = startedAt
        self.setCount = setCount
    }
}

// MARK: - Last time and history

public struct HistorySet: Sendable, Equatable, Codable {
    public let setNumber: Int
    public let reps: Int
    public let weight: Double
    public let weightUnit: String
    public let rpe: Int?
    public let rir: Int?
    public let isWarmup: Bool

    public init(setNumber: Int, reps: Int, weight: Double, weightUnit: String, rpe: Int?, rir: Int?, isWarmup: Bool) {
        self.setNumber = setNumber
        self.reps = reps
        self.weight = weight
        self.weightUnit = weightUnit
        self.rpe = rpe
        self.rir = rir
        self.isWarmup = isWarmup
    }
}

/// The "Last time" line for an exercise.
public struct LastTime: Sendable, Equatable, Codable {
    public let completedAt: Date
    public let workoutName: String
    /// The web's line ("202.5 lbs × 5 × 3 @ RPE 8"), or nil when that workout had only warm-ups.
    public let summary: String?
    /// What tapping the line puts in the form, or nil when the line can't be tapped (no summary).
    public let fill: Prefill?

    public init(completedAt: Date, workoutName: String, summary: String?, fill: Prefill?) {
        self.completedAt = completedAt
        self.workoutName = workoutName
        self.summary = summary
        self.fill = fill
    }
}

/// One finished workout on an exercise's History tab.
public struct HistorySession: Sendable, Equatable, Codable {
    public let completedAt: Date
    public let workoutName: String
    public let workingSets: [HistorySet]
    public let warmupSets: [HistorySet]
    /// Best working set's e1RM in lbs, or nil when no set qualifies.
    public let e1rm: Double?
    public let isPR: Bool

    public init(completedAt: Date, workoutName: String, workingSets: [HistorySet], warmupSets: [HistorySet], e1rm: Double?, isPR: Bool) {
        self.completedAt = completedAt
        self.workoutName = workoutName
        self.workingSets = workingSets
        self.warmupSets = warmupSets
        self.e1rm = e1rm
        self.isPR = isPR
    }
}

// MARK: - Database

extension AppDatabase {
    /// Logs the next set for an exercise at `date` (the rest timer counts from it) with an optional
    /// effort and the warm-up flag, and returns the set id. Same rules as `logSet(exerciseId:reps:weight:unit:)`.
    public func logSet(exerciseId: String, reps: Int, weight: Double, unit: String = "lbs",
                       rpe: Int? = nil, rir: Int? = nil, isWarmup: Bool = false, at date: Date) throws -> String {
        throw RipitCoreError.notImplemented
    }

    /// Marks a logged set as a warm-up, or as a working set again.
    public func setWarmup(_ setId: String, _ isWarmup: Bool) throws {
        throw RipitCoreError.notImplemented
    }

    /// The rest timer for an exercise in a workout (the completion id), or nil when it has no sets there.
    public func restTimer(exerciseId: String, workoutId: String) throws -> RestTimer? {
        throw RipitCoreError.notImplemented
    }

    /// The "Last time" line for an exercise definition, or nil when it was never logged in a finished
    /// workout. `includeIntensity` is false when effort tracking is off: then `fill` has no RPE/RIR.
    public func lastTime(definitionId: String, includeIntensity: Bool) throws -> LastTime? {
        throw RipitCoreError.notImplemented
    }

    /// The History tab for an exercise definition: up to 4 finished workouts, newest first.
    public func exerciseHistory(definitionId: String) throws -> [HistorySession] {
        throw RipitCoreError.notImplemented
    }
}
