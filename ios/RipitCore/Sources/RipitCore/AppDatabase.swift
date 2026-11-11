// The phone's local database. Ad-hoc workouts are stored the way the web app stores them:
// a workoutCompletion (isAdHoc, status 'draft' then 'completed') owning one-off exercises,
// whose loggedSets point at both the exercise and the completion.

import Foundation
import GRDB

/// The phone's local SQLite database. Opening it creates the file if needed, runs any missing
/// migrations in order, and seeds the system exercise catalog.
public final class AppDatabase: Sendable {
    /// Internal so other files' extensions (Import.swift, Programs.swift) can write in one transaction.
    let dbQueue: DatabaseQueue

    private init(_ dbQueue: DatabaseQueue) {
        self.dbQueue = dbQueue
    }

    /// The app's own migrations, oldest first.
    public static var migrationIdentifiers: [String] { Schema.migrations.map(\.0) }

    /// Opens (or creates) the database at `path`. `upTo` stops after that app migration
    /// (to build an older database); `extraMigrations` run after the app's own.
    public static func open(path: String, upTo: String? = nil, extraMigrations: [ExtraMigration] = []) throws -> AppDatabase {
        let dir = URL(fileURLWithPath: path).deletingLastPathComponent()
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return try prepare(DatabaseQueue(path: path), upTo: upTo, extraMigrations: extraMigrations)
    }

    public static func inMemory() throws -> AppDatabase {
        try prepare(DatabaseQueue(), upTo: nil, extraMigrations: [])
    }

    private static func prepare(_ dbQueue: DatabaseQueue, upTo: String?, extraMigrations: [ExtraMigration]) throws -> AppDatabase {
        var migrator = DatabaseMigrator()
        for (id, migrate) in Schema.migrations { migrator.registerMigration(id, migrate: migrate) }
        if let upTo {
            try migrator.migrate(dbQueue, upTo: upTo)
        } else {
            for extra in extraMigrations { migrator.registerMigration(extra.identifier, migrate: extra.migrate) }
            try migrator.migrate(dbQueue)
        }
        try dbQueue.write(seedCatalog)
        return AppDatabase(dbQueue)
    }

