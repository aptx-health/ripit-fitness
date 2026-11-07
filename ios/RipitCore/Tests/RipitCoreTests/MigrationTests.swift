// Scenarios: "Fresh install opens to an empty history", "Schema migrations run in order and only once".
//
// API used:
// - AppDatabase.open(path:upTo:extraMigrations:), AppDatabase.migrationIdentifiers
// - appliedMigrations(), history(), read(_:)

import Foundation
import GRDB
import Synchronization
import Testing
@testable import RipitCore

@Suite("Database: fresh install and migrations")
struct MigrationTests {
    /// Tables slice 2's import needs (work item 154: the whole core model, not just ad-hoc).
    static let coreTables: Set<String> = [
        "exerciseDefinition", "program", "week", "workout", "exercise",
        "prescribedSet", "loggedSet", "workoutCompletion", "savedWorkout",
    ]

    @Test("Fresh install: the database is created at the latest schema version")
    func freshInstallLatestVersion() throws {
        let tmp = try TempDB()
        #expect(!FileManager.default.fileExists(atPath: tmp.path))
        let db = try tmp.open()
        #expect(FileManager.default.fileExists(atPath: tmp.path))
        #expect(!AppDatabase.migrationIdentifiers.isEmpty)
        #expect(try db.appliedMigrations() == AppDatabase.migrationIdentifiers)
    }

    @Test("Fresh install: the core tables exist")
    func freshInstallCoreTables() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let tables = try db.read { try Set(String.fetchAll($0, sql: "SELECT name FROM sqlite_master WHERE type = 'table'")) }
        #expect(Self.coreTables.subtracting(tables).isEmpty, "missing: \(Self.coreTables.subtracting(tables).sorted())")
    }

    @Test("Fresh install: the history list has no workouts yet")
    func freshInstallEmptyHistory() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        #expect(try db.history().isEmpty)
        #expect(try db.inProgressWorkout() == nil)
    }

    @Test("Migrations: each missing migration runs once, in order")
    func missingMigrationsRunInOrder() throws {
        let tmp = try TempDB()
        let log = RunLog()
        func m(_ id: String) -> ExtraMigration { ExtraMigration(id) { _ in log.append(id) } }

        _ = try tmp.open(extra: [m("test-a")])
        #expect(log.all == ["test-a"])

        _ = try tmp.open(extra: [m("test-a"), m("test-b"), m("test-c")])
        #expect(log.all == ["test-a", "test-b", "test-c"])

        let db = try tmp.open(extra: [m("test-a"), m("test-b"), m("test-c")])
        #expect(log.all == ["test-a", "test-b", "test-c"], "reopening must not rerun migrations")
        #expect(try db.appliedMigrations() == AppDatabase.migrationIdentifiers + ["test-a", "test-b", "test-c"])
    }

    @Test("Migrations: an older database is brought up to the latest app migration")
    func olderDatabaseUpgraded() throws {
        let tmp = try TempDB()
        let ids = AppDatabase.migrationIdentifiers
        try #require(!ids.isEmpty)
        let old = try tmp.open(upTo: ids[0])
        #expect(try old.appliedMigrations() == [ids[0]])
        let db = try tmp.open()
        #expect(try db.appliedMigrations() == ids)
    }

    @Test("Migrations: existing rows are kept, and a later migration sees them")
    func existingRowsKept() throws {
        let tmp = try TempDB()
        let start = Clock.at(2026, 11, 7, 9)
        let id = try tmp.open().makeWorkout(start: start, finish: start.addingTimeInterval(3600),
                                            [(benchPressId, [(8, "135lbs"), (5, "155lbs")])])
        let seen = Mutex<Int>(-1)
        let db = try tmp.open(extra: [ExtraMigration("test-count-sets") { db in
            let n = try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM loggedSet") ?? -1
            seen.withLock { $0 = n }
        }])
        #expect(seen.withLock { $0 } == 2)
        let history = try db.history()
        #expect(history.map(\.id) == [id])
        #expect(history.first?.setCount == 2)
        #expect(try db.workout(id).exercises.first?.sets.map(\.weight) == ["135lbs", "155lbs"])
    }
}
