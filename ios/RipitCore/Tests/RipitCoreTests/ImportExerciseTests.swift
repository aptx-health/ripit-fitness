// Scenario: "Exercises missing from the phone catalog still import" (features/ios-app/import.feature),
// and "system exercises are referenced by id, not copied".
//
// API used: importExport(data:), workout(_:), systemExerciseIds().
// Rule assumed (work item 158 packet): a definition id the catalog lacks is kept under that same id,
// as a non-system definition named from exerciseRefs.

import Foundation
import GRDB
import Testing
@testable import RipitCore

@Suite("Importing exercises the phone may not know")
struct ImportExerciseTests {
    @Test("Catalog ids: exercises point at the bundled catalog row, which is neither copied nor changed")
    func knownIdsUseCatalog() throws {
        let db = try TempDB().open()
        let before = try db.row("exerciseDefinition", benchPressId)
        try db.importExport(data: ExportFixture.withCatalogIds())
        let squat = try #require(try db.row("exercise", FileIds.w1Squat))
        #expect(squat["exerciseDefinitionId"] as String == "cmiz7vjpo0001vr0msv9of7ib")
        #expect(try db.systemExerciseIds().count == catalogSize)
        #expect(try db.row("exerciseDefinition", benchPressId)?.description == before?.description)
        // The catalog, Sled Push (custom) and the one unknown ref.
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
        #expect(def["isSystem"] as Bool == false)
        let sets = try db.read {
            try Row.fetchAll($0, sql: "SELECT reps, weight FROM loggedSet WHERE exerciseId = ? ORDER BY setNumber", arguments: [FileIds.w1Row])
        }
        #expect(sets.map { $0["reps"] as Int } == [10, 10])
        #expect(sets.map { $0["weight"] as Double } == [135, 135])
        #expect(try db.foreignKeyProblems().isEmpty)
    }

    @Test("Unknown id: refs whose names match catalog exercises still import under their own ids")
    func unknownIdsWithCatalogNames() throws {
        // In the fixture as shipped, every ref id is unknown and four names equal catalog names
        // (normalizedName is UNIQUE locally).
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let pullUp = try #require(try db.workout(FileIds.adHoc).exercises.last)
        #expect(pullUp.id == FileIds.adHocPullUp)
        #expect(pullUp.name == "Pull-Up")
        #expect(pullUp.definitionId == FileIds.refPullUp)
        #expect(pullUp.sets.map(\.reps) == [8, 6])
        let refs = [FileIds.refSquat, FileIds.refBench, FileIds.refRow, FileIds.refDeadlift, FileIds.refPullUp]
        #expect(try db.ids("exerciseDefinition", where: "isSystem = 0") == Set(refs + [FileIds.sledPush]))
        #expect(try db.systemExerciseIds().count == catalogSize)
    }
}
