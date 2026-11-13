// Public API for slice 4, Progress. Shapes were fixed by work item 166; work item 168 filled in the
// bodies (the maths is in ProgressMath.swift, ported from the web). The tests in
// Tests/RipitCoreTests/Progress*Tests.swift are the contract, and Tests/Fixtures/progress/*.json
// hold the web's answers (scripts/ios/progress-goldens.ts). Change the bodies, not the shapes:
// property names match the web's JSON field names, because the tests encode these types and
// compare them with the goldens.
//
// The rules are the web's (lib/insights/progress.ts, progress-records.ts, lift-history.ts,
// pinned-lifts.ts). In short:
// - Only completed, non-archived workouts and working (non-warm-up) sets count.
// - Weeks run Monday to Sunday in the given time zone, named by their Monday 'YYYY-MM-DD'.
// - e1RM is Epley in pounds (a single is its own weight), from sets of 12 reps or fewer;
//   bodyweight (weight 0) has none and is compared by reps. 1 kg = 2.20462 lbs. Weights come
//   out raw in the display unit.
// - The phone has no cardio: cardioMinutes is 0. Effort is RPE, else 10 - RIR.
// - Pins: the saved list, in order (at most 12). The phone has no training profile, so with
//   nothing saved there are no pins. An imported ripit-export file's pinnedExercises become the pins.

import Foundation
import GRDB

public enum WeightUnit: String, Sendable, Codable {
    case lbs, kg
}

// MARK: - Weekly report

public struct WeekEffort: Sendable, Equatable, Codable {
    public let avgRpe: Double
    public let pctAtOrAbove9: Int
    public let setsAt10: Int
    public let ratedSets: Int

    public init(avgRpe: Double, pctAtOrAbove9: Int, setsAt10: Int, ratedSets: Int) {
        self.avgRpe = avgRpe
        self.pctAtOrAbove9 = pctAtOrAbove9
        self.setsAt10 = setsAt10
        self.ratedSets = ratedSets
    }
}

public struct WeekStats: Sendable, Equatable, Codable {
    public let weekStart: String
    public let workouts: Int
    public let workingSets: Int
    public let durationSeconds: Int
    public let cardioMinutes: Int
    /// nil when fewer than half of the working sets are rated.
    public let effort: WeekEffort?

    public init(weekStart: String, workouts: Int, workingSets: Int, durationSeconds: Int, cardioMinutes: Int, effort: WeekEffort?) {
        self.weekStart = weekStart
        self.workouts = workouts
        self.workingSets = workingSets
        self.durationSeconds = durationSeconds
        self.cardioMinutes = cardioMinutes
        self.effort = effort
    }
}

public struct WeekNormal: Sendable, Equatable, Codable {
    public let workouts: Double
    public let workingSets: Double
    public let durationSeconds: Double
    public let cardioMinutes: Double
    public let avgRpe: Double?

    public init(workouts: Double, workingSets: Double, durationSeconds: Double, cardioMinutes: Double, avgRpe: Double?) {
        self.workouts = workouts
        self.workingSets = workingSets
        self.durationSeconds = durationSeconds
        self.cardioMinutes = cardioMinutes
        self.avgRpe = avgRpe
    }
}

public struct WeightReps: Sendable, Equatable, Codable {
    public let weight: Double
    public let reps: Int

    public init(weight: Double, reps: Int) {
        self.weight = weight
        self.reps = reps
    }
}

public struct WeekRecord: Sendable, Equatable, Codable {
    public let exerciseDefinitionId: String
    public let name: String
    /// "e1rm" or "rep".
    public let kind: String
    public let weight: Double
    public let reps: Int
    public let e1rm: Double?
    public let previous: Double

    public init(exerciseDefinitionId: String, name: String, kind: String, weight: Double, reps: Int, e1rm: Double?, previous: Double) {
        self.exerciseDefinitionId = exerciseDefinitionId
        self.name = name
        self.kind = kind
        self.weight = weight
        self.reps = reps
        self.e1rm = e1rm
        self.previous = previous
    }
}

public struct WeekLift: Sendable, Equatable, Codable {
    public let exerciseDefinitionId: String
    public let name: String
    public let workingSets: Int
    public let bestSet: WeightReps
    public let e1rm: Double?
    public let previousE1rm: Double?
    public let bestE1rm: Double?
    public let sessionsBelowBest: Int

    public init(exerciseDefinitionId: String, name: String, workingSets: Int, bestSet: WeightReps, e1rm: Double?,
                previousE1rm: Double?, bestE1rm: Double?, sessionsBelowBest: Int) {
        self.exerciseDefinitionId = exerciseDefinitionId
        self.name = name
        self.workingSets = workingSets
        self.bestSet = bestSet
        self.e1rm = e1rm
        self.previousE1rm = previousE1rm
        self.bestE1rm = bestE1rm
        self.sessionsBelowBest = sessionsBelowBest
    }
}

