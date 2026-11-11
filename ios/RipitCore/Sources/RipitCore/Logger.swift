// Public API for slice 9b, the web's one-exercise logger (features/ios-app/one-exercise-logger.feature).
// Shapes were fixed by work item 203 and the bodies written by work item 204. The tests in
// Tests/RipitCoreTests/Logger*Tests.swift are the contract, and Tests/Fixtures/logger/logger.json holds the
// web's answers (scripts/ios/logger.goldens.ts).
//
// The rules are the web's (initiatives/ios-app/logger-nav-discovery.md §1-2):
// - Next and previous (hooks/useProgressiveExercises.ts:311-326) go in list order and stop at the ends.
//   Supersets are only a "Superset A" badge (ExerciseDisplayTabs.tsx:100); there is no A1 → A2 rotation.
// - Reorder (WorkoutPlanEditor.tsx, @dnd-kit arrayMove) keeps the current exercise by id.
// - After a delete (ExerciseLoggingModal.tsx:618-627): deleting the current exercise lands on the one
//   before it (the first stays first); deleting another keeps the current one. After an add, the first
//   new exercise opens (AdHocLoggerView, observed in item 196; the program logger opens the last one).
// - The bottom bar (ExerciseLoggingModal.tsx:647-660 and 809-851, AdHocLoggerView.tsx:912-928):
//   - hidden while a keypad is open;
//   - program, planned working sets not all logged: ‹ · Log set · › (‹ off on the first, › on the last);
//   - program, all logged: ‹ · + Extra set · Next exercise (or Finish on the last);
//   - program, extra sets: ‹ · Log set · labelled Next exercise (or Finish on the last);
//   - freestyle: ‹ · Log set · › always (every set is extra, never Finish); with no exercises, only Add
//     exercise;
//   - the header's Finish hides while the bar offers one (program only).
//   Log set needs reps and a weight in a program, reps only in freestyle. "All logged" compares logged
//   working sets with planned working sets; warm-ups count on neither side (Dustin, feature file). As on
//   the web, an exercise with no plan counts as all logged.
// - Swipe (hooks/useSwipeNavigation.ts): |dx| at least 50 pt, and |dy| / |dx| no more than 0.75; left is
//   next, right is previous; nothing while a keypad is open.
// - Log set's second line (LoggerBottomBar.tsx:34-40, pendingSetDetail): "8 reps × 135 lbs", "1 rep × 60 kg",
//   "5 reps" with no weight or 0, nothing without reps.
// - After a set is logged (plan-summary.ts planFormValues, AdHocLoggerView.tsx:115-120): the next planned
//   working set's reps (a range's high end, "15+" → 15, AMRAP → empty) and its effort (an RPE target clears
//   RIR and the other way round; neither leaves the effort alone); the weight and unit are kept. With no
//   planned set left, the form is kept as it was.
// - The keypad (NumberKeypad.tsx): digits only, at most 999. The first key after opening replaces the value
//   (⌫ first clears it); CLR empties; 0 then 0 stays 0; 0 then a digit replaces the 0; a key that would go
//   over 999 is ignored. Done keeps the value; Cancel puts back the value from when it opened
//   (SetLoggingForm.tsx:63-85). The reps keypad is exactly this, and ignores "."
// - The weight keypad (Dustin 2026-11-11, item 203 follow-up 1) departs from the web: the same pad plus a
//   "." key, capped at `LoggedWeight.max` (2000) instead of 999. One "." at most, and at most two digits
//   after it, since the phone shows weights to two places (Theme.swift `fractionLength(0...2)`; 1.25 kg
//   plates). "." first, or on an empty value, gives "0."; "0" then "." keeps the 0. A key that would pass
//   2000 or a third decimal place is ignored. Done drops a trailing ".". Cancel is unchanged.
// - The reps stepper (RepsStepper.tsx): + from empty is 1; − from 1 empties; − is off when empty or 0;
//   + has no upper bound.
// - The plan list's row (WorkoutPlanEditorRow.tsx:36-45, useWorkoutPlanSheet.ts:69-80): NOW on the current
//   row, else a tick when sets done reach a plan of at least one; "2 of 4 sets · 135 lbs", "1 of 1 set",
//   "3 sets" without a plan; the last logged weight only when above 0. Sets done and planned count working
//   sets only (the phone's choice, as for the bar).
//
// Store (Dustin 2026-11-10, item 196: reordering a program workout changes today's workout only):
// - moveExercise, swapExercise and deleteExercise change the unfinished workout only. For a program session
//   they never change the program's other workouts or any finished workout. Reorder never changes the
//   program's own order for that workout.
// - swapExercise keeps the place, and like the web (app/api/exercises/[exerciseId]/replace) the planned sets
//   and the sets already logged.
// - deleteExercise removes the exercise and its sets logged today.
// - Program swap and delete change today's workout only, like reorder (Dustin 2026-11-11, follow-up 1): the
//   program's plan for this day, its other weeks, the next session and finished workouts stay the same.
// - Supersets (follow-up 1): the freestyle "Superset" button moves into the plan list, which groups
//   (`groupAsSuperset`) and ungroups (`removeFromSuperset`); the logger shows only the badge. Like the web's
//   normalise rule, a superset left with one exercise, after an ungroup or a delete, is no superset.
// - exitWorkout deletes an unfinished workout with no logged sets (warm-ups count as logged) and returns
//   true; otherwise it changes nothing and returns false, and the person chooses Discard or keep.

