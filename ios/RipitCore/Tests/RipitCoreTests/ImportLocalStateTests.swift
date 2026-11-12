// Scenario: "Import a file on the phone" (features/ios-app/import.feature), where the file meets
// state on the phone. Rules from the lead (work item 158):
// - An imported draft (in-progress) session becomes resumable, with completedAt NULL like local drafts.
// - The file's active program stays active only when the phone has no active program;
//   otherwise it comes in inactive.
//
// API used: importExport(data:), inProgressWorkout(), history().

import Foundation
import GRDB
import Testing
@testable import RipitCore

@Suite("Importing into a phone that already has state")
struct ImportLocalStateTests {
    /// The fixture plus a draft ad-hoc session. The web sets completedAt when a session is created.
    func withDraft() throws -> Data {
        try ExportFixture.editing { file in
            (file["workoutCompletions"] as! NSMutableArray).add([
                "id": "draft-1", "workoutId": NSNull(), "savedWorkoutId": NSNull(), "userId": "test-user-pyq031e3h5i",
                "completedAt": "2026-11-06T18:00:00.000Z", "startedAt": "2026-11-06T18:00:00.000Z",
                "status": "draft", "notes": NSNull(), "isArchived": false, "cycleNumber": 1, "isAdHoc": true,
                "name": NSNull(), "durationSeconds": NSNull(), "sessionRpe": NSNull(),
                "exercises": [[
                    "id": "draft-ex-1", "name": "Sled Push", "exerciseDefinitionId": FileIds.sledPush, "order": 1,
                    "exerciseGroup": NSNull(), "workoutId": NSNull(), "notes": NSNull(), "userId": "test-user-pyq031e3h5i",
                    "isOneOff": true, "workoutCompletionId": "draft-1", "prescribedSets": [],
                ]],
                "loggedSets": [[
                    "id": "draft-set-1", "setNumber": 1, "reps": 1, "weight": 90, "weightUnit": "kg", "rpe": NSNull(),
                    "rir": NSNull(), "isWarmup": false, "exerciseId": "draft-ex-1", "completionId": "draft-1",
                    "createdAt": "2026-11-06T18:05:00.000Z", "userId": "test-user-pyq031e3h5i",
                ]],
            ] as NSDictionary)
        }
    }

    /// A valid v1 file holding one empty program, built from the fixture's own program row.
    func oneProgram(id: String, active: Bool) throws -> Data {
        try ExportFixture.editing { file in
            let base = (file["programs"] as! NSArray)[0] as! NSDictionary
            let program = base.mutableCopy() as! NSMutableDictionary
            program["id"] = id
            program["name"] = "Phone Program"
            program["isActive"] = active
            program["isArchived"] = false
            program["archivedAt"] = NSNull()
            program["weeks"] = NSMutableArray()
            file["programs"] = NSMutableArray(array: [program])
            for key in ["customExercises", "exerciseRefs", "workoutCompletions", "savedWorkouts", "pinnedExercises"] {
                file[key] = NSMutableArray()
            }
        }
    }

    @Test("Draft: an imported in-progress session is offered for resume, with no completedAt")
    func draftResumable() throws {
        let db = try TempDB().open()
        try db.importExport(data: withDraft())
        let draft = try #require(try db.inProgressWorkout())
        #expect(draft.id == "draft-1")
        #expect(draft.completedAt == nil)
        #expect(draft.startedAt == iso("2026-11-06T18:00:00.000Z"))
        #expect(draft.exercises.map { $0.sets.map(\.weight) } == [[90]])
        let stored = try db.read {
            try Row.fetchOne($0, sql: "SELECT status, completedAt FROM workoutCompletion WHERE id = 'draft-1'")
        }
        #expect(stored?["status"] as String? == "draft")
        #expect(stored?["completedAt"] as Date? == nil)
        #expect(try db.history().map(\.id) == [FileIds.adHoc, FileIds.programCompletion])
    }

    @Test("Active program: when the phone already has one active, the imported one comes in inactive")
    func phoneActiveWins() throws {
        let db = try TempDB().open()
        try db.importExport(data: oneProgram(id: "phone-prog", active: true))
        try db.importExport(data: ExportFixture.data())
        #expect(try db.ids("program", where: "isActive = 1") == ["phone-prog"])
        #expect(try db.ids("program") == FileIds.programIds.union(["phone-prog"]))
    }

    @Test("Active program: a phone with programs but none active takes the file's active one")
    func noPhoneActiveFileWins() throws {
        let db = try TempDB().open()
        try db.importExport(data: oneProgram(id: "phone-prog", active: false))
        try db.importExport(data: ExportFixture.data())
        #expect(try db.ids("program", where: "isActive = 1") == [FileIds.strengthBlock])
    }
}
