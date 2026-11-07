// Public API surface for slice 3, programs (work item 157). Every body is a stub that throws
// `RipitCoreError.notImplemented`; the slice 3 implementer replaces them. The tests in
// Tests/RipitCoreTests/Program*Tests.swift are the contract: change the bodies, not the shapes.
//
// Rules follow the web app unless features/ios-app/programs.feature says otherwise:
// - Done means a non-archived completion with status 'completed' (or 'skipped').
// - Current week: the first week with an unfinished workout, else the last week (lib/db/current-week.ts).
// - Up Next: the first unfinished workout, by week then day (lib/training/home.ts).
// - Prefill: last set this session, else the last working set of the most recent completed
//   workout with that exercise, else the plan (lib/workout/prefill.ts).
// - Restart archives the current completions (isArchived = 1, lib/db/program-restart.ts) and
//   also raises the cycle number, which the web does not. Archived completions never count as done.
// - Archiving the active program also deactivates it.
// - Like the web, a session logs against the program's own rows: workoutCompletion.workoutId is
//   the program workout and loggedSet.exerciseId the program exercise. So renaming a program
//   exercise renames it in that workout's history; changing prescribed sets never touches logged sets.
//
// A program workout is logged with slice 1's `logSet`, `finishWorkout` and `discardWorkout`,
// using the session's exercise ids, and shows in slice 1's `history()` and `workout(_:)`.

import Foundation
import GRDB

// MARK: - Building a program

/// One prescribed set. Reps and weight are free text, like the web app ("8-12", "65%", "RPE 8").
public struct PlannedSet: Sendable, Equatable {
    public let reps: String
    public let weight: String?
    public let rpe: Int?
    public let rir: Int?
    public let isWarmup: Bool

    public init(reps: String, weight: String? = nil, rpe: Int? = nil, rir: Int? = nil, isWarmup: Bool = false) {
        self.reps = reps
        self.weight = weight
        self.rpe = rpe
        self.rir = rir
        self.isWarmup = isWarmup
    }
}

public struct PlannedExercise: Sendable, Equatable {
    public let definitionId: String
    /// Superset label; exercises in one workout sharing a non-nil value are one superset.
    public let group: String?
    public let sets: [PlannedSet]

    public init(_ definitionId: String, group: String? = nil, sets: [PlannedSet]) {
        self.definitionId = definitionId
        self.group = group
        self.sets = sets
    }
}

public struct PlannedWorkout: Sendable, Equatable {
    public let name: String
    public let exercises: [PlannedExercise]

    public init(_ name: String, _ exercises: [PlannedExercise]) {
        self.name = name
        self.exercises = exercises
    }
}

/// `weeks[i][j]` becomes week `i + 1`, day `j + 1`.
public struct ProgramPlan: Sendable, Equatable {
    public let name: String
    public let weeks: [[PlannedWorkout]]

    public init(name: String, weeks: [[PlannedWorkout]]) {
        self.name = name
        self.weeks = weeks
    }
}

// MARK: - Reading a program

public struct ProgramSetDetail: Sendable, Equatable, Identifiable {
    public let id: String
    public let setNumber: Int
    public let reps: String
    public let weight: String?
    public let rpe: Int?
    public let rir: Int?
    public let isWarmup: Bool

    public init(id: String, setNumber: Int, reps: String, weight: String?, rpe: Int?, rir: Int?, isWarmup: Bool) {
        self.id = id
        self.setNumber = setNumber
        self.reps = reps
        self.weight = weight
        self.rpe = rpe
        self.rir = rir
        self.isWarmup = isWarmup
    }
}

public struct ProgramExercise: Sendable, Equatable, Identifiable {
    public let id: String
    public let definitionId: String
    public let name: String
    public let group: String?
    /// The plan, by set number.
    public let sets: [ProgramSetDetail]

    public init(id: String, definitionId: String, name: String, group: String?, sets: [ProgramSetDetail]) {
        self.id = id
        self.definitionId = definitionId
        self.name = name
        self.group = group
        self.sets = sets
    }
}

public struct ProgramWorkout: Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let dayNumber: Int
    /// In plan order.
    public let exercises: [ProgramExercise]

    public init(id: String, name: String, dayNumber: Int, exercises: [ProgramExercise]) {
        self.id = id
        self.name = name
        self.dayNumber = dayNumber
        self.exercises = exercises
    }
}

public struct ProgramWeek: Sendable, Equatable, Identifiable {
    public let id: String
    public let weekNumber: Int
    /// By day number.
    public let workouts: [ProgramWorkout]