import Foundation
import GRDB

// MARK: - Moving between exercises

public enum LoggerNav {
    /// The index › goes to, or nil on the last exercise.
    public static func next(from index: Int, count: Int) throws -> Int? {
        index + 1 < count ? index + 1 : nil
    }

    /// The index ‹ goes to, or nil on the first exercise.
    public static func previous(from index: Int, count: Int) throws -> Int? {
        index > 0 ? index - 1 : nil
    }

    /// The list after dragging the item at `from` to `to`.
    public static func move(_ ids: [String], from: Int, to: Int) throws -> [String] {
        var result = ids
        result.insert(result.remove(at: from), at: to)
        return result
    }

    /// Where the current exercise is after a delete, or nil when none are left.
    public static func indexAfterDelete(_ ids: [String], deleting: String, current: String) throws -> Int? {
        let rest = ids.filter { $0 != deleting }
        if rest.isEmpty { return nil }
        if deleting == current, let d = ids.firstIndex(of: deleting) { return max(d - 1, 0) }
        return rest.firstIndex(of: current)
    }

    /// Where the logger goes after adding `added` exercises to `countBefore`.
    public static func indexAfterAdd(countBefore: Int, added: Int, current: Int) throws -> Int {
        added == 0 ? current : countBefore
    }
}

// MARK: - The bottom bar

public struct LoggerBarInput: Sendable, Equatable {
    public var isProgram: Bool
    public var exerciseCount: Int
    public var index: Int
    public var plannedWorkingSets: Int
    public var loggedWorkingSets: Int
    /// "+ Extra set" was tapped on this exercise.
    public var extraSets: Bool
    public var keypadOpen: Bool
    /// The form holds what Log set needs (`LoggerRules.canLog`).
    public var canLog: Bool

    public init(isProgram: Bool, exerciseCount: Int, index: Int, plannedWorkingSets: Int, loggedWorkingSets: Int,
                extraSets: Bool = false, keypadOpen: Bool = false, canLog: Bool = true) {
        self.isProgram = isProgram
        self.exerciseCount = exerciseCount
        self.index = index
        self.plannedWorkingSets = plannedWorkingSets
        self.loggedWorkingSets = loggedWorkingSets
        self.extraSets = extraSets
        self.keypadOpen = keypadOpen
        self.canLog = canLog
    }
}

public enum LoggerBarMain: Sendable, Equatable {
    case logSet(enabled: Bool)
    /// Filled, the done state's way on.
    case nextExercise
    case finish
    case addExercise
}

public enum LoggerBarNext: Sendable, Equatable {
    case chevron(enabled: Bool)
    case nextExercise
    case finish
}

public struct LoggerBar: Sendable, Equatable {
    /// nil when not shown; otherwise whether ‹ is on.
    public let previous: Bool?
    /// "+ Extra set" is shown.
    public let extraSet: Bool
    public let main: LoggerBarMain
    public let next: LoggerBarNext?

    public init(previous: Bool?, extraSet: Bool = false, main: LoggerBarMain, next: LoggerBarNext?) {
        self.previous = previous
        self.extraSet = extraSet
        self.main = main
        self.next = next
    }
}