public struct TrendNote: Sendable, Equatable, Codable {
    public let effortRisingWeeks: Int
    public let effortFrom: Double?
    public let effortTo: Double?
    public let lastLightWeeksAgo: Int?
    public let lightWeeksSearched: Int

    public init(effortRisingWeeks: Int, effortFrom: Double?, effortTo: Double?, lastLightWeeksAgo: Int?, lightWeeksSearched: Int) {
        self.effortRisingWeeks = effortRisingWeeks
        self.effortFrom = effortFrom
        self.effortTo = effortTo
        self.lastLightWeeksAgo = lastLightWeeksAgo
        self.lightWeeksSearched = lightWeeksSearched
    }
}

public struct LastSet: Sendable, Equatable, Codable {
    public let weight: Double
    public let reps: Int
    public let e1rm: Double?
    public let completedAt: Date

    public init(weight: Double, reps: Int, e1rm: Double?, completedAt: Date) {
        self.weight = weight
        self.reps = reps
        self.e1rm = e1rm
        self.completedAt = completedAt
    }
}

public struct PinnedLift: Sendable, Equatable, Codable {
    public let exerciseDefinitionId: String
    public let name: String
    /// The lift's entry in the report's lifts; nil when it had no working set that week.
    public let lift: WeekLift?
    /// Only when `lift` is nil; nil when it was never done before the week end.
    public let last: LastSet?

    public init(exerciseDefinitionId: String, name: String, lift: WeekLift?, last: LastSet?) {
        self.exerciseDefinitionId = exerciseDefinitionId
        self.name = name
        self.lift = lift
        self.last = last
    }
}

public struct WeeklyReport: Sendable, Equatable, Codable {
    public let weekStart: String
    public let isCurrentWeek: Bool
    public let target: Int
    public let current: WeekStats
    public let normal: WeekNormal
    public let normalWeeks: Int
    public let streak: Int
    /// The 8 weeks ending with the shown one, oldest first.
    public let weeks: [WeekStats]
    public let weightUnit: WeightUnit
    public let records: [WeekRecord]
    public let lifts: [WeekLift]
    public let trend: TrendNote?
    public let pinned: [PinnedLift]

    public init(weekStart: String, isCurrentWeek: Bool, target: Int, current: WeekStats, normal: WeekNormal, normalWeeks: Int,
                streak: Int, weeks: [WeekStats], weightUnit: WeightUnit, records: [WeekRecord], lifts: [WeekLift],
                trend: TrendNote?, pinned: [PinnedLift]) {
        self.weekStart = weekStart
        self.isCurrentWeek = isCurrentWeek
        self.target = target
        self.current = current
        self.normal = normal
        self.normalWeeks = normalWeeks
        self.streak = streak
        self.weeks = weeks
        self.weightUnit = weightUnit
        self.records = records
        self.lifts = lifts
        self.trend = trend
        self.pinned = pinned
    }
}

// MARK: - Per-lift page

public enum ChartRange: String, Sendable, Codable, CaseIterable {
    case threeMonths = "3M", sixMonths = "6M", oneYear = "1Y", all = "All"
}

public struct LiftSession: Sendable, Equatable, Codable {
    public let completionId: String
    public let date: Date
    public let sets: [WeightReps]
    public let e1rm: Double?
    public let topSet: WeightReps
    public let avgRpe: Double?

    public init(completionId: String, date: Date, sets: [WeightReps], e1rm: Double?, topSet: WeightReps, avgRpe: Double?) {
        self.completionId = completionId
        self.date = date
        self.sets = sets
        self.e1rm = e1rm
        self.topSet = topSet
        self.avgRpe = avgRpe
    }
}

public struct RepRecord: Sendable, Equatable, Codable {
    public let reps: Int
    public let weight: Double
    public let date: Date
    public let isNew: Bool

    public init(reps: Int, weight: Double, date: Date, isNew: Bool) {
        self.reps = reps
        self.weight = weight
        self.date = date
        self.isNew = isNew
    }
}

public struct WeekSets: Sendable, Equatable, Codable {
    public let weekStart: String
    public let sets: Int

    public init(weekStart: String, sets: Int) {
        self.weekStart = weekStart
        self.sets = sets
    }
}

public struct LiftHistory: Sendable, Equatable, Codable {
    public let name: String
    public let weightUnit: WeightUnit
    public let isBodyweight: Bool
    /// Newest first.
    public let sessions: [LiftSession]
    public let records: [RepRecord]
    public let weeklySets: [WeekSets]

