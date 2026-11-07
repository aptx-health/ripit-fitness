// Extra program calls the app's program editor and Training home need (work item 161). Not part
// of the locked slice 3 contract in Programs.swift; they follow its rules: edits change the plan,
// never logged sets, and a program exercise with logged sets can't be removed (its sets point at it).

import Foundation
import GRDB

extension AppDatabase {
    /// Ids of the program's workouts that count as done (same rule as Up Next).
    public func doneWorkoutIds(_ programId: String) throws -> Set<String> {
        try dbQueue.read { db in Set(try Self.schedule(db, programId).filter(\.done).map(\.id)) }
    }

    /// The program a workout belongs to.
    public func programId(forWorkout workoutId: String) throws -> String? {
        try dbQueue.read { db in
            try String.fetchOne(db, sql: "SELECT k.programId FROM workout w JOIN week k ON k.id = w.weekId WHERE w.id = ?",
                                arguments: [workoutId])
        }
    }

    public func renameProgram(_ id: String, to name: String) throws {
        try dbQueue.write { db in
            try db.execute(sql: "UPDATE program SET name = ?, updatedAt = ? WHERE id = ?", arguments: [name, Date(), id])
            if db.changesCount == 0 { throw RipitCoreError.notFound("program \(id)") }
        }
    }

    public func renameProgramWorkout(_ workoutId: String, to name: String) throws {
        try dbQueue.write { db in
            try db.execute(sql: "UPDATE workout SET name = ? WHERE id = ?", arguments: [name, workoutId])
            if db.changesCount == 0 { throw RipitCoreError.notFound("workout \(workoutId)") }
        }
    }

    /// Adds a week after the last one, copying the last week's workouts, exercises and prescribed
    /// sets (empty when the program has no weeks). Returns the new week id.
    @discardableResult
    public func addProgramWeek(_ programId: String) throws -> String {
        let weekId = Self.newId()
        try dbQueue.write { db in
            try Self.requireProgram(db, programId)
            let last = try Row.fetchOne(db, sql: "SELECT id, weekNumber FROM week WHERE programId = ? ORDER BY weekNumber DESC LIMIT 1",
                                        arguments: [programId])
            try db.execute(sql: "INSERT INTO week (id, weekNumber, programId) VALUES (?, ?, ?)",
                           arguments: [weekId, (last?["weekNumber"] as Int? ?? 0) + 1, programId])
            guard let lastId = last?["id"] as String? else { return }
            for w in try Row.fetchAll(db, sql: "SELECT id, name, dayNumber FROM workout WHERE weekId = ? ORDER BY dayNumber", arguments: [lastId]) {
                let workoutId = Self.newId()
                try db.execute(sql: "INSERT INTO workout (id, name, dayNumber, weekId) VALUES (?, ?, ?, ?)",
                               arguments: [workoutId, w["name"], w["dayNumber"], weekId])
                for e in try Row.fetchAll(db, sql: """
                    SELECT id, name, exerciseDefinitionId, "order", exerciseGroup, notes FROM exercise WHERE workoutId = ? ORDER BY "order"
                    """, arguments: [w["id"] as String]) {
                    let exerciseId = Self.newId()
                    try db.execute(sql: """
                        INSERT INTO exercise (id, name, exerciseDefinitionId, "order", exerciseGroup, workoutId, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, arguments: [exerciseId, e["name"], e["exerciseDefinitionId"], e["order"], e["exerciseGroup"], workoutId, e["notes"]])
                    try db.execute(sql: """
                        INSERT INTO prescribedSet (id, setNumber, reps, weight, rpe, rir, isWarmup, exerciseId)
                        SELECT lower(hex(randomblob(16))), setNumber, reps, weight, rpe, rir, isWarmup, ? FROM prescribedSet WHERE exerciseId = ?
                        """, arguments: [exerciseId, e["id"] as String])
                }
            }
        }
        return weekId
    }

    /// Adds an empty workout as the week's next day. Returns its id.
    @discardableResult
    public func addProgramWorkout(weekId: String, name: String) throws -> String {
        let id = Self.newId()
        try dbQueue.write { db in
            let day = try Int.fetchOne(db, sql: "SELECT COALESCE(MAX(dayNumber), 0) + 1 FROM workout WHERE weekId = ?", arguments: [weekId]) ?? 1
            try db.execute(sql: "INSERT INTO workout (id, name, dayNumber, weekId) VALUES (?, ?, ?, ?)", arguments: [id, name, day, weekId])
        }
        return id
    }

    /// Adds a catalog exercise at the end of a program workout, with prescribed sets. Returns its id.
    @discardableResult
    public func addProgramExercise(workoutId: String, definitionId: String, sets: [PlannedSet]) throws -> String {
        let id = Self.newId()
        try dbQueue.write { db in
            let order = try Int.fetchOne(db, sql: "SELECT COALESCE(MAX(\"order\"), 0) + 1 FROM exercise WHERE workoutId = ?", arguments: [workoutId]) ?? 1
            try db.execute(sql: """
                INSERT INTO exercise (id, name, exerciseDefinitionId, "order", workoutId) VALUES (?, ?, ?, ?, ?)
                """, arguments: [id, try Self.definitionName(db, definitionId), definitionId, order, workoutId])
            try Self.insertPrescribedSets(db, id, sets)
        }
        return id
    }

    /// Removes a program exercise that has no logged sets. Returns false (and changes nothing)
    /// when sets were logged against it, so history is never lost.
    @discardableResult
    public func removeProgramExercise(_ exerciseId: String) throws -> Bool {
        try dbQueue.write { db in
            if try Bool.fetchOne(db, sql: "SELECT 1 FROM loggedSet WHERE exerciseId = ? LIMIT 1", arguments: [exerciseId]) != nil { return false }
            try db.execute(sql: "DELETE FROM exercise WHERE id = ? AND workoutId IS NOT NULL", arguments: [exerciseId])
            return db.changesCount > 0
        }
    }

    /// Sets a program exercise's superset label (nil for none).
    public func setProgramExerciseGroup(_ exerciseId: String, _ group: String?) throws {
        try dbQueue.write { db in
            try db.execute(sql: "UPDATE exercise SET exerciseGroup = ? WHERE id = ? AND workoutId IS NOT NULL", arguments: [group, exerciseId])
            if db.changesCount == 0 { throw RipitCoreError.notFound("program exercise \(exerciseId)") }
        }
    }
}