public enum SwipeResult: String, Sendable, Equatable {
    case next, previous, none
}

/// The values in the log form, as text, like the web's.
public struct SetForm: Sendable, Equatable {
    public var reps: String
    public var weight: String
    public var unit: String
    public var rpe: String
    public var rir: String

    public init(reps: String, weight: String, unit: String, rpe: String = "", rir: String = "") {
        self.reps = reps
        self.weight = weight
        self.unit = unit
        self.rpe = rpe
        self.rir = rir
    }
}

public enum PlanRowStatus: String, Sendable, Equatable {
    case done, now, upcoming
}

public struct PlanRow: Sendable, Equatable {
    public let status: PlanRowStatus
    /// "2 of 4 sets · 135 lbs".
    public let subLine: String

    public init(status: PlanRowStatus, subLine: String) {
        self.status = status
        self.subLine = subLine
    }
}

// LoggerRules is declared in Settings.swift (slice 7); these are slice 9b's.
extension LoggerRules {
    /// The bar, or nil while a keypad is open.
    public static func bar(_ input: LoggerBarInput) throws -> LoggerBar? {
        if input.keypadOpen { return nil }
        if !input.isProgram && input.exerciseCount == 0 { return LoggerBar(previous: nil, main: .addExercise, next: nil) }
        let isLast = input.index >= input.exerciseCount - 1
        let previous = input.index > 0
        guard input.isProgram else {
            return LoggerBar(previous: previous, main: .logSet(enabled: input.canLog), next: .chevron(enabled: !isLast))
        }
        if input.extraSets {
            return LoggerBar(previous: previous, main: .logSet(enabled: input.canLog), next: isLast ? .finish : .nextExercise)
        }
        if input.loggedWorkingSets >= input.plannedWorkingSets {
            return LoggerBar(previous: previous, extraSet: true, main: isLast ? .finish : .nextExercise, next: nil)
        }
        return LoggerBar(previous: previous, main: .logSet(enabled: input.canLog), next: .chevron(enabled: !isLast))
    }

    public static func headerShowsFinish(_ input: LoggerBarInput) throws -> Bool {
        // The bar offers Finish only on a program's last exercise, done or in extra sets, with no keypad open.
        guard input.isProgram, !input.keypadOpen, input.index >= input.exerciseCount - 1 else { return true }
        return !(input.extraSets || input.loggedWorkingSets >= input.plannedWorkingSets)
    }

    /// Log set is on: reps and a weight in a program, reps in freestyle.
    public static func canLog(reps: String, weight: String, isProgram: Bool) throws -> Bool {
        guard Int(reps) != nil else { return false }
        return !isProgram || !weight.isEmpty
    }

    /// Log set's second line, or nil.
    public static func pendingSetDetail(reps: String, weight: String, unit: String) throws -> String? {
        guard let count = Int(reps) else { return nil }
        let repsText = count == 1 ? "1 rep" : "\(count) reps"
        guard let w = Double(weight), w > 0 else { return repsText }
        return "\(repsText) × \(weight) \(unit)"
    }

    /// A swipe from touch down to touch up, in points.
    public static func swipe(dx: Double, dy: Double, keypadOpen: Bool) throws -> SwipeResult {
        guard !keypadOpen else { return .none }
        let ax = abs(dx)
        guard ax >= 50, abs(dy) / ax <= 0.75 else { return .none }
        return dx < 0 ? .next : .previous
    }

    /// The form after a working set is logged. `loggedWorkingSets` counts it.
    public static func formAfterLog(_ form: SetForm, planned: [ProgramSetDetail], loggedWorkingSets: Int) throws -> SetForm {
        let working = planned.filter { !$0.isWarmup }.sorted { $0.setNumber < $1.setNumber }
        guard loggedWorkingSets < working.count else { return form }
        let next = working[loggedWorkingSets]
        var result = form
        result.reps = AppDatabase.parseRepsFromPrescribed(next.reps)
        if let rpe = next.rpe {
            result.rpe = String(rpe)
            result.rir = ""
        } else if let rir = next.rir {
            result.rir = String(rir)
            result.rpe = ""
        }
        return result
    }

    /// "Superset A", or nil for an exercise in no superset.
    public static func supersetBadge(_ group: String?) throws -> String? {
        group.map { "Superset \($0)" }
    }

