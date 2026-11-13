// Public API for slice 5, logging help (features/ios-app/logging-help.feature). Shapes were fixed by
// work item 174; work item 175 filled in the bodies. The tests in
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
        switch kind {
        case .rpe: rpe
        case .rir: rir
        }
    }

    private static let rpe: [IntensityPreset] = [
        IntensityPreset(value: 6, label: "6", description: "Light effort, easy reps"),
        IntensityPreset(value: 6.5, label: "6.5", description: "Light to moderate effort"),
        IntensityPreset(value: 7, label: "7", description: "Moderate effort, could do several more"),
        IntensityPreset(value: 7.5, label: "7.5", description: "Moderate to challenging"),
        IntensityPreset(value: 8, label: "8", description: "Challenging, 2-3 reps left"),
        IntensityPreset(value: 8.5, label: "8.5", description: "Very challenging, 1-2 reps left"),
        IntensityPreset(value: 9, label: "9", description: "Very hard, 1 rep left"),
        IntensityPreset(value: 9.5, label: "9.5", description: "Near maximal, failure on next rep"),
        IntensityPreset(value: 10, label: "10", description: "Max effort, failure reached. Use sparingly"),
    ]

    private static let rir: [IntensityPreset] = [
        IntensityPreset(value: 0, label: "0", description: "Max effort, failure reached. Use sparingly"),
        IntensityPreset(value: 1, label: "1", description: "1 rep left in the tank"),
        IntensityPreset(value: 2, label: "2", description: "2 reps left in the tank"),
        IntensityPreset(value: 3, label: "3", description: "3 reps left in the tank"),
        IntensityPreset(value: 4, label: "4", description: "4 reps left in the tank"),
        IntensityPreset(value: 5, label: "5+", description: "Warmup / Deload sets"),
    ]
}

// MARK: - Clocks

public enum LoggingClock {
    /// Whole seconds from `start` to `now`, floored, never below 0.
    public static func elapsedSeconds(from start: Date, to now: Date) throws -> Int {
        max(0, Int(now.timeIntervalSince(start).rounded(.down)))
    }

    /// The rest timer's text: "m:ss", minutes not capped ("0:00", "2:05", "61:40").
    public static func restText(_ seconds: Int) throws -> String {
        "\(seconds / 60):\(pad(seconds % 60))"
    }

    /// The workout clock's text: "mm:ss" under an hour, else "h:mm:ss".
    public static func workoutText(_ seconds: Int) throws -> String {
        let h = seconds / 3600, m = seconds % 3600 / 60, s = seconds % 60
        return h > 0 ? "\(h):\(pad(m)):\(pad(s))" : "\(pad(m)):\(pad(s))"
    }

