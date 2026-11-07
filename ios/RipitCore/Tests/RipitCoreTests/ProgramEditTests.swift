// Scenario: "Editing a program does not rewrite history".
// Unlike the web (where a logged set points at the program exercise, so a rename shows in old
// history), the phone keeps what was logged as it was.
//
// API used:
// - renameProgramExercise(_:to:), setPrescribedSets(_:_:), program(_:), programSession(_:)
// - slice 1: history(), workout(_:)

import Foundation
import Testing
@testable import RipitCore

@Suite("Programs: editing keeps history")
struct ProgramEditTests {
    /// Workout 1 logged (Bench 3 x 135, Row 1 x 95), then returns (program, session).
    func logged(_ db: AppDatabase) throws -> (ProgramDetail, String) {
        let p = try db.activeProgram()
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 1), at: day(1))
        let ex = try db.programSession(session).exercises
        for _ in 0..<3 { _ = try db.logSet(exerciseId: ex.at(0).id, reps: 5, weight: 135) }
        _ = try db.logSet(exerciseId: ex.at(1).id, reps: 10, weight: 95)
        try db.finishWorkout(session, at: day(1, hour: 10))
        return (p, session)
    }

    @Test("Edit: renaming an exercise changes the plan but not workout 1's history")
    func renameKeepsHistory() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let (p, session) = try logged(db)
        let before = try db.workout(session)
        let historyBefore = try db.history()
        let bench = try p.weeks.at(0).workouts.at(0).exercises.at(0).id

        try db.renameProgramExercise(bench, to: "Paused Bench")

        let reopened = try tmp.open()
        #expect(try reopened.program(p.id).weeks.at(0).workouts.at(0).exercises.at(0).name == "Paused Bench")
        #expect(try reopened.workout(session) == before)
        #expect(try reopened.history() == historyBefore)
        #expect(try reopened.programSession(session).exercises.at(0).name == "Barbell Bench Press")
    }

    @Test("Edit: changing prescribed sets changes the plan but not workout 1's logged sets")
    func prescribedChangeKeepsHistory() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let (p, session) = try logged(db)
        let before = try db.workout(session)
        let bench = try p.weeks.at(0).workouts.at(0).exercises.at(0).id

        try db.setPrescribedSets(bench, [PlannedSet(reps: "3", weight: "80%"), PlannedSet(reps: "3", weight: "85%")])

        let reopened = try tmp.open()
        let planned = try reopened.program(p.id).weeks.at(0).workouts.at(0).exercises.at(0).sets
        #expect(planned.map(\.reps) == ["3", "3"])
        #expect(planned.map(\.weight) == ["80%", "85%"])
        #expect(planned.map(\.setNumber) == [1, 2])
        #expect(try reopened.workout(session) == before)
        #expect(try reopened.programSession(session).exercises.at(0).logged.map(\.reps) == [5, 5, 5])
    }

    @Test("Edit: the edit only touches that workout, and the next session uses the new plan")
    func editAppliesForward() throws {
        let db = try TempDB().open()
        let (p, _) = try logged(db)
        let bench = try p.weeks.at(0).workouts.at(0).exercises.at(0).id
        try db.renameProgramExercise(bench, to: "Paused Bench")
        try db.setPrescribedSets(bench, [PlannedSet(reps: "2")])
        #expect(try db.program(p.id).weeks.at(1).workouts.at(0).exercises.at(0).name == "Barbell Bench Press", "week 2 is a separate workout")
        let next = try db.startProgramWorkout(p.workoutId(week: 1, day: 1), at: day(8))
        let ex = try db.programSession(next).exercises.at(0)
        #expect(ex.name == "Paused Bench")
        #expect(ex.planned.map(\.reps) == ["2"])
    }
}