    public init(id: String, weekNumber: Int, workouts: [ProgramWorkout]) {
        self.id = id
        self.weekNumber = weekNumber
        self.workouts = workouts
    }
}

public struct ProgramDetail: Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let isActive: Bool
    public let isArchived: Bool
    /// By week number.
    public let weeks: [ProgramWeek]

    public init(id: String, name: String, isActive: Bool, isArchived: Bool, weeks: [ProgramWeek]) {
        self.id = id
        self.name = name
        self.isActive = isActive
        self.isArchived = isArchived
        self.weeks = weeks
    }
}

public struct ProgramSummary: Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let isActive: Bool

    public init(id: String, name: String, isActive: Bool) {
        self.id = id
        self.name = name
        self.isActive = isActive
    }
}

public struct UpNext: Sendable, Equatable {
    public let programId: String
    public let workoutId: String
    public let workoutName: String
    public let weekNumber: Int
    public let dayNumber: Int
    /// An unfinished session of this workout exists.
    public let hasDraft: Bool

    public init(programId: String, workoutId: String, workoutName: String, weekNumber: Int, dayNumber: Int, hasDraft: Bool) {
        self.programId = programId
        self.workoutId = workoutId
        self.workoutName = workoutName
        self.weekNumber = weekNumber
        self.dayNumber = dayNumber
        self.hasDraft = hasDraft
    }
}

public struct ProgramProgress: Sendable, Equatable {
    /// Every workout done and the program has at least one.
    public let isComplete: Bool
    public let totalWorkouts: Int
    public let doneWorkouts: Int
    /// 1 until the first restart, then 2, and so on.
    public let cycleNumber: Int

    public init(isComplete: Bool, totalWorkouts: Int, doneWorkouts: Int, cycleNumber: Int) {
        self.isComplete = isComplete
        self.totalWorkouts = totalWorkouts
        self.doneWorkouts = doneWorkouts
        self.cycleNumber = cycleNumber
    }
}

// MARK: - Logging a program workout

public struct SessionExercise: Sendable, Equatable, Identifiable {
    /// The program exercise id. Pass it to `logSet(exerciseId:...)` and `prefill(exerciseId:setNumber:)`.
    public let id: String
    public let definitionId: String
    public let name: String
    public let group: String?
    /// The program exercise's prescribed sets.
    public let planned: [ProgramSetDetail]
    public let logged: [SetDetail]

    public init(id: String, definitionId: String, name: String, group: String?, planned: [ProgramSetDetail], logged: [SetDetail]) {
        self.id = id
        self.definitionId = definitionId
        self.name = name
        self.group = group
        self.planned = planned
        self.logged = logged
    }
}

public struct ProgramSession: Sendable, Equatable, Identifiable {
    /// The workoutCompletion id; pass it to `finishWorkout`, `discardWorkout` and `workout(_:)`.
    public let id: String
    public let programId: String
    public let workoutId: String
    public let cycleNumber: Int
    /// In plan order.
    public let exercises: [SessionExercise]

    public init(id: String, programId: String, workoutId: String, cycleNumber: Int, exercises: [SessionExercise]) {
        self.id = id
        self.programId = programId
        self.workoutId = workoutId
        self.cycleNumber = cycleNumber
        self.exercises = exercises
    }
}

/// Form values for the next set, as strings, exactly as the web app's `computePrefillValues`
/// returns them ("225", "102.5", "0"; "" for no value).
public struct Prefill: Sendable, Equatable {
    public let reps: String
    public let weight: String
    /// nil means "keep the unit currently selected".
    public let weightUnit: String?
    public let rpe: String
    public let rir: String

    public init(reps: String, weight: String, weightUnit: String?, rpe: String, rir: String) {
        self.reps = reps
        self.weight = weight
        self.weightUnit = weightUnit
        self.rpe = rpe
        self.rir = rir
    }
}

// MARK: - Database