    private static func pad(_ n: Int) -> String { n < 10 ? "0\(n)" : "\(n)" }
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
        guard LoggedWeight.isValid(weight) else { throw RipitCoreError.invalidWeight(weight) }
        let id = Self.newId()
        try dbQueue.write { db in
            guard let e = try Row.fetchOne(db, sql: "SELECT workoutCompletionId, workoutId FROM exercise WHERE id = ?", arguments: [exerciseId]) else {
                throw RipitCoreError.notFound("exercise \(exerciseId)")
            }
            guard let completionId = try e["workoutCompletionId"] as String? ?? String.fetchOne(db, sql: """
                SELECT id FROM workoutCompletion WHERE workoutId = ? AND status = 'draft' AND isArchived = 0
                ORDER BY startedAt DESC LIMIT 1
                """, arguments: [e["workoutId"] as String?]) else {
                throw RipitCoreError.notFound("unfinished session for exercise \(exerciseId)")
            }
            let setNumber = try Int.fetchOne(db, sql: """
                SELECT COALESCE(MAX(setNumber), 0) + 1 FROM loggedSet WHERE exerciseId = ? AND completionId = ?
                """, arguments: [exerciseId, completionId]) ?? 1
            try db.execute(sql: """
                INSERT INTO loggedSet (id, setNumber, reps, weight, weightUnit, rpe, rir, isWarmup, exerciseId, completionId, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [id, setNumber, reps, weight, unit, rpe, rir, isWarmup, exerciseId, completionId, date])
        }
        return id
    }

    /// Marks a logged set as a warm-up, or as a working set again.
    public func setWarmup(_ setId: String, _ isWarmup: Bool) throws {
        try dbQueue.write { db in
            try db.execute(sql: "UPDATE loggedSet SET isWarmup = ? WHERE id = ?", arguments: [isWarmup, setId])
            if db.changesCount == 0 { throw RipitCoreError.notFound("loggedSet \(setId)") }
        }
    }

    /// The rest timer for an exercise in a workout (the completion id), or nil when it has no sets there.
    public func restTimer(exerciseId: String, workoutId: String) throws -> RestTimer? {
        try dbQueue.read { db in
            let sets = try Date.fetchAll(db, sql: """
                SELECT createdAt FROM loggedSet WHERE exerciseId = ? AND completionId = ? ORDER BY createdAt DESC
                """, arguments: [exerciseId, workoutId])
            return sets.first.map { RestTimer(exerciseId: exerciseId, startedAt: $0, setCount: sets.count) }
        }
    }

    /// The "Last time" line for an exercise definition, or nil when it was never logged in a finished
    /// workout. `includeIntensity` is false when effort tracking is off: then `fill` has no RPE/RIR.
    public func lastTime(definitionId: String, includeIntensity: Bool) throws -> LastTime? {
        try dbQueue.read { db in
            guard let session = try Self.finishedSessions(db, definitionId: definitionId, limit: 1).first else { return nil }
            let working = session.sets.filter { !$0.isWarmup }
            guard let summary = Self.lastSessionSummary(working), let last = working.last else {
                return LastTime(completedAt: session.completedAt, workoutName: session.name, summary: nil, fill: nil)
            }
            let fill = Prefill(reps: String(last.reps), weight: Self.jsNumber(last.weight),
                               weightUnit: last.weightUnit == "lbs" || last.weightUnit == "kg" ? last.weightUnit : nil,
                               rpe: includeIntensity ? last.rpe.map(String.init) ?? "" : "",
                               rir: includeIntensity ? last.rir.map(String.init) ?? "" : "")
            return LastTime(completedAt: session.completedAt, workoutName: session.name, summary: summary, fill: fill)
        }
    }

    /// The History tab for an exercise definition: up to 4 finished workouts, newest first.
    public func exerciseHistory(definitionId: String) throws -> [HistorySession] {
        try dbQueue.read { db in
            let sessions = try Self.finishedSessions(db, definitionId: definitionId, limit: 4)
            // Best working set per workout; strict > keeps the lower set number on ties.
            let e1rms: [Double?] = sessions.map { session in
                var best: Double?
                for s in session.sets where !s.isWarmup && s.weight > 0 {
                    let value = epley(toLbs(s.weight, s.weightUnit), s.reps)
                    if value > (best ?? -.infinity) { best = value }
                }
                return best
            }
            // Strict > keeps the newer workout on ties; a PR needs at least 2 workouts to compare.
            var pr: Int?
            if e1rms.compactMap({ $0 }).count >= 2 {
                for (i, value) in e1rms.enumerated() {
                    if let value, value > (pr.flatMap { e1rms[$0] } ?? -.infinity) { pr = i }
                }
            }
            return sessions.enumerated().map { i, session in
                HistorySession(completedAt: session.completedAt, workoutName: session.name,
                               workingSets: session.sets.filter { !$0.isWarmup }, warmupSets: session.sets.filter(\.isWarmup),
                               e1rm: e1rms[i], isPR: pr == i)
            }
        }
    }

    // MARK: - Helpers

    private struct FinishedSession {
        let completedAt: Date
        let name: String
        let sets: [HistorySet]
    }

    /// The most recent finished workouts (archived or not) with a set of this exercise definition,
    /// newest first, each with those sets by set number.
    private static func finishedSessions(_ db: Database, definitionId: String, limit: Int) throws -> [FinishedSession] {
        let completions = try Row.fetchAll(db, sql: """
            SELECT c.id, c.completedAt, COALESCE(w.name, c.name, 'Open Workout') AS name
            FROM workoutCompletion c
            LEFT JOIN workout w ON w.id = c.workoutId
            WHERE c.status = 'completed' AND EXISTS (
                SELECT 1 FROM loggedSet s JOIN exercise x ON x.id = s.exerciseId
                WHERE s.completionId = c.id AND x.exerciseDefinitionId = ?)
            ORDER BY c.completedAt DESC LIMIT ?
            """, arguments: [definitionId, limit])
        guard !completions.isEmpty else { return [] }
        let ids = completions.map { $0["id"] as String }
        let sets = try Row.fetchAll(db, sql: """
            SELECT s.completionId, s.setNumber, s.reps, s.weight, s.weightUnit, s.rpe, s.rir, s.isWarmup
            FROM loggedSet s JOIN exercise x ON x.id = s.exerciseId
            WHERE x.exerciseDefinitionId = ? AND s.completionId IN (\(databaseQuestionMarks(count: ids.count)))
            ORDER BY s.setNumber
            """, arguments: [definitionId] + StatementArguments(ids))
        let byCompletion = Dictionary(grouping: sets) { $0["completionId"] as String }
        return completions.map { c in
            FinishedSession(completedAt: c["completedAt"], name: c["name"], sets: (byCompletion[c["id"]] ?? []).map {
                HistorySet(setNumber: $0["setNumber"], reps: $0["reps"], weight: $0["weight"], weightUnit: $0["weightUnit"],
                           rpe: $0["rpe"], rir: $0["rir"], isWarmup: $0["isWarmup"])
            })
        }
    }

    /// lib/format/last-session-reference.ts formatLastSessionSummary, given the working sets.
    private static func lastSessionSummary(_ working: [HistorySet]) -> String? {
        guard let first = working.first else { return nil }
        let weights = working.map(\.weight)
        let minW = weights.min()!, maxW = weights.max()!
        let weightText = minW == maxW
            ? (minW == 0 ? "BW" : "\(jsNumber(minW)) \(first.weightUnit)")
            : "\(jsNumber(minW))–\(jsNumber(maxW)) \(first.weightUnit)"
        let reps = working.map(\.reps)
        let sameReps = reps.allSatisfy { $0 == reps[0] }
        let repsText = sameReps ? "\(reps[0])" : reps.map(String.init).joined(separator: ",")
        let setsText = sameReps && minW == maxW ? " × \(working.count)" : ""
        // Prefer RIR, then RPE, only when every working set has the same value.
        func uniform(_ values: [Int?]) -> Int? {
            guard let v = values.first ?? nil, values.allSatisfy({ $0 == v }) else { return nil }
            return v
        }
        let effort = uniform(working.map(\.rir)).map { " @ RIR \($0)" }
            ?? uniform(working.map(\.rpe)).map { " @ RPE \($0)" } ?? ""
        return "\(weightText) × \(repsText)\(setsText)\(effort)"
    }
}