    /// A row of the plan list. `plannedWorkingSets` is nil when the exercise has no plan.
    public static func planRow(doneWorkingSets: Int, plannedWorkingSets: Int?, lastWeight: Double?, unit: String,
                               isCurrent: Bool) throws -> PlanRow {
        func sets(_ n: Int) -> String { n == 1 ? "1 set" : "\(n) sets" }
        var subLine = plannedWorkingSets.map { "\(doneWorkingSets) of \(sets($0))" } ?? sets(doneWorkingSets)
        if let lastWeight, lastWeight > 0 { subLine += " · \(AppDatabase.jsNumber(lastWeight)) \(unit)" }
        let done = (plannedWorkingSets ?? 0) > 0 && doneWorkingSets >= plannedWorkingSets!
        return PlanRow(status: isCurrent ? .now : done ? .done : .upcoming, subLine: subLine)
    }
}

// MARK: - Keypads

public enum KeypadKey: Sendable, Equatable {
    case digit(Int)
    case clear
    case delete
    /// The weight keypad's "."; the reps keypad ignores it.
    case point
}

/// The web's number keypad, for weight and reps, from the moment it opens.
public struct NumberKeypad: Sendable, Equatable {
    /// The reps keypad's limit (the web's, for both).
    public static let max = 999
    /// The weight keypad's limit.
    public static let weightMax = LoggedWeight.max
    /// Digits the weight keypad takes after ".".
    public static let decimalPlaces = 2

    /// What the readout shows.
    public private(set) var value: String
    /// The value when it opened; Cancel puts it back.
    public let opened: String
    /// The weight keypad: "." and up to `weightMax`; otherwise the reps keypad.
    public let decimal: Bool
    var replaceOnNext = true

    public init(opening value: String, decimal: Bool = false) {
        self.value = value
        self.opened = value
        self.decimal = decimal
    }

    public mutating func press(_ key: KeypadKey) throws {
        switch key {
        case .point:
            guard decimal else { return }
            if replaceOnNext || value.isEmpty {
                value = "0."
            } else if !value.contains(".") {
                value += "."
            }
            replaceOnNext = false
        case .clear:
            value = ""
            replaceOnNext = false
        case .delete:
            if replaceOnNext { value = "" } else if !value.isEmpty { value.removeLast() }
            replaceOnNext = false
        case .digit(let d):
            if replaceOnNext {
                value = String(d)
                replaceOnNext = false
                return
            }
            if value == "0" {
                if d != 0 { value = String(d) }
                return
            }
            let candidate = value + String(d)
            if fits(candidate) { value = candidate }
        }
    }

    /// The value Done keeps.
    public func done() throws -> String {
        value.hasSuffix(".") ? String(value.dropLast()) : value
    }

    /// The value Cancel leaves.
    public func cancel() throws -> String {
        opened
    }

    /// The candidate stays within the cap and, on the weight keypad, two decimal places.
    private func fits(_ candidate: String) -> Bool {
        guard decimal else { return (Int(candidate) ?? 0) <= Self.max }
        if let point = candidate.firstIndex(of: "."), candidate[candidate.index(after: point)...].count > Self.decimalPlaces {
            return false
        }
        return (Double(candidate) ?? 0) <= Self.weightMax
    }
}

public enum RepsStepper {
    public static func increment(_ value: String) throws -> String {
        value.isEmpty ? "1" : String((Int(value) ?? 0) + 1)
    }

    public static func decrement(_ value: String) throws -> String {
        guard let n = Int(value) else { return value }
        return n <= 1 ? "" : String(n - 1)
    }

    /// − is on.
    public static func canDecrement(_ value: String) throws -> Bool {
        (Int(value) ?? 0) > 0
    }
}

// MARK: - Store

// Today's order and the program exercises hidden today live in `sessionExercise` (Schema v6), so a program
// session can be reordered, swapped and trimmed without touching the program. A session with no rows there
// follows the plan's order.