extension AppDatabase {
    /// Saves a new, inactive program and returns its id.
    public func createProgram(_ plan: ProgramPlan) throws -> String {
        let programId = Self.newId()
        try dbQueue.write { db in
            let now = Date()
            try db.execute(sql: """
                INSERT INTO program (id, name, createdAt, updatedAt, isUserCreated) VALUES (?, ?, ?, ?, 1)
                """, arguments: [programId, plan.name, now, now])
            for (wi, workouts) in plan.weeks.enumerated() {
                let weekId = Self.newId()
                try db.execute(sql: "INSERT INTO week (id, weekNumber, programId) VALUES (?, ?, ?)",
                               arguments: [weekId, wi + 1, programId])
                for (di, workout) in workouts.enumerated() {
                    let workoutId = Self.newId()
                    try db.execute(sql: "INSERT INTO workout (id, name, dayNumber, weekId) VALUES (?, ?, ?, ?)",
                                   arguments: [workoutId, workout.name, di + 1, weekId])
                    for (ei, exercise) in workout.exercises.enumerated() {
                        let exerciseId = Self.newId()
                        try db.execute(sql: """
                            INSERT INTO exercise (id, name, exerciseDefinitionId, "order", exerciseGroup, workoutId)
                            VALUES (?, ?, ?, ?, ?, ?)
                            """, arguments: [exerciseId, try Self.definitionName(db, exercise.definitionId),
                                             exercise.definitionId, ei + 1, exercise.group, workoutId])
                        try Self.insertPrescribedSets(db, exerciseId, exercise.sets)
                    }
                }
            }
        }
        return programId
    }

    public func program(_ id: String) throws -> ProgramDetail {
        try dbQueue.read { db in
            guard let p = try Row.fetchOne(db, sql: "SELECT name, isActive, isArchived FROM program WHERE id = ?", arguments: [id]) else {
                throw RipitCoreError.notFound("program \(id)")
            }
            let sets = Dictionary(grouping: try Row.fetchAll(db, sql: """
                SELECT s.* FROM prescribedSet s
                JOIN exercise e ON e.id = s.exerciseId JOIN workout w ON w.id = e.workoutId JOIN week k ON k.id = w.weekId
                WHERE k.programId = ? ORDER BY s.setNumber
                """, arguments: [id])) { $0["exerciseId"] as String }
            let exercises = Dictionary(grouping: try Row.fetchAll(db, sql: """
                SELECT e.* FROM exercise e JOIN workout w ON w.id = e.workoutId JOIN week k ON k.id = w.weekId
                WHERE k.programId = ? ORDER BY e."order"
                """, arguments: [id])) { $0["workoutId"] as String }
            let workouts = Dictionary(grouping: try Row.fetchAll(db, sql: """
                SELECT w.* FROM workout w JOIN week k ON k.id = w.weekId WHERE k.programId = ? ORDER BY w.dayNumber
                """, arguments: [id])) { $0["weekId"] as String }
            let weeks = try Row.fetchAll(db, sql: "SELECT id, weekNumber FROM week WHERE programId = ? ORDER BY weekNumber",
                                         arguments: [id]).map { k in
                ProgramWeek(id: k["id"], weekNumber: k["weekNumber"], workouts: (workouts[k["id"]] ?? []).map { w in
                    ProgramWorkout(id: w["id"], name: w["name"], dayNumber: w["dayNumber"],
                                   exercises: (exercises[w["id"]] ?? []).map { Self.programExercise($0, sets[$0["id"]] ?? []) })
                })
            }
            return ProgramDetail(id: id, name: p["name"], isActive: p["isActive"], isArchived: p["isArchived"], weeks: weeks)
        }
    }

    /// Programs that are not archived, oldest first.
    public func programs() throws -> [ProgramSummary] {
        try dbQueue.read { db in
            try Row.fetchAll(db, sql: """
                SELECT id, name, isActive FROM program WHERE isArchived = 0 AND deletedAt IS NULL ORDER BY createdAt, rowid
                """).map { ProgramSummary(id: $0["id"], name: $0["name"], isActive: $0["isActive"]) }
        }
    }

    /// Makes this the only active program.
    public func activateProgram(_ id: String) throws {
        try dbQueue.write { db in
            try Self.requireProgram(db, id)
            try db.execute(sql: "UPDATE program SET isActive = 0, updatedAt = ? WHERE isActive = 1", arguments: [Date()])
            try db.execute(sql: "UPDATE program SET isActive = 1, updatedAt = ? WHERE id = ?", arguments: [Date(), id])
        }
    }

    /// Hides the program from `programs()` and deactivates it. Its logged history stays.
    public func archiveProgram(_ id: String) throws {
        try dbQueue.write { db in
            try Self.requireProgram(db, id)
            let now = Date()
            try db.execute(sql: """
                UPDATE program SET isArchived = 1, archivedAt = ?, isActive = 0, updatedAt = ? WHERE id = ?
                """, arguments: [now, now, id])
        }
    }

