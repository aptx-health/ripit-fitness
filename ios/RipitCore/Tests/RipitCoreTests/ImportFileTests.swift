// Scenario: "Import a file on the phone" (features/ios-app/import.feature).
//
// API used: importExport(data:), history(), workout(_:), plus raw reads of the local tables.
// Labels in test names: the rule or feared bug each test targets.

import Foundation
import GRDB
import Testing
@testable import RipitCore

@Suite("Importing a ripit-export file")
struct ImportFileTests {
    @Test("Import: every row of the file lands in its table, and the summary counts the file")
    func countsPerTable() throws {
        let db = try TempDB().open()
        let summary = try db.importExport(data: ExportFixture.data())
        #expect(summary == ImportSummary(programs: 2, workouts: 3, savedWorkouts: 1, customExercises: 1, loggedSets: 12))
        #expect(try db.counts() == FileIds.counts)
        #expect(try db.foreignKeyProblems().isEmpty)
    }

    @Test("Stable ids: programs, sessions and logged sets keep the file's ids")
    func keepsIds() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        #expect(try db.ids("program") == FileIds.programIds)
        #expect(try db.ids("workoutCompletion") == FileIds.completionIds)
        #expect(try db.ids("loggedSet") == FileIds.loggedSetIds)
    }

    @Test("Active program: the active one stays active, the archived one stays archived and inactive")
    func activeProgramKept() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        #expect(try db.ids("program", where: "isActive = 1") == [FileIds.strengthBlock])
        let old = try #require(try db.row("program", FileIds.oldHypertrophy))
        #expect(old["isActive"] as Bool == false)
        #expect(old["isArchived"] as Bool == true)
        #expect(old["archivedAt"] as Date? == iso("2026-09-30T12:00:00.000Z"))
        #expect(old["goals"] as String == #"["strength"]"#)
    }

    @Test("History: the two finished sessions show, newest first, with their dates and set counts")
    func historyShowsImported() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let history = try db.history()
        #expect(history.map(\.id) == [FileIds.adHoc, FileIds.programCompletion])
        #expect(history.map(\.completedAt) == [iso("2026-10-11T16:45:00.000Z"), iso("2026-10-06T14:05:00.000Z")])
        #expect(history.map(\.setCount) == [4, 7])
        #expect(history.first?.name == "Saturday Garage")
        let abandoned = try #require(try db.row("workoutCompletion", FileIds.abandoned))
        #expect(abandoned["status"] as String == "abandoned")
        #expect(abandoned["cycleNumber"] as Int == 2)
    }

    @Test("Dates: an imported session sorts by real time against one logged on the phone the same day")
    func datesSortWithLocalOnes() throws {
        // The imported ad-hoc session finished 16:45Z; this local one finishes 17:00Z, so it's newer.
        // Storing the file's ISO strings verbatim would sort "…T16:45…Z" after "… 17:00…".
        let db = try TempDB().open()
        let local = try db.makeWorkout(start: iso("2026-10-11T16:30:00.000Z"), finish: iso("2026-10-11T17:00:00.000Z"),
                                       [(benchPressId, [(5, 135)])])
        try db.importExport(data: ExportFixture.data())
        #expect(try db.history().map(\.id) == [local, FileIds.adHoc, FileIds.programCompletion])
        let started = try db.read {
            try Date.fetchOne($0, sql: "SELECT startedAt FROM workoutCompletion WHERE id = ?", arguments: [FileIds.programCompletion])
        }
        #expect(started == iso("2026-10-06T13:00:00.000Z"))
    }

    @Test("Weight unit: logged weights keep their number and unit, kg not converted")
    func weightsKeepUnit() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let detail = try db.workout(FileIds.adHoc)
        #expect(detail.exercises.map(\.name) == ["Sled Push", "Pull-Up"])
        #expect(detail.exercises.map { $0.sets.map(\.weight) } == [[80, 100], [0, 10]])
        #expect(detail.exercises.flatMap { $0.sets.map(\.weightUnit) } == ["kg", "kg", "kg", "kg"])
        let squat = try db.read {
            try Row.fetchAll($0, sql: "SELECT weight, weightUnit FROM loggedSet WHERE exerciseId = ? ORDER BY setNumber",
                             arguments: [FileIds.w1Squat])
        }
        #expect(squat.map { $0["weight"] as Double } == [135, 225, 225])
        #expect(squat.map { $0["weightUnit"] as String } == ["lbs", "lbs", "lbs"])
    }

    @Test("Weight unit: a fractional weight keeps its fraction")
    func fractionalWeight() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.replacing([(#""weight": 80,"#, #""weight": 102.5,"#)]))
        let sled = try #require(try db.workout(FileIds.adHoc).exercises.first)
        #expect(sled.sets.map(\.weight) == [102.5, 100])
    }

    @Test("Plan vs logged: prescribed sets keep free-text weights; logged sets point at the program's exercises")
    func planAndLoggedApart() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let plan = try db.read {
            try Row.fetchAll($0, sql: "SELECT exerciseId, reps, weight, rir, isWarmup FROM prescribedSet WHERE exerciseId IN (?, ?, ?) ORDER BY exerciseId, setNumber",
                             arguments: [FileIds.w1Squat, FileIds.w1Bench, FileIds.w1Row])
        }
        #expect(plan.map { $0["weight"] as String? } == ["135lbs", "225lbs", "225lbs", "65%", "65%", "RPE 8", "RPE 8"])
        #expect(plan.map { $0["isWarmup"] as Bool } == [true, false, false, false, false, false, false])
        #expect(plan.map { $0["rir"] as Int? } == [nil, 2, 2, nil, nil, nil, nil])
        // The program session's file entry has no exercises of its own: its sets hang off the plan's.
        #expect(try db.count("exercise", where: "workoutCompletionId = '\(FileIds.programCompletion)'") == 0)
        #expect(try db.ids("loggedSet", where: "completionId = '\(FileIds.programCompletion)' AND exerciseId = '\(FileIds.w1Squat)'").count == 3)
        // The logged 3rd squat set was rir 1; the plan said rir 2. Neither overwrote the other.
        let logged = try #require(try db.row("loggedSet", "cmw6s043w00iwvrt4uc7bxkv5"))
        #expect(logged["rir"] as Int? == 1)
    }

    @Test("Plan vs logged: ad-hoc exercises belong to their session and keep their own prescribed sets")
    func adHocExercises() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let sled = try #require(try db.row("exercise", FileIds.adHocSled))
        #expect(sled["workoutCompletionId"] as String? == FileIds.adHoc)
        #expect(sled["workoutId"] as String? == nil)
        #expect(sled["isOneOff"] as Bool == true)
        #expect(try db.count("prescribedSet", where: "exerciseId = '\(FileIds.adHocSled)'") == 2)
        #expect(try db.count("loggedSet", where: "exerciseId = '\(FileIds.adHocSled)'") == 2)
    }

    @Test("Supersets: exercises sharing a group in the file share it on the phone")
    func supersetsKept() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let grouped = try db.ids("exercise", where: "exerciseGroup = 'A'")
        #expect(grouped == [FileIds.w1Bench, FileIds.w1Row, "cmw6s043p00ifvrt4jzzgruop", FileIds.w2Row])
    }

    @Test("Custom exercises and saved workouts arrive whole")
    func customAndSaved() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.data())
        let sled = try #require(try db.row("exerciseDefinition", FileIds.sledPush))
        #expect(sled["name"] as String == "Sled Push")
        #expect(sled["isSystem"] as Bool == false)
        #expect(sled["instructions"] as String? == "Drive the sled 20 m, low hips.")
        #expect(sled["equipment"] as String == #"["sled"]"#)

        let saved = try #require(try db.row("savedWorkout", FileIds.savedWorkout))
        #expect(saved["name"] as String == "Garage Day")
        #expect(saved["sourceCompletionId"] as String? == FileIds.adHoc)
        #expect(saved["exerciseCount"] as Int == 2)
        let snapshot = try JSONSerialization.jsonObject(with: Data((saved["workoutData"] as String).utf8)) as? [[String: Any]]
        #expect(snapshot?.compactMap { $0["exerciseDefinitionId"] as? String } == [FileIds.sledPush, FileIds.refPullUp])
        #expect(snapshot?.last?["notes"] as? String == "Add load if 8 is easy")
    }

    @Test("Unknown keys: keys a v1 reader doesn't know are ignored")
    func ignoresUnknownKeys() throws {
        let db = try TempDB().open()
        try db.importExport(data: ExportFixture.replacing([
            (#""version": 1,"#, #""version": 1, "futureSection": [{"a": 1}],"#),
            (#""sessionRpe": 7,"#, #""sessionRpe": 7, "heartRateAvg": 141,"#),
        ]))
        #expect(try db.counts() == FileIds.counts)
    }
}
