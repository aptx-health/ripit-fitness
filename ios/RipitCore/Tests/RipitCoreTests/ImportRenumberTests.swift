// Work item 167: a later export where the web deleted a set and renumbered the rest.
// For a session that came from a file, the file is the truth for its file-origin sets; sets logged on
// the phone are never deleted, and move after the file's sets if their numbers collide.

import Foundation
import GRDB
import Testing
@testable import RipitCore

@Suite("Import: sets the web deleted and renumbered")
struct ImportRenumberTests {
    static let deletedSquatSet = "cmw6s043w00iuvrt4adtci65z"   // program session, squat set 1
    static let squatSet2 = "cmw6s043w00ivvrt4pfrzbxiy"
    static let squatSet3 = "cmw6s043w00iwvrt4uc7bxkv5"
    static let sledSets = ["cmw6s044600jdvrt4ntppu4u2", "cmw6s044600jevrt4at422nyj"]

    /// The fixture after the web deleted squat set 1 and renumbered sets 2 and 3 to 1 and 2.
    static func renumbered() throws -> Data {
        try ExportFixture.editing { file in
            for case let c as NSMutableDictionary in file["workoutCompletions"] as! NSMutableArray
            where c["id"] as? String == FileIds.programCompletion {
                let sets = c["loggedSets"] as! NSMutableArray
                for case let s as NSMutableDictionary in sets where s["exerciseId"] as? String == FileIds.w1Squat {
                    s["setNumber"] = (s["setNumber"] as! Int) - 1
                }
                sets.remove(sets.first { ($0 as! NSDictionary)["id"] as? String == deletedSquatSet }!)
            }
        }
    }

    /// The fixture with one more Sled Push set (number 3) in the ad-hoc session.
    static func withThirdSledSet() throws -> Data {
        try ExportFixture.editing { file in
            for case let c as NSMutableDictionary in file["workoutCompletions"] as! NSMutableArray
            where c["id"] as? String == FileIds.adHoc {
                let sets = c["loggedSets"] as! NSMutableArray
                let extra = (sets[1] as! NSDictionary).mutableCopy() as! NSMutableDictionary
                extra["id"] = "file-sled-3"
                extra["setNumber"] = 3
                sets.insert(extra, at: 2)
            }
        }
    }

    func squatSets(_ db: AppDatabase) throws -> [Row] {
        try db.read {
            try Row.fetchAll($0, sql: """
                SELECT id, setNumber FROM loggedSet WHERE completionId = ? AND exerciseId = ? ORDER BY setNumber
                """, arguments: [FileIds.programCompletion, FileIds.w1Squat])
        }
    }

    func sledSets(_ db: AppDatabase) throws -> [Row] {
        try db.read {
            try Row.fetchAll($0, sql: "SELECT id, setNumber FROM loggedSet WHERE exerciseId = ? ORDER BY setNumber",
                             arguments: [FileIds.adHocSled])
        }
    }

    @Test("Renumbered: the deleted set is gone, the rest are numbered 1..n, and the report says removed 1")
    func deletedAndRenumbered() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let report = try db.importReport(data: Self.renumbered())
        let rows = try squatSets(db)
        #expect(rows.map { $0["id"] as String } == [Self.squatSet2, Self.squatSet3])
        #expect(rows.map { $0["setNumber"] as Int } == [1, 2])
        #expect(try db.row("loggedSet", Self.deletedSquatSet) == nil)
        #expect(report.removedSets == 1)
        #expect(report.updated == 1)
        #expect(try db.history().last?.setCount == 6)
        #expect(try db.foreignKeyProblems().isEmpty)
    }

    @Test("Renumbered: importing the same renumbered file again changes nothing")
    func renumberedTwice() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        try db.importExport(data: Self.renumbered())
        let once = try db.snapshot()
        let again = try db.importReport(data: Self.renumbered())
        #expect(try db.snapshot() == once)
        #expect(again.removedSets == 0 && again.updated == 0)
    }

    @Test("Phone set: a set logged on the phone in an imported session survives a file that deletes sets")
    func phoneSetSurvivesDeletion() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let phoneSet = try db.logSet(exerciseId: FileIds.adHocSled, reps: 1, weight: 110, unit: "kg")
        // The later file drops sled set 2.
        let later = try ExportFixture.editing { file in
            for case let c as NSMutableDictionary in file["workoutCompletions"] as! NSMutableArray
            where c["id"] as? String == FileIds.adHoc {
                let sets = c["loggedSets"] as! NSMutableArray
                sets.remove(sets.first { ($0 as! NSDictionary)["id"] as? String == Self.sledSets[1] }!)
            }
        }
        let report = try db.importReport(data: later)
        #expect(try sledSets(db).map { $0["id"] as String } == [Self.sledSets[0], phoneSet])
        #expect(report.removedSets == 1)
    }

    @Test("Phone set: a phone set on the number a file set now takes keeps both, the phone one after")
    func phoneSetCollision() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let phoneSet = try db.logSet(exerciseId: FileIds.adHocSled, reps: 1, weight: 110, unit: "kg")   // number 3
        try db.importExport(data: Self.withThirdSledSet())
        let rows = try sledSets(db)
        #expect(rows.map { $0["id"] as String } == Self.sledSets + ["file-sled-3", phoneSet])
        #expect(rows.map { $0["setNumber"] as Int } == [1, 2, 3, 4])
    }
}