    /// The active program's current week number, or nil with no active program.
    public func currentWeek() throws -> Int? {
        try dbQueue.read { db in
            guard let id = try Self.activeProgramId(db) else { return nil }
            // The first week with an unfinished workout, else the last week (lib/db/current-week.ts).
            if let w = try Self.schedule(db, id).first(where: { !$0.done }) { return w.weekNumber }
            return try Int.fetchOne(db, sql: "SELECT MAX(weekNumber) FROM week WHERE programId = ?", arguments: [id])
        }
    }

    /// The active program's next workout, or nil when there is none (no active program, or complete).
    public func upNext() throws -> UpNext? {
        try dbQueue.read { db in
            guard let id = try Self.activeProgramId(db), let w = try Self.schedule(db, id).first(where: { !$0.done }) else { return nil }
            return UpNext(programId: id, workoutId: w.id, workoutName: w.name, weekNumber: w.weekNumber,
                          dayNumber: w.dayNumber, hasDraft: try Self.draftId(db, w.id) != nil)
        }
    }

    public func programProgress(_ id: String) throws -> ProgramProgress {
        try dbQueue.read { db in
            try Self.requireProgram(db, id)
            let workouts = try Self.schedule(db, id)
            let done = workouts.filter(\.done).count
            return ProgramProgress(isComplete: !workouts.isEmpty && done == workouts.count, totalWorkouts: workouts.count,
                                   doneWorkouts: done, cycleNumber: try Self.cycle(db, id))
        }
    }

    /// Starts a session of a program workout and returns the session (completion) id.
    /// An unfinished session of that workout is resumed rather than duplicated.
    public func startProgramWorkout(_ workoutId: String, at date: Date) throws -> String {
        try dbQueue.write { db in
            guard let programId = try String.fetchOne(db, sql: """
                SELECT k.programId FROM workout w JOIN week k ON k.id = w.weekId WHERE w.id = ?
                """, arguments: [workoutId]) else {
                throw RipitCoreError.notFound("workout \(workoutId)")
            }
            if let draft = try Self.draftId(db, workoutId) { return draft }
            let id = Self.newId()
            try db.execute(sql: """
                INSERT INTO workoutCompletion (id, workoutId, startedAt, status, isAdHoc, cycleNumber)
                VALUES (?, ?, ?, 'draft', 0, ?)
                """, arguments: [id, workoutId, date, try Self.cycle(db, programId)])
            return id
        }
    }

    public func programSession(_ id: String) throws -> ProgramSession {
        try dbQueue.read { db in
            guard let c = try Row.fetchOne(db, sql: """
                SELECT c.workoutId, c.cycleNumber, k.programId FROM workoutCompletion c
                JOIN workout w ON w.id = c.workoutId JOIN week k ON k.id = w.weekId WHERE c.id = ?
                """, arguments: [id]) else {
                throw RipitCoreError.notFound("program session \(id)")
            }
            let workoutId: String = c["workoutId"]
            let detail = try Self.detail(db, id)
            let sets = Dictionary(grouping: try Row.fetchAll(db, sql: """
                SELECT s.* FROM prescribedSet s JOIN exercise e ON e.id = s.exerciseId WHERE e.workoutId = ? ORDER BY s.setNumber
                """, arguments: [workoutId])) { $0["exerciseId"] as String }
            let exercises = detail.exercises.map { e in
                SessionExercise(id: e.id, definitionId: e.definitionId, name: e.name, group: e.group,
                                planned: (sets[e.id] ?? []).map(Self.setDetail), logged: e.sets)
            }
            return ProgramSession(id: id, programId: c["programId"], workoutId: workoutId,
                                  cycleNumber: c["cycleNumber"], exercises: exercises)
        }
    }

