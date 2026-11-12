// Import fixes after review 162 (work item 164): a later export updates rows from a file, phone rows
// and phone edits are kept, imported drafts follow the 24-hour rule, archived drafts are never offered,
// and the report counts what changed. Plus the 164 addendum: supersets of one, and empty finishes.

import Foundation
import GRDB
import Testing
@testable import RipitCore

extension AppDatabase {
    /// One column of one row, as text (nil when the row or value is missing).
    func text(_ table: String, _ id: String, _ column: String) throws -> String? {
        try read { try String.fetchOne($0, sql: "SELECT \"\(column)\" FROM \"\(table)\" WHERE id = ?", arguments: [id]) }
    }
}

/// The fixture as a later export: the abandoned session was finished on the web with one more set,
/// and the active program was renamed.
func laterExport() throws -> Data {
    try ExportFixture.editing { file in
        for case let program as NSMutableDictionary in file["programs"] as! NSMutableArray
        where program["id"] as? String == FileIds.strengthBlock {
            program["name"] = "Strength Block (v2)"
        }
        for case let c as NSMutableDictionary in file["workoutCompletions"] as! NSMutableArray
        where c["id"] as? String == FileIds.abandoned {
            c["status"] = "completed"
            let sets = c["loggedSets"] as! NSMutableArray
            let extra = (sets[0] as! NSDictionary).mutableCopy() as! NSMutableDictionary
            extra["id"] = "later-extra-set"
            extra["setNumber"] = 99
            sets.add(extra)
        }
    }
}

/// The fixture plus one draft ad-hoc session that started at `start` with one set 5 minutes later.
func withDraft(start: String) throws -> Data {
    try ExportFixture.editing { file in
        (file["workoutCompletions"] as! NSMutableArray).add([
            "id": "draft-1", "workoutId": NSNull(), "savedWorkoutId": NSNull(), "userId": "u",
            "completedAt": start, "startedAt": start, "status": "draft", "notes": NSNull(), "isArchived": false,
            "cycleNumber": 1, "isAdHoc": true, "name": NSNull(), "durationSeconds": NSNull(), "sessionRpe": NSNull(),
            "exercises": [[
                "id": "draft-ex-1", "name": "Sled Push", "exerciseDefinitionId": FileIds.sledPush, "order": 1,
                "exerciseGroup": NSNull(), "workoutId": NSNull(), "notes": NSNull(), "userId": "u",
                "isOneOff": true, "workoutCompletionId": "draft-1", "prescribedSets": [],
            ]],
            "loggedSets": [[
                "id": "draft-set-1", "setNumber": 1, "reps": 1, "weight": 90, "weightUnit": "kg", "rpe": NSNull(),
                "rir": NSNull(), "isWarmup": false, "exerciseId": "draft-ex-1", "completionId": "draft-1",
                "createdAt": start, "userId": "u",
            ]],
        ] as NSDictionary)
    }
}

@Suite("Import fixes: a later export")
struct LaterExportTests {
    @Test("Later export: a changed status and a changed name are updated, and the new set is added")
    func updatesStatusAndName() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        try db.importExport(data: laterExport())
        #expect(try db.text("program", FileIds.strengthBlock, "name") == "Strength Block (v2)")
        #expect(try db.text("workoutCompletion", FileIds.abandoned, "status") == "completed")
        #expect(try db.history().map(\.id).contains(FileIds.abandoned))
        #expect(try db.count("loggedSet") == 13)
        #expect(try db.ids("program", where: "isActive = 1") == [FileIds.strengthBlock])
        #expect(try db.foreignKeyProblems().isEmpty)
    }

    @Test("Phone edits: a row the web didn't change keeps the phone's edit on re-import")
    func phoneEditKept() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        // A restart on the phone archives the program's sessions.
        try db.dbQueue.write { try $0.execute(sql: "UPDATE workoutCompletion SET isArchived = 1 WHERE id = ?",
                                              arguments: [FileIds.programCompletion]) }
        try db.importExport(data: laterExport())
        #expect(try db.text("workoutCompletion", FileIds.programCompletion, "isArchived") == "1")
    }

    @Test("Phone rows: a row created on the phone is never touched, even if a file names its id")
    func phoneRowUntouched() throws {
        let db = try TempDB().open()
        let local = try db.makeWorkout(start: iso("2026-11-01T15:00:00.000Z"), finish: iso("2026-11-01T16:00:00.000Z"),
                                       [(benchPressId, [(5, 135)])])
        let before = try db.row("workoutCompletion", local).map { $0.description }
        var text = try ExportFixture.text()
        text = text.replacingOccurrences(of: FileIds.adHoc, with: local)
        try db.importExport(data: Data(text.utf8))
        #expect(try db.row("workoutCompletion", local).map { $0.description } == before)
        #expect(try db.text("workoutCompletion", local, "importHash") == nil)
    }
}