    /// Inserts any system exercise missing from the database. Existing rows are left alone.
    private static func seedCatalog(_ db: Database) throws {
        let records = try BundledCatalog.load().records
        let present = try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM exerciseDefinition WHERE isSystem = 1") ?? 0
        guard present < records.count else { return }
        let now = Date()
        for r in records {
            try db.execute(sql: """
                INSERT OR IGNORE INTO exerciseDefinition
                    (id, name, normalizedName, aliases, category, isSystem, createdAt, updatedAt, equipment,
                     instructions, imageUrls, primaryFAUs, secondaryFAUs, force, mechanic, level, isBodyweight)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [
                    r.id, r.name, r.normalizedName, try json(r.aliases), r.category, now, now, try json(r.equipment),
                    r.instructions, try json(r.images), try json(r.primaryFAUs), try json(r.secondaryFAUs),
                    r.force, r.mechanic, r.level, r.equipment.contains("bodyweight"),
                ])
        }
    }

    private static func json(_ value: [String]) throws -> String {
        String(decoding: try JSONEncoder().encode(value), as: UTF8.self)
    }

    /// Identifiers of every migration applied to this database, in the order they ran.
    public func appliedMigrations() throws -> [String] {
        try dbQueue.read { try String.fetchAll($0, sql: "SELECT identifier FROM grdb_migrations ORDER BY rowid") }
    }

    /// Read-only access for inspection (tests, debugging).
    public func read<T>(_ block: (Database) throws -> T) throws -> T {
        try dbQueue.read(block)
    }

    /// Ids of the system exercise definitions in the database.
    public func systemExerciseIds() throws -> [String] {
        try dbQueue.read { try String.fetchAll($0, sql: "SELECT id FROM exerciseDefinition WHERE isSystem = 1") }
    }

    /// Finished workouts, newest first. Unfinished workouts are not history.
    public func history() throws -> [HistoryEntry] {
        try dbQueue.read { db in
            // A program session is named after its workout. Its exercises are the session's own plus the
            // program exercises it logged sets against.
            try Row.fetchAll(db, sql: """
                SELECT c.id, COALESCE(c.name, w.name) AS name, c.completedAt, p.name AS programName, k.weekNumber,
                       (SELECT COUNT(*) FROM (
                            SELECT id FROM exercise WHERE workoutCompletionId = c.id
                            UNION SELECT exerciseId FROM loggedSet WHERE completionId = c.id)) AS exerciseCount,
                       (SELECT COUNT(*) FROM loggedSet s WHERE s.completionId = c.id) AS setCount
                FROM workoutCompletion c
                LEFT JOIN workout w ON w.id = c.workoutId
                LEFT JOIN week k ON k.id = w.weekId
                LEFT JOIN program p ON p.id = k.programId
                WHERE c.status = 'completed'
                ORDER BY c.completedAt DESC
                """).map {
                HistoryEntry(id: $0["id"], name: $0["name"], completedAt: $0["completedAt"],
                             exerciseCount: $0["exerciseCount"], setCount: $0["setCount"],
                             programName: $0["programName"], weekNumber: $0["weekNumber"])
            }
        }
    }

    /// Starts an ad-hoc workout and returns its id.
    public func startWorkout(at date: Date) throws -> String {
        let id = Self.newId()
        try dbQueue.write { db in
            try db.execute(sql: """
                INSERT INTO workoutCompletion (id, startedAt, status, isAdHoc) VALUES (?, ?, 'draft', 1)
                """, arguments: [id, date])
        }
        return id
    }

    /// The unfinished workout to offer for resume, if any. An archived draft (a program restart archives
    /// open sessions) is never offered.
    public func inProgressWorkout() throws -> WorkoutDetail? {
        try dbQueue.read { db in
            let id = try String.fetchOne(db, sql: """
                SELECT id FROM workoutCompletion WHERE status = 'draft' AND isArchived = 0
                ORDER BY startedAt DESC LIMIT 1
                """)
            return try id.map { try Self.detail(db, $0) }
        }
    }

    /// Adds a catalog exercise to a workout and returns the new exercise id.
    public func addExercise(definitionId: String, to workoutId: String) throws -> String {
        try dbQueue.write { try Self.insertOneOff($0, definitionId: definitionId, workoutId: workoutId) }
    }

    /// Inserts one ad-hoc exercise after the workout's last one and returns its id.
    static func insertOneOff(_ db: Database, definitionId: String, workoutId: String) throws -> String {
        let id = newId()
        try requireCompletion(db, workoutId)
        guard let name = try String.fetchOne(db, sql: "SELECT name FROM exerciseDefinition WHERE id = ?", arguments: [definitionId]) else {
            throw RipitCoreError.notFound("exerciseDefinition \(definitionId)")
        }
        // After today's last, plan rows included (a program session, work item 204).
        let order = try Int.fetchOne(db, sql: """
            SELECT COALESCE(MAX(COALESCE(s.position, e."order")), 0) + 1 FROM exercise e
            LEFT JOIN sessionExercise s ON s.exerciseId = e.id AND s.completionId = ?1
            WHERE e.workoutCompletionId = ?1 OR e.workoutId = (SELECT workoutId FROM workoutCompletion WHERE id = ?1)
            """, arguments: [workoutId]) ?? 1
        try db.execute(sql: """
            INSERT INTO exercise (id, name, exerciseDefinitionId, "order", isOneOff, workoutCompletionId)
            VALUES (?, ?, ?, ?, 1, ?)
            """, arguments: [id, name, definitionId, order, workoutId])
        return id
    }

    /// Logs the next set for an exercise and returns the set id. A program exercise logs into its
    /// workout's unfinished session. The weight must be a finite number from 0 to `LoggedWeight.max`.
    public func logSet(exerciseId: String, reps: Int, weight: Double, unit: String = "lbs") throws -> String {
        try logSet(exerciseId: exerciseId, reps: reps, weight: weight, unit: unit, at: Date())
    }

    /// Deletes one logged set and renumbers the exercise's later sets.
    public func deleteSet(_ setId: String) throws {
        try dbQueue.write { db in
            guard let row = try Row.fetchOne(db, sql: "SELECT exerciseId, completionId, setNumber FROM loggedSet WHERE id = ?", arguments: [setId]) else {
                throw RipitCoreError.notFound("loggedSet \(setId)")
            }
            let exerciseId: String = row["exerciseId"]
            let completionId: String = row["completionId"]
            let setNumber: Int = row["setNumber"]
            try db.execute(sql: "DELETE FROM loggedSet WHERE id = ?", arguments: [setId])
            // One row at a time, lowest first, so the (completion, exercise, setNumber) key never collides.
            let later = try String.fetchAll(db, sql: """
                SELECT id FROM loggedSet WHERE exerciseId = ? AND completionId = ? AND setNumber > ? ORDER BY setNumber
                """, arguments: [exerciseId, completionId, setNumber])
            for id in later {
                try db.execute(sql: "UPDATE loggedSet SET setNumber = setNumber - 1 WHERE id = ?", arguments: [id])
            }
        }
    }

    /// Removes an exercise and its logged sets from an unfinished workout. Finished history is never edited.
    public func removeExercise(_ exerciseId: String) throws {
        try dbQueue.write { db in
            let row = try Row.fetchOne(db, sql: """
                SELECT e.workoutCompletionId, e.exerciseGroup FROM exercise e
                JOIN workoutCompletion c ON c.id = e.workoutCompletionId
                WHERE e.id = ? AND c.status = 'draft'
                """, arguments: [exerciseId])
            guard let row else { throw RipitCoreError.notFound("exercise \(exerciseId) in an unfinished workout") }
            // Logged sets go with it (ON DELETE CASCADE).
            try db.execute(sql: "DELETE FROM exercise WHERE id = ?", arguments: [exerciseId])
            // Like the web's normalise rule: a superset left with one exercise is no longer a superset.
            if let group: String = row["exerciseGroup"] {
                let completionId: String = row["workoutCompletionId"]
                try db.execute(sql: """
                    UPDATE exercise SET exerciseGroup = NULL
                    WHERE workoutCompletionId = ? AND exerciseGroup = ?
                      AND (SELECT COUNT(*) FROM exercise WHERE workoutCompletionId = ? AND exerciseGroup = ?) = 1
                    """, arguments: [completionId, group, completionId, group])
            }
        }
    }

    /// Groups exercises of one workout as a superset.
    public func groupAsSuperset(_ exerciseIds: [String]) throws {
        guard !exerciseIds.isEmpty else { return }
        try dbQueue.write { db in
            let marks = databaseQuestionMarks(count: exerciseIds.count)
            let completions = try String.fetchAll(db, sql: """
                SELECT DISTINCT workoutCompletionId FROM exercise WHERE id IN (\(marks))
                """, arguments: StatementArguments(exerciseIds))
            guard completions.count == 1, let completionId = completions.first else {
                throw RipitCoreError.notFound("exercises of one workout")
            }
            let used = try Set(String.fetchAll(db, sql: """
                SELECT exerciseGroup FROM exercise WHERE workoutCompletionId = ? AND exerciseGroup IS NOT NULL
                """, arguments: [completionId]))
            // Letters, like the web app's superset labels: A, B, ... then A2, B2, ...
            let group = (0...).lazy.map { i in
                let letter = String(UnicodeScalar(UInt8(65 + i % 26)))
                return i < 26 ? letter : "\(letter)\(i / 26 + 1)"
            }.first { !used.contains($0) }!
            try db.execute(sql: "UPDATE exercise SET exerciseGroup = ? WHERE id IN (\(marks))",
                           arguments: [group] + StatementArguments(exerciseIds))
        }
    }

    /// Finishes a workout. A workout with no logged sets and no exercises at all is refused with
    /// `RipitCoreError.emptyWorkout`; one with exercises but no sets yet is allowed (slice 1 tests do that).
    public func finishWorkout(_ workoutId: String, at date: Date) throws {
        try dbQueue.write { db in
            try Self.requireCompletion(db, workoutId)
            let hasContent = try Bool.fetchOne(db, sql: """
                SELECT EXISTS (SELECT 1 FROM loggedSet WHERE completionId = ?)
                    OR EXISTS (SELECT 1 FROM exercise WHERE workoutCompletionId = ?)
                    OR EXISTS (SELECT 1 FROM exercise e JOIN workoutCompletion c ON c.workoutId = e.workoutId WHERE c.id = ?)
                """, arguments: [workoutId, workoutId, workoutId]) ?? false
            guard hasContent else { throw RipitCoreError.emptyWorkout }
            try db.execute(sql: """
                UPDATE workoutCompletion
                SET status = 'completed', completedAt = ?,
                    durationSeconds = CAST(ROUND((julianday(?) - julianday(startedAt)) * 86400) AS INTEGER)
                WHERE id = ?
                """, arguments: [date, date, workoutId])
        }
    }

    /// Deletes an unfinished workout with its exercises and sets.
    public func discardWorkout(_ workoutId: String) throws {
        try dbQueue.write { db in
            // Exercises and logged sets go with it (ON DELETE CASCADE).
            try db.execute(sql: "DELETE FROM workoutCompletion WHERE id = ? AND status = 'draft'", arguments: [workoutId])
            if db.changesCount == 0 { throw RipitCoreError.notFound("unfinished workout \(workoutId)") }
        }
    }

    public func workout(_ id: String) throws -> WorkoutDetail {
        try dbQueue.read { try Self.detail($0, id) }
    }

    // MARK: - Helpers

    static func newId() -> String { UUID().uuidString.lowercased() }

    private static func requireCompletion(_ db: Database, _ id: String) throws {
        guard try Bool.fetchOne(db, sql: "SELECT 1 FROM workoutCompletion WHERE id = ?", arguments: [id]) != nil else {
            throw RipitCoreError.notFound("workout \(id)")
        }
    }

    static func detail(_ db: Database, _ id: String) throws -> WorkoutDetail {
        guard let c = try Row.fetchOne(db, sql: "SELECT startedAt, completedAt, workoutId, name FROM workoutCompletion WHERE id = ?", arguments: [id]) else {
            throw RipitCoreError.notFound("workout \(id)")
        }
        let sets = try Row.fetchAll(db, sql: """
            SELECT id, exerciseId, setNumber, reps, weight, weightUnit, rpe, rir, isWarmup FROM loggedSet
            WHERE completionId = ? ORDER BY setNumber
            """, arguments: [id])
        let setsByExercise = Dictionary(grouping: sets) { $0["exerciseId"] as String }
        // The workout's own plan (slice 6). A program session's plan is read from the program, so its
        // exercises leave this empty and a plan edit doesn't change the session.
        let planned = try Row.fetchAll(db, sql: """
            SELECT p.id, p.exerciseId, p.setNumber, p.reps, p.weight, p.rpe, p.rir, p.isWarmup FROM prescribedSet p
            JOIN exercise e ON e.id = p.exerciseId
            WHERE e.workoutCompletionId = ? ORDER BY p.setNumber
            """, arguments: [id])
        let plannedByExercise = Dictionary(grouping: planned) { $0["exerciseId"] as String }
        let exercises = try Row.fetchAll(db, sql: """
            SELECT e.id, e.exerciseDefinitionId, e.name, e.exerciseGroup FROM exercise e
            LEFT JOIN sessionExercise s ON s.exerciseId = e.id AND s.completionId = ?1
            WHERE (e.workoutCompletionId = ?1 OR (e.workoutId IS NOT NULL AND e.workoutId = ?2)) AND COALESCE(s.hidden, 0) = 0
            ORDER BY COALESCE(s.position, e."order")
            """, arguments: [id, c["workoutId"] as String?]).map { e in
            let exerciseId: String = e["id"]
            return ExerciseDetail(
                id: exerciseId, definitionId: e["exerciseDefinitionId"], name: e["name"], group: e["exerciseGroup"],
                sets: (setsByExercise[exerciseId] ?? []).map {
                    SetDetail(id: $0["id"], setNumber: $0["setNumber"], reps: $0["reps"],
                              weight: $0["weight"], weightUnit: $0["weightUnit"],
                              rpe: $0["rpe"], rir: $0["rir"], isWarmup: $0["isWarmup"])
                },
                planned: (plannedByExercise[exerciseId] ?? []).map {
                    ProgramSetDetail(id: $0["id"], setNumber: $0["setNumber"], reps: $0["reps"], weight: $0["weight"],
                                     rpe: $0["rpe"], rir: $0["rir"], isWarmup: $0["isWarmup"])
                })
        }
        return WorkoutDetail(id: id, startedAt: c["startedAt"] ?? Date(timeIntervalSince1970: 0),
                             completedAt: c["completedAt"], exercises: exercises, name: c["name"])
    }
}
