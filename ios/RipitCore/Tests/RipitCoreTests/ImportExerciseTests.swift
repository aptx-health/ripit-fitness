// Scenario: "Exercises missing from the phone catalog still import" (features/ios-app/import.feature),
// and "system exercises are referenced by id, not copied".
//
// API used: importExport(data:), workout(_:), systemExerciseIds().
// Rule (lead, work item 158): an exercise ref resolves
// 1. by id against the catalog, then
// 2. by normalized name against the catalog (normalizeExerciseName in lib/validators/exercise-definition.ts:
//    lowercase, trim, drop all but a-z 0-9 whitespace and '-', collapse spaces), mapping to the catalog row,
// 3. else it is kept under its own id, named from exerciseRefs, as a built-in (system) definition:
//    a web built-in newer than the phone's catalog (lead, work item 193). Only the export's own
//    customExercises are the person's (not system).

import Foundation
import GRDB
import Testing
@testable import RipitCore

@Suite("Importing exercises the phone may not know")
struct ImportExerciseTests {
    let catalog = Dictionary(uniqueKeysWithValues: FileIds.toCatalog)

    @Test("Catalog ids: exercises point at the bundled catalog row, which is neither copied nor changed")
    func knownIdsUseCatalog() throws {
        let db = try TempDB().open()
        let before = try db.row("exerciseDefinition", benchPressId)
        try db.importExport(data: ExportFixture.withCatalogIds())
        let squat = try #require(try db.row("exercise", FileIds.w1Squat))
        #expect(squat["exerciseDefinitionId"] as String == "cmiz7vjpo0001vr0msv9of7ib")
        #expect(try db.systemExerciseIds().count == catalogSize + 1, "the catalog plus the unknown ref")
        #expect(try db.row("exerciseDefinition", benchPressId)?.description == before?.description)
        // The catalog, Sled Push (custom) and the one unknown ref (built-in, not copied from the catalog).
        #expect(try db.count("exerciseDefinition") == catalogSize + 2)
    }

    @Test("Unknown id: the exercise keeps its name and its logged sets")
    func unknownIdKept() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.withCatalogIds())
        for id in [FileIds.w1Row, FileIds.w2Row] {
            let ex = try #require(try db.row("exercise", id))
            #expect(ex["name"] as String == "Barbell Bent-Over Row")
            #expect(ex["exerciseDefinitionId"] as String == FileIds.refRow)
        }
        let def = try #require(try db.row("exerciseDefinition", FileIds.refRow))
        #expect(def["name"] as String == "Barbell Bent-Over Row")
        #expect(def["isSystem"] as Bool == true, "a web built-in the phone's catalog doesn't have yet")
        let sets = try db.read {
            try Row.fetchAll($0, sql: "SELECT reps, weight FROM loggedSet WHERE exerciseId = ? ORDER BY setNumber", arguments: [FileIds.w1Row])
        }
        #expect(sets.map { $0["reps"] as Int } == [10, 10])
        #expect(sets.map { $0["weight"] as Double } == [135, 135])
        #expect(try db.foreignKeyProblems().isEmpty)
    }

    @Test("Name match: unknown ids whose names match the catalog map to the catalog row")
    func unknownIdsMatchCatalogByName() throws {
        // In the fixture as shipped every ref id is unknown; four names equal catalog names.
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let pullUp = try #require(try db.workout(FileIds.adHoc).exercises.last)
        #expect(pullUp.id == FileIds.adHocPullUp)
        #expect(pullUp.name == "Pull-Up")
        #expect(pullUp.definitionId == catalog[FileIds.refPullUp])
        #expect(pullUp.sets.map(\.reps) == [8, 6])
        let squat = try #require(try db.row("exercise", FileIds.w1Squat))
        #expect(squat["exerciseDefinitionId"] as String? == catalog[FileIds.refSquat])
        // Only Sled Push (the export's custom) is non-system; the Bent-Over Row (no catalog name) is built-in.
        #expect(try db.ids("exerciseDefinition", where: "isSystem = 0") == [FileIds.sledPush])
        #expect(try db.systemExerciseIds().count == catalogSize + 1)
        #expect(try db.foreignKeyProblems().isEmpty)
    }

    @Test("Name match: the ref name is normalized like the web (case, spaces, punctuation)")
    func nameMatchNormalizes() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.editing { file in
            for case let ref as NSMutableDictionary in file["exerciseRefs"] as! NSMutableArray
            where ref["id"] as? String == FileIds.refDeadlift {
                ref["name"] = "  CONVENTIONAL   Deadlift! "
            }
        })
        let deadlift = try #require(try db.row("exercise", "cmw6s043i00i2vrt45yt0676i"))
        #expect(deadlift["exerciseDefinitionId"] as String? == catalog[FileIds.refDeadlift])
        #expect(deadlift["name"] as String == "Conventional Deadlift")
        #expect(try db.row("exerciseDefinition", FileIds.refDeadlift) == nil)
    }

    @Test("Unknown id: a ref with a name the catalog doesn't have stays its own built-in row")
    func uniqueNameKeptAsOwnRow() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.editing { file in
            (file["exerciseRefs"] as! NSMutableArray).add(["id": "ref-landmine", "name": "Landmine Press"] as NSDictionary)
            let adHoc = (file["workoutCompletions"] as! NSMutableArray)
                .first { ($0 as! NSDictionary)["id"] as? String == FileIds.adHoc } as! NSMutableDictionary
            (adHoc["exercises"] as! NSMutableArray).add([
                "id": "ex-landmine", "name": "Landmine Press", "exerciseDefinitionId": "ref-landmine", "order": 3,
                "exerciseGroup": NSNull(), "workoutId": NSNull(), "notes": NSNull(), "userId": "test-user-pyq031e3h5i",
                "isOneOff": true, "workoutCompletionId": FileIds.adHoc, "prescribedSets": [],
            ] as NSDictionary)
            (adHoc["loggedSets"] as! NSMutableArray).add([
                "id": "set-landmine", "setNumber": 1, "reps": 10, "weight": 25, "weightUnit": "kg", "rpe": NSNull(),
                "rir": NSNull(), "isWarmup": false, "exerciseId": "ex-landmine", "completionId": FileIds.adHoc,
                "createdAt": "2026-10-11T16:45:00.000Z", "userId": "test-user-pyq031e3h5i",
            ] as NSDictionary)
        })
        let def = try #require(try db.row("exerciseDefinition", "ref-landmine"))
        #expect(def["name"] as String == "Landmine Press")
        #expect(def["isSystem"] as Bool == true)
        let ex = try #require(try db.workout(FileIds.adHoc).exercises.last)
        #expect(ex.definitionId == "ref-landmine")
        #expect(ex.sets.map(\.weight) == [25])
        #expect(ex.sets.map(\.weightUnit) == ["kg"])
    }
}
