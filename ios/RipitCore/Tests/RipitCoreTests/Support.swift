// Shared helpers for the RipitCore tests (work item 153, features/ios-app/skeleton.feature).
//
// The catalog tests read the repo's own sources of truth as the oracle:
// - prisma/seeds/exercise-definitions.json  the 312 system exercises
// - scripts/exercise-mapping.json           which exercises have a free-exercise-db image
// All workout data is synthetic.

import Foundation
import Synchronization
@testable import RipitCore

enum Repo {
    /// ios/RipitCore/Tests/RipitCoreTests/Support.swift -> repo root
    static let root = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent()
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()

    static func json(_ path: String) throws -> Any {
        try JSONSerialization.jsonObject(with: Data(contentsOf: root.appendingPathComponent(path)))
    }

    /// (id, name, aliases) for every system exercise in the seed.
    static func seedExercises() throws -> [(id: String, name: String, aliases: [String])] {
        let rows = try json("prisma/seeds/exercise-definitions.json") as! [[String: Any]]
        return rows.map { ($0["id"] as! String, $0["name"] as! String, $0["aliases"] as! [String]) }
    }

    /// Ids of seed exercises that the mapping matched to a free-exercise-db image.
    static func imageMatchedIds() throws -> Set<String> {
        let doc = try json("scripts/exercise-mapping.json") as! [String: Any]
        let matches = doc["matches"] as! [[String: Any]]
        return Set(matches.map { $0["our_id"] as! String })
    }
}

/// A fresh database file in its own temp directory. The directory is left for the OS to clean:
/// `TempDB().open()` drops the TempDB while the database is still open, so deleting in deinit
/// would pull the file out from under SQLite.
final class TempDB {
    let dir: URL
    var path: String { dir.appendingPathComponent("ripit.sqlite").path }

    init() throws {
        dir = FileManager.default.temporaryDirectory.appendingPathComponent("ripitcore-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }

    func open(upTo: String? = nil, extra: [ExtraMigration] = []) throws -> AppDatabase {
        try AppDatabase.open(path: path, upTo: upTo, extraMigrations: extra)
    }
}

/// Records what extra migrations ran, across opens.
final class RunLog: Sendable {
    private let entries = Mutex<[String]>([])
    func append(_ s: String) { entries.withLock { $0.append(s) } }
    var all: [String] { entries.withLock { $0 } }
}

/// Fixed local times for "today" so date tests don't depend on when they run.
enum Clock {
    static let tz = TimeZone(identifier: "America/Denver")!
    static func at(_ y: Int, _ m: Int, _ d: Int, _ h: Int, _ min: Int = 0) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        return cal.date(from: DateComponents(year: y, month: m, day: d, hour: h, minute: min))!
    }
    static func sameLocalDay(_ a: Date, _ b: Date) -> Bool {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        return cal.isDate(a, inSameDayAs: b)
    }
}

let benchPressId = "cmiz7vjju0000vr0m4b1o6bec"   // Barbell Bench Press

extension AppDatabase {
    /// An ad-hoc workout with one exercise per (definitionId, [(reps, weight)]), finished at `finish` if given.
    @discardableResult
    func makeWorkout(start: Date, finish: Date?, _ exercises: [(String, [(Int, String)])]) throws -> String {
        let w = try startWorkout(at: start)
        for (def, sets) in exercises {
            let e = try addExercise(definitionId: def, to: w)
            for (reps, weight) in sets { _ = try logSet(exerciseId: e, reps: reps, weight: weight) }
        }
        if let finish { try finishWorkout(w, at: finish) }
        return w
    }

    func count(_ table: String) throws -> Int {
        try read { try Int.fetchOne($0, sql: "SELECT COUNT(*) FROM \"\(table)\"") ?? -1 }
    }
}