    public init(name: String, weightUnit: WeightUnit, isBodyweight: Bool, sessions: [LiftSession], records: [RepRecord], weeklySets: [WeekSets]) {
        self.name = name
        self.weightUnit = weightUnit
        self.isBodyweight = isBodyweight
        self.sessions = sessions
        self.records = records
        self.weeklySets = weeklySets
    }
}

public struct ChartPoint: Sendable, Equatable, Codable {
    public let date: Date
    public let e1rm: Double?
    public let topSet: WeightReps
    public let reps: Int
    public let isPr: Bool

    public init(date: Date, e1rm: Double?, topSet: WeightReps, reps: Int, isPr: Bool) {
        self.date = date
        self.e1rm = e1rm
        self.topSet = topSet
        self.reps = reps
        self.isPr = isPr
    }
}

public struct Change: Sendable, Equatable, Codable {
    public let first: Double
    public let last: Double
    public let percent: Double

    public init(first: Double, last: Double, percent: Double) {
        self.first = first
        self.last = last
        self.percent = percent
    }
}

public struct ChartChange: Sendable, Equatable, Codable {
    public let e1rm: Change?
    public let topSet: Change?
    public let reps: Change?

    public init(e1rm: Change?, topSet: Change?, reps: Change?) {
        self.e1rm = e1rm
        self.topSet = topSet
        self.reps = reps
    }
}

public struct BestE1rm: Sendable, Equatable, Codable {
    public let e1rm: Double
    public let date: Date

    public init(e1rm: Double, date: Date) {
        self.e1rm = e1rm
        self.date = date
    }
}

public struct HeaviestSet: Sendable, Equatable, Codable {
    public let weight: Double
    public let reps: Int
    public let date: Date

    public init(weight: Double, reps: Int, date: Date) {
        self.weight = weight
        self.reps = reps
        self.date = date
    }
}

public struct MostReps: Sendable, Equatable, Codable {
    public let reps: Int
    public let date: Date

    public init(reps: Int, date: Date) {
        self.reps = reps
        self.date = date
    }
}

public struct ChartSeries: Sendable, Equatable, Codable {
    public let points: [ChartPoint]
    public let change: ChartChange
    public let best: BestE1rm?
    public let heaviest: HeaviestSet?
    public let mostReps: MostReps?
    public let sessions: Int
    public let since: Date?

    public init(points: [ChartPoint], change: ChartChange, best: BestE1rm?, heaviest: HeaviestSet?, mostReps: MostReps?, sessions: Int, since: Date?) {
        self.points = points
        self.change = change
        self.best = best
        self.heaviest = heaviest
        self.mostReps = mostReps
        self.sessions = sessions
        self.since = since
    }
}

// MARK: - Calendar

public enum ProgressCalendar {
    /// The local Monday of the instant's week, as 'YYYY-MM-DD' (the web's weekStartFor).
    public static func weekStart(for instant: Date, timeZone: TimeZone) throws -> String {
        Civil.weekStart(for: instant, timeZone: timeZone)
    }
}

// MARK: - Database

/// Pins are kept to the web's limit.
let maxPins = 12

extension AppDatabase {
    /// The Progress report for the week starting `weekStart` (a Monday, 'YYYY-MM-DD').
    public func weeklyReport(weekStart: String, timeZone: TimeZone, now: Date, unit: WeightUnit, target: Int) throws -> WeeklyReport {
        try dbQueue.read { db in
            let history = try Self.progressSets(db)
            let pins = try Row.fetchAll(db, sql: """
                SELECT p.exerciseDefinitionId AS id, d.name FROM pinnedExercise p
                JOIN exerciseDefinition d ON d.id = p.exerciseDefinitionId ORDER BY p.position
                """).map { (id: $0["id"] as String, name: $0["name"] as String) }
            return buildWeeklyReport(weekStart: weekStart, workouts: try Self.progressWorkouts(db, history), history: history,
                                     pins: pins, timeZone: timeZone, now: now, unit: unit, target: target)
        }
    }

    /// One lift's page, or nil when the exercise definition doesn't exist.
    public func liftHistory(_ exerciseDefinitionId: String, timeZone: TimeZone, now: Date, unit: WeightUnit) throws -> LiftHistory? {
        try dbQueue.read { db -> LiftHistory? in
            guard let name = try String.fetchOne(db, sql: "SELECT name FROM exerciseDefinition WHERE id = ?",
                                                 arguments: [exerciseDefinitionId]) else { return nil }
            let history = try Self.progressSets(db, exerciseDefinitionId: exerciseDefinitionId).filter { !$0.isWarmup }
            let thisWeek = Civil.weekBounds(Civil.weekStart(for: now, timeZone: timeZone), timeZone).start
            return LiftHistory(name: name, weightUnit: unit,
                               isBodyweight: !history.isEmpty && history.allSatisfy { $0.weight == 0 },
                               sessions: computeLiftSessions(history, unit: unit),
                               records: computeRepRecords(history, unit: unit, weekStart: thisWeek),
                               weeklySets: weeklySets(history, now: now, timeZone: timeZone))
        }
    }

