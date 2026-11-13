// Work item 182: an open workout started from a saved one, or repeated, carries its name, so the
// logger, Training's in-progress card and the Resume/Discard prompt can show it. A plain ad-hoc
// workout and a program session have none (the app keeps its own wording for those).
//
// API used: WorkoutDetail.name via inProgressWorkout() and workout(_:); slice 6's
// saveWorkout(fromCompletion:name:notes:at:), renameSavedWorkout(_:to:), startSavedWorkout(_:at:),
// repeatWorkout(_:at:); slice 3's startProgramWorkout(_:at:).

import Foundation
import Testing
@testable import RipitCore

@Suite("Workout name while open")
struct WorkoutNameTests {
    let start = Clock.at(2026, 11, 7, 9)

    private func finished(_ db: AppDatabase) throws -> String {
        try db.makeWorkout(start: start, finish: start.addingTimeInterval(600), [(benchPressId, [(5, 185)])])
    }

    @Test("A started saved workout is open under the saved workout's name, after relaunch too")
    func startedSavedWorkout() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let saved = try db.saveWorkout(fromCompletion: try finished(db), name: "Garage Day", notes: nil, at: start)
        try db.renameSavedWorkout(saved, to: "Garage Day Renamed")
        let w = try db.startSavedWorkout(saved, at: start.addingTimeInterval(3600))
        #expect(try db.workout(w).name == "Garage Day Renamed")
        #expect(try tmp.open().inProgressWorkout()?.name == "Garage Day Renamed")
    }

    @Test("A repeated workout is open under the finished workout's name, or \"Open Workout\" when it had none")
    func repeatedWorkout() throws {
        let db = try TempDB().open()
        let w = try db.repeatWorkout(try finished(db), at: start.addingTimeInterval(3600))
        #expect(try db.inProgressWorkout()?.name == "Open Workout")
        #expect(try db.workout(w).name == "Open Workout")
    }

    @Test("A plain ad-hoc workout and a program session have no name of their own")
    func noName() throws {
        let db = try TempDB().open()
        let adHoc = try db.startWorkout(at: start)
        #expect(try db.inProgressWorkout()?.name == nil)
        try db.discardWorkout(adHoc)
        let p = try db.activeProgram()
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 1), at: start)
        #expect(try db.workout(session).name == nil)
    }
}