@Suite("Import fixes: drafts")
struct ImportedDraftTests {
    @Test("Stale draft: a web draft idle more than 24 hours before the export is stored as abandoned")
    func staleDraftAbandoned() throws {
        let db = try TempDB().open()
        // The fixture was exported 2026-11-07T18:04Z.
        try db.importExport(data: withDraft(start: "2026-10-20T18:00:00.000Z"))
        #expect(try db.inProgressWorkout() == nil)
        #expect(try db.text("workoutCompletion", "draft-1", "status") == "abandoned")
        #expect(try db.count("loggedSet", where: "completionId = 'draft-1'") == 1, "its sets are kept")
    }

    @Test("Recent draft: a web draft active within 24 hours of the export is resumable")
    func recentDraftResumable() throws {
        let db = try TempDB().open()
        try db.importExport(data: withDraft(start: "2026-11-07T17:00:00.000Z"))
        #expect(try db.inProgressWorkout()?.id == "draft-1")
    }

    @Test("Second draft: when the phone already has an open draft, the web draft comes in abandoned")
    func phoneDraftWins() throws {
        let db = try TempDB().open()
        let local = try db.startWorkout(at: iso("2026-11-07T17:30:00.000Z"))
        try db.importExport(data: withDraft(start: "2026-11-07T17:45:00.000Z"))
        #expect(try db.inProgressWorkout()?.id == local)
        #expect(try db.text("workoutCompletion", "draft-1", "status") == "abandoned")
    }

    @Test("Archived draft: an archived open session is never offered for resume")
    func archivedDraftNotOffered() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: iso("2026-11-07T17:30:00.000Z"))
        try db.dbQueue.write { try $0.execute(sql: "UPDATE workoutCompletion SET isArchived = 1 WHERE id = ?", arguments: [w]) }
        #expect(try db.inProgressWorkout() == nil)
    }
}

@Suite("Import fixes: the report counts what changed")
struct ImportReportTests {
    func added(_ r: ImportReport) -> [Int] {
        [r.addedPrograms, r.addedWorkouts, r.addedSets, r.addedSavedWorkouts, r.addedCustomExercises]
    }

    @Test("Report: first import adds everything, a repeat adds nothing, a later export updates two")
    func counts() throws {
        let db = try TempDB().open()
        let first = try db.importReport(data: ExportFixture.data())
        #expect(added(first) == [2, 3, 12, 1, 1])
        #expect(first.updated == 0 && first.unchanged == 0)

        let again = try db.importReport(data: ExportFixture.data())
        #expect(added(again) == [0, 0, 0, 0, 0])
        #expect(again.updated == 0)
        #expect(again.unchanged == 6, "2 programs, 3 workouts, 1 saved workout")
        #expect(again.file == first.file)

        let later = try db.importReport(data: laterExport())
        #expect(added(later) == [0, 0, 1, 0, 0])
        #expect(later.updated == 2, "the renamed program and the finished session")
        #expect(later.unchanged == 4)
    }
}

@Suite("Addendum: supersets of one and empty finishes")
struct SupersetOfOneAndEmptyFinishTests {
    let start = Clock.at(2026, 11, 7, 17)
    let rowId = "cmiz7vk1i0003vr0mqucd1f52"
    let squatId = "cmiz7vjpo0001vr0msv9of7ib"

    @Test("Remove: a superset left with one exercise drops its group")
    func loneMemberUngrouped() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: start)
        let bench = try db.addExercise(definitionId: benchPressId, to: w)
        let row = try db.addExercise(definitionId: rowId, to: w)
        try db.groupAsSuperset([bench, row])
        try db.removeExercise(row)
        #expect(try db.workout(w).exercises.map(\.group) == [nil])
    }

    @Test("Remove: a superset of three keeps its group for the other two")
    func threeKeepsGroup() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: start)
        let ids = try [benchPressId, rowId, squatId].map { try db.addExercise(definitionId: $0, to: w) }
        try db.groupAsSuperset(ids)
        try db.removeExercise(ids[2])
        let groups = try db.workout(w).exercises.map(\.group)
        #expect(groups.count == 2 && groups[0] != nil && groups[0] == groups[1])
    }

    @Test("Finish: a workout with no exercises and no sets is refused and stays open")
    func emptyRefused() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: start)
        #expect(throws: RipitCoreError.emptyWorkout) { try db.finishWorkout(w, at: start.addingTimeInterval(60)) }
        #expect(try db.inProgressWorkout()?.id == w)
        #expect(try db.history().isEmpty)
    }

    @Test("Finish: a workout with exercises but no sets yet is allowed (the slice 1 superset test relies on it)")
    func exercisesWithoutSetsAllowed() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: start)
        _ = try db.addExercise(definitionId: benchPressId, to: w)
        try db.finishWorkout(w, at: start.addingTimeInterval(60))
        #expect(try db.history().map(\.id) == [w])
    }
}
