// Shared helpers for the slice 2 import tests (work item 158, features/ios-app/import.feature).
//
// The oracle is the web app's own example export, Tests/Fixtures/ripit-export-v1.json, copied
// unchanged from docs/fixtures/ripit-export-v1.json at commit 575a5d05 (branch feature/data-export),
// and the format doc docs/RIPIT_EXPORT_FORMAT.md at the same commit. All data is synthetic.
//
// Its exerciseRefs ids came from a test database, so none of them is in the bundled catalog.
// `ExportFixture.withCatalogIds()` swaps four of them for the catalog's ids, leaving
// "Barbell Bent-Over Row" as the one exercise the phone doesn't know.

import Foundation
import GRDB
@testable import RipitCore

enum ExportFixture {
    static let url = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("Fixtures/ripit-export-v1.json")

    static func data() throws -> Data { try Data(contentsOf: url) }

    static func text() throws -> String { String(decoding: try data(), as: UTF8.self) }

    /// The fixture with each `(from, to)` text replaced once. Fails if `from` isn't there exactly once,
    /// so a variant can't silently stop being a variant.
    static func replacing(_ pairs: [(String, String)]) throws -> Data {
        var s = try text()
        for (from, to) in pairs {
            let n = s.components(separatedBy: from).count - 1
            guard n == 1 else { throw VariantError.matches(from, n) }
            s = s.replacingOccurrences(of: from, with: to)
        }
        return Data(s.utf8)
    }

    /// The fixture with every occurrence of each id replaced (refs, exercises, saved workout snapshots).
    static func withCatalogIds() throws -> Data {
        var s = try text()
        for (from, to) in FileIds.toCatalog { s = s.replacingOccurrences(of: from, with: to) }
        return Data(s.utf8)
    }

    /// The fixture parsed into mutable Foundation containers, edited, and written back.
    static func editing(_ edit: (NSMutableDictionary) throws -> Void) throws -> Data {
        let obj = try JSONSerialization.jsonObject(with: data(), options: .mutableContainers) as! NSMutableDictionary
        try edit(obj)
        return try JSONSerialization.data(withJSONObject: obj)
    }

    enum VariantError: Error { case matches(String, Int) }
}

/// Ids and values from the fixture, so tests read as facts about the file.
enum FileIds {
    static let strengthBlock = "cmw6s043900hhvrt49s708fgk"      // active
    static let oldHypertrophy = "cmw6s043s00ikvrt4zv8guobf"     // archived, not active
    static let programIds: Set = [strengthBlock, oldHypertrophy]

    static let programCompletion = "cmw6s043v00itvrt4l1ao0vfa"  // completed, 7 logged sets
    static let abandoned = "cmw6s044000j2vrt4zeaco4hh"          // abandoned, cycle 2, 1 logged set
    static let adHoc = "cmw6s044200j4vrt46cvp9bwl"              // completed ad-hoc "Saturday Garage", kg
    static let completionIds: Set = [programCompletion, abandoned, adHoc]

    static let loggedSetIds: Set = [
        "cmw6s043w00iuvrt4adtci65z", "cmw6s043w00ivvrt4pfrzbxiy", "cmw6s043w00iwvrt4uc7bxkv5",
        "cmw6s043x00ixvrt4upy40jgx", "cmw6s043x00iyvrt43bt4d3id", "cmw6s043z00izvrt4x7g579eh",
        "cmw6s043z00j0vrt4vxmxp5sb", "cmw6s044100j3vrt4sb70jfon", "cmw6s044600jdvrt4ntppu4u2",
        "cmw6s044600jevrt4at422nyj", "cmw6s044700jfvrt4uhe0besj", "cmw6s044700jgvrt4cq7u4dxv",
    ]

    // Program exercises, Strength Block week 1 day 1.
    static let w1Squat = "cmw6s043c00hnvrt4jkt7lo1o"
    static let w1Bench = "cmw6s043e00hsvrt46i7hp0eo"
    static let w1Row = "cmw6s043g00hwvrt4ma5wnkh5"
    static let w2Row = "cmw6s043q00iivrt4hr2zfodb"

    // Ad-hoc session exercises.
    static let adHocSled = "cmw6s044300j6vrt49c1ltehl"
    static let adHocPullUp = "cmw6s044500javrt40j9ju1b7"

    static let savedWorkout = "cmw6s044800jhvrt47qme3at2"

    // Exercise definitions.
    static let sledPush = "cmw6s043800hgvrt4dfj6k6d2"           // custom
    static let refSquat = "cmw6s043300hbvrt40ipwfq83"
    static let refBench = "cmw6s043500hcvrt4tbk13mxy"
    static let refRow = "cmw6s043600hdvrt4qhnjofrj"             // "Barbell Bent-Over Row": no catalog match
    static let refDeadlift = "cmw6s043800hfvrt4qp54qppo"
    static let refPullUp = "cmw6s043700hevrt431bics6d"

    /// File ref id -> bundled catalog id, matched by name.
    static let toCatalog: [(String, String)] = [
        (refSquat, "cmiz7vjpo0001vr0msv9of7ib"),     // Barbell Back Squat
        (refBench, "cmiz7vjju0000vr0m4b1o6bec"),     // Barbell Bench Press
        (refDeadlift, "cmiz7vjvh0002vr0mtcmhiz70"),  // Conventional Deadlift
        (refPullUp, "cmiz7vkvr0008vr0m7rv3dapc"),    // Pull-Up
    ]

    /// Rows in the fixture, per local table.
    static let counts: [String: Int] = [
        "program": 2, "week": 3, "workout": 4, "exercise": 11, "prescribedSet": 17,
        "workoutCompletion": 3, "loggedSet": 12, "savedWorkout": 1,
    ]
}

/// The local tables an import can touch.
let importTables = ["exerciseDefinition", "program", "week", "workout", "savedWorkout",
                    "workoutCompletion", "exercise", "prescribedSet", "loggedSet"]

/// System exercises in the bundled catalog.
let catalogSize = 312

func iso(_ s: String) -> Date {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.date(from: s)!
}

extension AppDatabase {
    /// Every row of every import table, as text, ordered by id. Equal snapshots mean nothing changed.
    func snapshot() throws -> [String: [String]] {
        try read { db in
            var out: [String: [String]] = [:]
            for t in importTables {
                out[t] = try Row.fetchAll(db, sql: "SELECT * FROM \"\(t)\" ORDER BY id").map(\.description)
            }
            return out
        }
    }

    func counts() throws -> [String: Int] {
        var out: [String: Int] = [:]
        for t in importTables where t != "exerciseDefinition" { out[t] = try count(t) }
        return out
    }

    func ids(_ table: String, where clause: String = "1") throws -> Set<String> {
        try read { Set(try String.fetchAll($0, sql: "SELECT id FROM \"\(table)\" WHERE \(clause)")) }
    }

    func count(_ table: String, where clause: String) throws -> Int {
        try read { try Int.fetchOne($0, sql: "SELECT COUNT(*) FROM \"\(table)\" WHERE \(clause)") ?? -1 }
    }

    func row(_ table: String, _ id: String) throws -> Row? {
        try read { try Row.fetchOne($0, sql: "SELECT * FROM \"\(table)\" WHERE id = ?", arguments: [id]) }
    }

    /// Rows that break a foreign key. Empty after any import.
    func foreignKeyProblems() throws -> [Row] {
        try read { try Row.fetchAll($0, sql: "PRAGMA foreign_key_check") }
    }
}
