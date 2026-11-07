// Helpers for the slice 3 program API in Programs.swift (work item 161).

import Foundation
import GRDB

extension AppDatabase {
    /// One program workout in schedule order (week, then day), with whether it counts as done.
    struct ScheduledWorkout {
        let id: String
        let name: String
        let weekNumber: Int
        let dayNumber: Int
        let done: Bool
    }

    /// Done means a non-archived completion with status 'completed' or 'skipped' (lib/db/current-week.ts).
    static func schedule(_ db: Database, _ programId: String) throws -> [ScheduledWorkout] {
        try Row.fetchAll(db, sql: """
            SELECT w.id, w.name, k.weekNumber, w.dayNumber,
                   EXISTS (SELECT 1 FROM workoutCompletion c WHERE c.workoutId = w.id AND c.isArchived = 0
                           AND c.status IN ('completed', 'skipped')) AS done
            FROM workout w JOIN week k ON k.id = w.weekId
            WHERE k.programId = ?
            ORDER BY k.weekNumber, w.dayNumber
            """, arguments: [programId]).map {
            ScheduledWorkout(id: $0["id"], name: $0["name"], weekNumber: $0["weekNumber"], dayNumber: $0["dayNumber"], done: $0["done"])
        }
    }

    static func activeProgramId(_ db: Database) throws -> String? {
        try String.fetchOne(db, sql: "SELECT id FROM program WHERE isActive = 1 AND isArchived = 0 ORDER BY createdAt LIMIT 1")
    }

    /// The program's current cycle. An imported program may carry completions from a later cycle
    /// than its column says, so the larger wins.
    static func cycle(_ db: Database, _ programId: String) throws -> Int {
        try Int.fetchOne(db, sql: """
            SELECT MAX(p.cycleNumber, COALESCE((
                SELECT MAX(c.cycleNumber) FROM workoutCompletion c
                JOIN workout w ON w.id = c.workoutId JOIN week k ON k.id = w.weekId WHERE k.programId = p.id), 1))
            FROM program p WHERE p.id = ?
            """, arguments: [programId]) ?? 1
    }

    /// The unfinished, non-archived session of a program workout, if any.
    static func draftId(_ db: Database, _ workoutId: String) throws -> String? {
        try String.fetchOne(db, sql: """
            SELECT id FROM workoutCompletion WHERE workoutId = ? AND status = 'draft' AND isArchived = 0
            ORDER BY startedAt DESC LIMIT 1
            """, arguments: [workoutId])
    }

    static func requireProgram(_ db: Database, _ id: String) throws {
        guard try Bool.fetchOne(db, sql: "SELECT 1 FROM program WHERE id = ?", arguments: [id]) != nil else {
            throw RipitCoreError.notFound("program \(id)")
        }
    }

    static func definitionName(_ db: Database, _ definitionId: String) throws -> String {
        guard let name = try String.fetchOne(db, sql: "SELECT name FROM exerciseDefinition WHERE id = ?", arguments: [definitionId]) else {
            throw RipitCoreError.notFound("exerciseDefinition \(definitionId)")
        }
        return name
    }

    static func insertPrescribedSets(_ db: Database, _ exerciseId: String, _ sets: [PlannedSet]) throws {
        for (i, s) in sets.enumerated() {
            try db.execute(sql: """
                INSERT INTO prescribedSet (id, setNumber, reps, weight, rpe, rir, isWarmup, exerciseId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [newId(), i + 1, s.reps, s.weight, s.rpe, s.rir, s.isWarmup, exerciseId])
        }
    }

    static func setDetail(_ r: Row) -> ProgramSetDetail {
        ProgramSetDetail(id: r["id"], setNumber: r["setNumber"], reps: r["reps"], weight: r["weight"],
                         rpe: r["rpe"], rir: r["rir"], isWarmup: r["isWarmup"])
    }

    static func programExercise(_ e: Row, _ sets: [Row]) -> ProgramExercise {
        ProgramExercise(id: e["id"], definitionId: e["exerciseDefinitionId"], name: e["name"], group: e["exerciseGroup"],
                        sets: sets.map(setDetail))
    }

    // MARK: - Prefill (lib/workout/prefill.ts)

    /// The highest-numbered working set, or the last set when all are warm-ups.
    static func lastWorkingSet(_ sets: [Row]) -> Row? {
        let byOrder = sets.sorted { ($0["setNumber"] as Int) < ($1["setNumber"] as Int) }
        let working = byOrder.filter { !($0["isWarmup"] as Bool) }
        return (working.isEmpty ? byOrder : working).last
    }

    /// A number as JavaScript's `String(n)` prints it: "225", "102.5", "0".
    static func jsNumber(_ value: Double) -> String {
        value == value.rounded() && abs(value) < 1e15 ? String(Int64(value)) : String(value)
    }

    /// lib/constants/intensity-presets.ts parseRepsFromPrescribed: "8-12" -> "12", "15+" -> "15",
    /// "10" -> "10", anything else (AMRAP, text) -> "".
    static func parseRepsFromPrescribed(_ reps: String?) -> String {
        guard let trimmed = reps?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else { return "" }
        let digits = { (s: Substring) in !s.isEmpty && s.allSatisfy(\.isASCIIDigit) }
        let parts = trimmed.split(separator: "-", omittingEmptySubsequences: false)
        if parts.count == 2, digits(parts[0]), digits(parts[1]) { return String(parts[1]) }
        if trimmed.hasSuffix("+"), digits(trimmed.dropLast()) { return String(trimmed.dropLast()) }
        if digits(Substring(trimmed)) { return trimmed }
        return ""
    }
}

private extension Character {
    var isASCIIDigit: Bool { isASCII && isNumber }
}