extension AppDatabase {
    /// Moves an exercise of an unfinished workout (the completion id) to `index`, 0-based, today only.
    public func moveExercise(_ exerciseId: String, to index: Int, inWorkout workoutId: String) throws {
        try dbQueue.write { db in
            try Self.requireDraft(db, workoutId)
            var ids = try Self.sessionExerciseIds(db, workoutId)
            guard let from = ids.firstIndex(of: exerciseId) else { throw RipitCoreError.notFound("exercise \(exerciseId)") }
            let moving = ids.remove(at: from)
            ids.insert(moving, at: min(max(index, 0), ids.count))
            try Self.writeSessionOrder(db, workoutId, ids)
        }
    }

    /// Replaces an exercise of an unfinished workout with another definition, in the same place, and
    /// returns the id of the exercise now in that place.
    public func swapExercise(_ exerciseId: String, to definitionId: String, inWorkout workoutId: String) throws -> String {
        try dbQueue.write { db in
            try Self.requireDraft(db, workoutId)
            guard let name = try String.fetchOne(db, sql: "SELECT name FROM exerciseDefinition WHERE id = ?", arguments: [definitionId]) else {
                throw RipitCoreError.notFound("exerciseDefinition \(definitionId)")
            }
            var ids = try Self.sessionExerciseIds(db, workoutId)
            guard let place = ids.firstIndex(of: exerciseId) else { throw RipitCoreError.notFound("exercise \(exerciseId)") }
            let isProgramRow = try Bool.fetchOne(db, sql: "SELECT workoutId IS NOT NULL FROM exercise WHERE id = ?",
                                                 arguments: [exerciseId]) ?? false
            guard isProgramRow else {
                // The workout's own exercise: change it in place, its sets and plan stay (the web's replace route).
                try db.execute(sql: "UPDATE exercise SET exerciseDefinitionId = ?, name = ? WHERE id = ?",
                               arguments: [definitionId, name, exerciseId])
                return exerciseId
            }
            // A program exercise: today gets its own copy with the plan and today's sets; the program row is hidden.
            let newId = Self.newId()
            try db.execute(sql: """
                INSERT INTO exercise (id, name, exerciseDefinitionId, "order", exerciseGroup, isOneOff, workoutCompletionId)
                SELECT ?, ?, ?, "order", exerciseGroup, 1, ? FROM exercise WHERE id = ?
                """, arguments: [newId, name, definitionId, workoutId, exerciseId])
            for planned in try Row.fetchAll(db, sql: "SELECT setNumber, reps, weight, rpe, rir, isWarmup FROM prescribedSet WHERE exerciseId = ?",
                                            arguments: [exerciseId]) {
                try db.execute(sql: """
                    INSERT INTO prescribedSet (id, setNumber, reps, weight, rpe, rir, isWarmup, exerciseId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, arguments: [Self.newId(), planned["setNumber"], planned["reps"], planned["weight"], planned["rpe"],
                                     planned["rir"], planned["isWarmup"], newId])
            }
            try db.execute(sql: "UPDATE loggedSet SET exerciseId = ? WHERE exerciseId = ? AND completionId = ?",
                           arguments: [newId, exerciseId, workoutId])
            try Self.hideForToday(db, workoutId, exerciseId)
            ids[place] = newId
            try Self.writeSessionOrder(db, workoutId, ids)
            return newId
        }
    }

    /// Removes an exercise and its sets from an unfinished workout, today only.
    public func deleteExercise(_ exerciseId: String, fromWorkout workoutId: String) throws {
        try dbQueue.write { db in
            try Self.requireDraft(db, workoutId)
            guard let e = try Row.fetchOne(db, sql: "SELECT workoutId, workoutCompletionId, exerciseGroup FROM exercise WHERE id = ?",
                                           arguments: [exerciseId]) else {
                throw RipitCoreError.notFound("exercise \(exerciseId)")
            }
            guard (e["workoutId"] as String?) != nil else {
                guard (e["workoutCompletionId"] as String?) == workoutId else { throw RipitCoreError.notFound("exercise \(exerciseId)") }
                // Logged sets go with it (ON DELETE CASCADE).
                try db.execute(sql: "DELETE FROM exercise WHERE id = ?", arguments: [exerciseId])
                if let group: String = e["exerciseGroup"] { try Self.endLoneSuperset(db, workoutId, group) }
                return
            }
            // A program exercise: today's sets go and it is hidden today; the program keeps it.
            try db.execute(sql: "DELETE FROM loggedSet WHERE exerciseId = ? AND completionId = ?", arguments: [exerciseId, workoutId])
            try Self.hideForToday(db, workoutId, exerciseId)
        }
    }

    /// Takes an exercise of an unfinished workout out of its superset; a superset left with one exercise
    /// is no longer a superset. An exercise in no superset is left as it is.
    public func removeFromSuperset(_ exerciseId: String) throws {
        try dbQueue.write { db in
            guard let row = try Row.fetchOne(db, sql: """
                SELECT e.workoutCompletionId, e.exerciseGroup FROM exercise e
                JOIN workoutCompletion c ON c.id = e.workoutCompletionId
                WHERE e.id = ? AND c.status = 'draft'
                """, arguments: [exerciseId]) else {
                throw RipitCoreError.notFound("exercise \(exerciseId) in an unfinished workout")
            }
            guard let group: String = row["exerciseGroup"] else { return }
            try db.execute(sql: "UPDATE exercise SET exerciseGroup = NULL WHERE id = ?", arguments: [exerciseId])
            try Self.endLoneSuperset(db, row["workoutCompletionId"], group)
        }
    }

    /// Exit: deletes the unfinished workout when nothing is logged and returns true; otherwise false.
    public func exitWorkout(_ workoutId: String) throws -> Bool {
        try dbQueue.write { db in
            try Self.requireDraft(db, workoutId)
            // Warm-ups count as logged.
            let logged = try Bool.fetchOne(db, sql: "SELECT EXISTS (SELECT 1 FROM loggedSet WHERE completionId = ?)",
                                           arguments: [workoutId]) ?? false
            if logged { return false }
            // Exercises and today's order go with it (ON DELETE CASCADE).
            try db.execute(sql: "DELETE FROM workoutCompletion WHERE id = ?", arguments: [workoutId])
            return true
        }
    }

    // MARK: Helpers

    /// The exercises of a workout (the completion id) shown today, in today's order.
    static func sessionExerciseIds(_ db: Database, _ completionId: String) throws -> [String] {
        try String.fetchAll(db, sql: """
            SELECT e.id FROM exercise e
            LEFT JOIN sessionExercise s ON s.exerciseId = e.id AND s.completionId = ?1
            WHERE (e.workoutCompletionId = ?1 OR e.workoutId = (SELECT workoutId FROM workoutCompletion WHERE id = ?1))
              AND COALESCE(s.hidden, 0) = 0
            ORDER BY COALESCE(s.position, e."order")
            """, arguments: [completionId])
    }

    /// Fixes today's order; positions run 1, 2, … so an exercise added later (order = max + 1) goes last.
    static func writeSessionOrder(_ db: Database, _ completionId: String, _ ids: [String]) throws {
        for (i, id) in ids.enumerated() {
            try db.execute(sql: """
                INSERT INTO sessionExercise (completionId, exerciseId, position, hidden) VALUES (?, ?, ?, 0)
                ON CONFLICT (completionId, exerciseId) DO UPDATE SET position = excluded.position, hidden = 0
                """, arguments: [completionId, id, i + 1])
        }
    }

    static func hideForToday(_ db: Database, _ completionId: String, _ exerciseId: String) throws {
        try db.execute(sql: """
            INSERT INTO sessionExercise (completionId, exerciseId, position, hidden) VALUES (?, ?, 0, 1)
            ON CONFLICT (completionId, exerciseId) DO UPDATE SET hidden = 1
            """, arguments: [completionId, exerciseId])
    }

    /// Like the web's normalise rule: a superset left with one exercise is no longer a superset.
    static func endLoneSuperset(_ db: Database, _ completionId: String, _ group: String) throws {
        try db.execute(sql: """
            UPDATE exercise SET exerciseGroup = NULL
            WHERE workoutCompletionId = ?1 AND exerciseGroup = ?2
              AND (SELECT COUNT(*) FROM exercise WHERE workoutCompletionId = ?1 AND exerciseGroup = ?2) = 1
            """, arguments: [completionId, group])
    }

    private static func requireDraft(_ db: Database, _ completionId: String) throws {
        guard try Bool.fetchOne(db, sql: "SELECT 1 FROM workoutCompletion WHERE id = ? AND status = 'draft'",
                                arguments: [completionId]) != nil else {
            throw RipitCoreError.notFound("unfinished workout \(completionId)")
        }
    }
}
