// Scenario: "Importing the same file twice does not duplicate anything" (features/ios-app/import.feature).
//
// API used: importExport(data:), makeWorkout (slice 1), history().

import Foundation
import Testing
@testable import RipitCore

@Suite("Importing the same file twice")
struct ImportRepeatTests {
    @Test("Idempotent: a second import of the same file changes no row")
    func sameFileTwice() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let once = try db.snapshot()
        try db.importExport(data: ExportFixture.data())
        #expect(try db.snapshot() == once)
        #expect(try db.counts() == FileIds.counts)
    }

    @Test("Idempotent: a re-import keeps a workout logged on the phone in between")
    func keepsLocalWork() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let local = try db.makeWorkout(start: iso("2026-11-01T15:00:00.000Z"), finish: iso("2026-11-01T16:00:00.000Z"),
                                       [(benchPressId, [(5, 135), (5, 135)])])
        try db.importExport(data: ExportFixture.data())
        #expect(try db.history().map(\.id) == [local, FileIds.adHoc, FileIds.programCompletion])
        #expect(try db.count("loggedSet") == 14)
    }

    @Test("Idempotent: a later export of the same account adds only its new session")
    func laterExportAddsOnlyNew() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let later = try ExportFixture.editing { file in
            let completions = file["workoutCompletions"] as! NSMutableArray
            completions.add([
                "id": "later-session-1", "workoutId": NSNull(), "savedWorkoutId": NSNull(), "userId": "test-user-pyq031e3h5i",
                "completedAt": "2026-11-02T13:40:00.000Z", "startedAt": "2026-11-02T13:00:00.000Z",
                "status": "completed", "notes": NSNull(), "isArchived": false, "cycleNumber": 1, "isAdHoc": true,
                "name": "Later", "durationSeconds": 2400, "sessionRpe": NSNull(),
                "exercises": [[
                    "id": "later-ex-1", "name": "Sled Push", "exerciseDefinitionId": FileIds.sledPush, "order": 1,
                    "exerciseGroup": NSNull(), "workoutId": NSNull(), "notes": NSNull(), "userId": "test-user-pyq031e3h5i",
                    "isOneOff": true, "workoutCompletionId": "later-session-1", "prescribedSets": [],
                ]],
                "loggedSets": [[
                    "id": "later-set-1", "setNumber": 1, "reps": 1, "weight": 120, "weightUnit": "kg", "rpe": NSNull(),
                    "rir": NSNull(), "isWarmup": false, "exerciseId": "later-ex-1", "completionId": "later-session-1",
                    "createdAt": "2026-11-02T13:40:00.000Z", "userId": "test-user-pyq031e3h5i",
                ]],
            ] as NSDictionary)
        }
        try db.importExport(data: later)
        var expected = FileIds.counts
        expected["workoutCompletion"]! += 1
        expected["exercise"]! += 1
        expected["loggedSet"]! += 1
        #expect(try db.counts() == expected)
        #expect(try db.history().first?.id == "later-session-1")
    }
}