    /// Prefill for the given set of a program exercise in its unfinished session.
    public func prefill(exerciseId: String, setNumber: Int) throws -> Prefill {
        try dbQueue.read { db in
            guard let e = try Row.fetchOne(db, sql: "SELECT workoutId, exerciseDefinitionId FROM exercise WHERE id = ?", arguments: [exerciseId]),
                  let workoutId = e["workoutId"] as String? else {
                throw RipitCoreError.notFound("program exercise \(exerciseId)")
            }
            let draft = try Self.draftId(db, workoutId)
            let setColumns = "s.setNumber, s.reps, s.weight, s.weightUnit, s.rpe, s.rir, s.isWarmup"
            let session = try Row.fetchAll(db, sql: """
                SELECT \(setColumns) FROM loggedSet s WHERE s.exerciseId = ? AND s.completionId = ?
                """, arguments: [exerciseId, draft])
            // Last time: the most recent finished workout with this exercise, program or ad-hoc,
            // archived or not (lib/queries/exercise-history.ts).
            let lastCompletion = try String.fetchOne(db, sql: """
                SELECT c.id FROM workoutCompletion c
                JOIN loggedSet s ON s.completionId = c.id JOIN exercise x ON x.id = s.exerciseId
                WHERE x.exerciseDefinitionId = ? AND c.status = 'completed'
                ORDER BY c.completedAt DESC LIMIT 1
                """, arguments: [e["exerciseDefinitionId"] as String])
            let history = try lastCompletion.map { cid in
                try Row.fetchAll(db, sql: """
                    SELECT \(setColumns) FROM loggedSet s JOIN exercise x ON x.id = s.exerciseId
                    WHERE s.completionId = ? AND x.exerciseDefinitionId = ?
                    """, arguments: [cid, e["exerciseDefinitionId"] as String])
            } ?? []
            if let source = Self.lastWorkingSet(session) ?? Self.lastWorkingSet(history) {
                let unit: String = source["weightUnit"]
                return Prefill(reps: String(source["reps"] as Int), weight: Self.jsNumber(source["weight"]),
                               weightUnit: unit == "lbs" || unit == "kg" ? unit : nil,
                               rpe: (source["rpe"] as Int?).map(String.init) ?? "",
                               rir: (source["rir"] as Int?).map(String.init) ?? "")
            }
            let planned = try Row.fetchOne(db, sql: "SELECT reps, rpe, rir FROM prescribedSet WHERE exerciseId = ? AND setNumber = ?",
                                           arguments: [exerciseId, setNumber])
            return Prefill(reps: Self.parseRepsFromPrescribed(planned?["reps"]), weight: "0", weightUnit: nil,
                           rpe: (planned?["rpe"] as Int?).map(String.init) ?? "",
                           rir: (planned?["rir"] as Int?).map(String.init) ?? "")
        }
    }

    /// Changes a logged set in place.
    public func updateSet(_ setId: String, reps: Int, weight: Double, unit: String) throws {
        try dbQueue.write { db in
            try db.execute(sql: "UPDATE loggedSet SET reps = ?, weight = ?, weightUnit = ? WHERE id = ?",
                           arguments: [reps, weight, unit, setId])
            if db.changesCount == 0 { throw RipitCoreError.notFound("loggedSet \(setId)") }
        }
    }

    /// Starts the program over: week 1 is current again and the cycle number goes up.
    public func restartProgram(_ id: String) throws {
        try dbQueue.write { db in
            try Self.requireProgram(db, id)
            let next = try Self.cycle(db, id) + 1
            // Like lib/db/program-restart.ts: the old cycle's completions are archived, not deleted.
            try db.execute(sql: """
                UPDATE workoutCompletion SET isArchived = 1
                WHERE isArchived = 0 AND workoutId IN (
                    SELECT w.id FROM workout w JOIN week k ON k.id = w.weekId WHERE k.programId = ?)
                """, arguments: [id])
            try db.execute(sql: "UPDATE program SET cycleNumber = ?, updatedAt = ? WHERE id = ?", arguments: [next, Date(), id])
        }
    }

    /// Renames a program exercise, in the plan and in that workout's history.
    public func renameProgramExercise(_ exerciseId: String, to name: String) throws {
        try dbQueue.write { db in
            try db.execute(sql: "UPDATE exercise SET name = ? WHERE id = ? AND workoutId IS NOT NULL", arguments: [name, exerciseId])
            if db.changesCount == 0 { throw RipitCoreError.notFound("program exercise \(exerciseId)") }
        }
    }

    /// Replaces a program exercise's prescribed sets. Logged sets are not touched.
    public func setPrescribedSets(_ exerciseId: String, _ sets: [PlannedSet]) throws {
        try dbQueue.write { db in
            guard try Bool.fetchOne(db, sql: "SELECT 1 FROM exercise WHERE id = ? AND workoutId IS NOT NULL", arguments: [exerciseId]) != nil else {
                throw RipitCoreError.notFound("program exercise \(exerciseId)")
            }
            try db.execute(sql: "DELETE FROM prescribedSet WHERE exerciseId = ?", arguments: [exerciseId])
            try Self.insertPrescribedSets(db, exerciseId, sets)
        }
    }
}
