// Scenario: "Editing the plan does not change logged sets".
// Follows the web: a logged set points at the program exercise, so renaming the exercise renames
// it in that workout's history too; changing prescribed sets never touches logged sets.
//
// API used:
// - renameProgramExercise(_:to:), setPrescribedSets(_:_:), program(_:), programSession(_:)
// - slice 1: history(), workout(_:)

import Foundation
import Testing
@testable import RipitCore

@Suite("Programs: editing the plan")
struct ProgramEditTests {
    /// Workout 1 logged (Bench 3 x 135, Row 1 x 95), then returns (program, session).
    func logged(_ db: AppDatabase, at date: Date = day(1)) throws -> (ProgramDetail, String) {
        let p = try db.programs().first.map { try db.program($0.id) } ?? db.activeProgram()
        let session = try db.startProgramWorkout(try p.workoutId(week: 1, day: 1), at: date)
        let ex = try db.programSession(session).exercises
        for _ in 0..<3 { _ = try db.logSet(exerciseId: try ex.at(0).id, reps: 5, weight: 135) }
        _ = try db.logSet(exerciseId: try ex.at(1).id, reps: 10, weight: 95)
        try db.finishWorkout(session, at: date.addingTimeInterval(3600))
        return (p, session)
    }

    @Test("Edit: changing prescribed sets changes the plan but not workout 1's logged sets")
    func prescribedChangeKeepsLoggedSets() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let (p, session) = try logged(db)
        let before = try db.workout(session)
        let historyBefore = try db.history()
        let bench = try p.weeks.at(0).workouts.at(0).exercises.at(0).id

        try db.setPrescribedSets(bench, [PlannedSet(reps: "3", weight: "80%"), PlannedSet(reps: "3", weight: "85%")])

        let reopened = try tmp.open()
        let planned = try reopened.program(p.id).weeks.at(0).workouts.at(0).exercises.at(0).sets
        #expect(planned.map(\.reps) == ["3", "3"])
        #expect(planned.map(\.weight) == ["80%", "85%"])
        #expect(planned.map(\.setNumber) == [1, 2])
        #expect(try reopened.workout(session) == before)
        #expect(try reopened.history() == historyBefore)
        #expect(try reopened.programSession(session).exercises.at(0).logged.map(\.reps) == [5, 5, 5])
    }

    @Test("Edit: renaming an exercise renames it in workout 1's history, sets unchanged")
    func renameShowsInHistory() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let (p, session) = try logged(db)
        let before = try db.workout(session)
        let bench = try p.weeks.at(0).workouts.at(0).exercises.at(0).id

        try db.renameProgramExercise(bench, to: "Paused Bench")

        let reopened = try tmp.open()
        #expect(try reopened.program(p.id).weeks.at(0).workouts.at(0).exercises.at(0).name == "Paused Bench")
        let after = try reopened.workout(session)
        #expect(after.exercises.map(\.name) == ["Paused Bench", "Barbell Row"])
        #expect(after.exercises.map(\.sets) == before.exercises.map(\.sets))
        #expect(try reopened.programSession(session).exercises.at(0).name == "Paused Bench")
        #expect(try reopened.history().map(\.setCount) == [4])
    }

    @Test("Edit: a rename reaches every session of that workout, and nothing else")
    func renameScope() throws {
        let db = try TempDB().open()
        let (p, first) = try logged(db, at: day(1))
        let (_, second) = try logged(db, at: day(2))
        let week2 = try db.complete(p.workoutId(week: 2, day: 1), at: day(3))
        let adHoc = try db.makeWorkout(start: day(4), finish: day(4, hour: 10), [(benchPressId, [(5, 135)])])

        try db.renameProgramExercise(try p.weeks.at(0).workouts.at(0).exercises.at(0).id, to: "Paused Bench")

        #expect(try db.workout(first).exercises.at(0).name == "Paused Bench")
        #expect(try db.workout(second).exercises.at(0).name == "Paused Bench")
        #expect(try db.workout(week2).exercises.at(0).name == "Barbell Bench Press", "week 2 is a separate workout")
        #expect(try db.workout(adHoc).exercises.at(0).name == "Barbell Bench Press")
        #expect(try db.program(p.id).weeks.at(1).workouts.at(0).exercises.at(0).name == "Barbell Bench Press")
    }

    @Test("Edit: the next session uses the new name and plan")
    func editAppliesForward() throws {
        let db = try TempDB().open()
        let (p, _) = try logged(db)
        let bench = try p.weeks.at(0).workouts.at(0).exercises.at(0).id
        try db.renameProgramExercise(bench, to: "Paused Bench")
        try db.setPrescribedSets(bench, [PlannedSet(reps: "2")])
        let next = try db.startProgramWorkout(try p.workoutId(week: 1, day: 1), at: day(8))
        let ex = try db.programSession(next).exercises.at(0)
        #expect(ex.name == "Paused Bench")
        #expect(ex.planned.map(\.reps) == ["2"])
    }
}