    /// The lift's chart for a range.
    public func liftChart(_ exerciseDefinitionId: String, range: ChartRange, timeZone: TimeZone, now: Date, unit: WeightUnit) throws -> ChartSeries {
        let history = try dbQueue.read { try Self.progressSets($0, exerciseDefinitionId: exerciseDefinitionId) }
        return chartSeries(computeLiftSessions(history, unit: unit), range: range, now: now, timeZone: timeZone)
    }

    /// The pinned exercise definition ids, in order.
    public func pinnedLifts() throws -> [String] {
        try dbQueue.read { try String.fetchAll($0, sql: "SELECT exerciseDefinitionId FROM pinnedExercise ORDER BY position") }
    }

    /// Replaces the pins with `ids`, in order.
    public func savePins(_ ids: [String]) throws {
        try dbQueue.write { db in
            try db.execute(sql: "DELETE FROM pinnedExercise")
            var seen = Set<String>()
            for id in ids where seen.insert(id).inserted && seen.count <= maxPins {
                try db.execute(sql: "INSERT INTO pinnedExercise (exerciseDefinitionId, position) VALUES (?, ?)",
                               arguments: [id, seen.count - 1])
            }
        }
    }

    /// Adds a pin at the end; pinning a pinned lift changes nothing.
    public func pinLift(_ exerciseDefinitionId: String) throws {
        try dbQueue.write { try Self.appendPin($0, exerciseDefinitionId) }
    }

    public func unpinLift(_ exerciseDefinitionId: String) throws {
        try dbQueue.write { db in
            try db.execute(sql: "DELETE FROM pinnedExercise WHERE exerciseDefinitionId = ?", arguments: [exerciseDefinitionId])
        }
    }

    /// Appends a pin unless it is already pinned or the list is full.
    static func appendPin(_ db: Database, _ id: String) throws {
        let pins = try String.fetchAll(db, sql: "SELECT exerciseDefinitionId FROM pinnedExercise")
        guard !pins.contains(id), pins.count < maxPins else { return }
        try db.execute(sql: """
            INSERT INTO pinnedExercise (exerciseDefinitionId, position)
            VALUES (?, (SELECT COALESCE(MAX(position), -1) + 1 FROM pinnedExercise))
            """, arguments: [id])
    }

    // MARK: Reads

    /// Logged sets of completed, un-archived workouts, oldest first, in exercise and set order.
    /// Names are the definition's, as on the web.
    static func progressSets(_ db: Database, exerciseDefinitionId: String? = nil) throws -> [ProgressSet] {
        try Row.fetchAll(db, sql: """
            SELECT ls.reps, ls.weight, ls.weightUnit, ls.isWarmup, ls.rpe, ls.rir, c.id AS completionId, c.completedAt,
                   e.exerciseDefinitionId, d.name
            FROM loggedSet ls
            JOIN workoutCompletion c ON c.id = ls.completionId
            JOIN exercise e ON e.id = ls.exerciseId
            JOIN exerciseDefinition d ON d.id = e.exerciseDefinitionId
            WHERE c.status = 'completed' AND c.isArchived = 0 AND (? IS NULL OR e.exerciseDefinitionId = ?)
            ORDER BY c.completedAt, c.id, e."order", ls.setNumber
            """, arguments: [exerciseDefinitionId, exerciseDefinitionId]).map {
            ProgressSet(completionId: $0["completionId"], completedAt: $0["completedAt"],
                        exerciseDefinitionId: $0["exerciseDefinitionId"], name: $0["name"], reps: $0["reps"],
                        weight: $0["weight"], weightUnit: $0["weightUnit"], isWarmup: $0["isWarmup"], rpe: $0["rpe"],
                        rir: $0["rir"])
        }
    }

    /// Completed, un-archived workouts with their sets (`history` from `progressSets`).
    static func progressWorkouts(_ db: Database, _ history: [ProgressSet]) throws -> [ProgressWorkout] {
        let setsByCompletion = Dictionary(grouping: history, by: \.completionId)
        return try Row.fetchAll(db, sql: """
            SELECT id, completedAt, startedAt, durationSeconds FROM workoutCompletion
            WHERE status = 'completed' AND isArchived = 0 ORDER BY completedAt, id
            """).map {
            ProgressWorkout(completedAt: $0["completedAt"], startedAt: $0["startedAt"], durationSeconds: $0["durationSeconds"],
                            sets: setsByCompletion[$0["id"] as String] ?? [])
        }
    }
}
