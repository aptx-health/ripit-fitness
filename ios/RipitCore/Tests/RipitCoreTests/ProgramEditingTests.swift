// Work item 170: tests for ProgramsEditing.swift (the app's program editor calls), plus the history
// entry's program and week. Edits change the plan, never logged sets.

import Foundation
import GRDB
import Testing
@testable import RipitCore

@Suite("Program editing")
struct ProgramEditingTests {
    func uuid(_ s: String) -> Bool { UUID(uuidString: s) != nil }

    @Test("Add week: copies the last week's workouts, exercises and prescribed sets, with UUID ids")
    func addWeekCopies() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let weekId = try db.addProgramWeek(p.id)
        let after = try db.program(p.id)
        let w3 = try #require(after.weeks.first { $0.weekNumber == 3 })
        let w2 = try after.weeks.at(1)
        #expect(w3.id == weekId)
        #expect(w3.workouts.map(\.name) == w2.workouts.map(\.name))
        #expect(w3.workouts.map { $0.exercises.map(\.definitionId) } == w2.workouts.map { $0.exercises.map(\.definitionId) })
        #expect(w3.workouts.map { $0.exercises.map(\.group) } == w2.workouts.map { $0.exercises.map(\.group) })
        #expect(w3.workouts.flatMap { $0.exercises.flatMap { $0.sets.map(\.weight) } }
            == w2.workouts.flatMap { $0.exercises.flatMap { $0.sets.map(\.weight) } })
        let ids = [w3.id] + w3.workouts.map(\.id) + w3.workouts.flatMap { $0.exercises.map(\.id) }
            + w3.workouts.flatMap { $0.exercises.flatMap { $0.sets.map(\.id) } }
        #expect(ids.allSatisfy(uuid), "\(ids.filter { !uuid($0) })")
        #expect(Set(ids).isDisjoint(with: w2.workouts.flatMap { $0.exercises.flatMap { $0.sets.map(\.id) } }))
    }

    @Test("Add week: a program with no weeks gets an empty week 1")
    func addFirstWeek() throws {
        let db = try TempDB().open()
        let id = try db.createProgram(ProgramPlan(name: "Empty", weeks: []))
        try db.addProgramWeek(id)
        let weeks = try db.program(id).weeks
        #expect(weeks.map(\.weekNumber) == [1])
        #expect(try weeks.at(0).workouts.isEmpty)
    }

    @Test("Add workout and exercise: the next day, and the exercise at the end with its sets")
    func addWorkoutAndExercise() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let week = try p.weeks.at(0)
        let w = try db.addProgramWorkout(weekId: week.id, name: "Arms")
        let e = try db.addProgramExercise(workoutId: w, definitionId: benchPressId,
                                          sets: [PlannedSet(reps: "10", weight: "50%", rpe: 7), PlannedSet(reps: "8", isWarmup: true)])
        let added = try #require(try db.program(p.id).weeks.at(0).workouts.last)
        #expect(added.id == w && added.dayNumber == 4 && added.name == "Arms")
        let ex = try added.exercises.at(0)
        #expect(ex.id == e && ex.name == "Barbell Bench Press")
        #expect(ex.sets.map(\.reps) == ["10", "8"])
        #expect(ex.sets.map(\.rpe) == [7, nil])
        #expect(ex.sets.map(\.isWarmup) == [false, true])
    }

    @Test("Remove: an exercise with no logged sets goes; one with logged sets is refused and kept")
    func removeRefusedWithLoggedSets() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let day1 = try p.weeks.at(0).workouts.at(0)
        try db.complete(day1.id, at: day(1))                         // logs a set on Bench (exercise 0)
        #expect(try db.removeProgramExercise(day1.exercises.at(0).id) == false)
        #expect(try db.removeProgramExercise(day1.exercises.at(1).id) == true)
        let after = try db.program(p.id).weeks.at(0).workouts.at(0).exercises
        #expect(after.map(\.id) == [try day1.exercises.at(0).id])
        #expect(try db.history().first?.setCount == 1)
    }

    @Test("Regroup: a superset label can be set and cleared")
    func regroup() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let ex = try p.weeks.at(0).workouts.at(0).exercises
        try db.setProgramExerciseGroup(ex.at(0).id, "B")
        try db.setProgramExerciseGroup(ex.at(1).id, "B")
        #expect(try db.program(p.id).weeks.at(0).workouts.at(0).exercises.map(\.group) == ["B", "B"])
        try db.setProgramExerciseGroup(ex.at(1).id, nil)
        #expect(try db.program(p.id).weeks.at(0).workouts.at(0).exercises.map(\.group) == ["B", nil])
        #expect(throws: RipitCoreError.self) { try db.setProgramExerciseGroup("no-such-exercise", "A") }
    }

    @Test("Rename: the program and a workout take their new names; unknown ids are refused")
    func rename() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let w = try p.weeks.at(0).workouts.at(1)
        try db.renameProgram(p.id, to: "Block 2")
        try db.renameProgramWorkout(w.id, to: "Legs")
        let after = try db.program(p.id)
        #expect(after.name == "Block 2")
        #expect(try after.weeks.at(0).workouts.at(1).name == "Legs")
        #expect(try after.weeks.at(1).workouts.at(1).name == "Day 2", "week 2 is its own workout")
        #expect(throws: RipitCoreError.self) { try db.renameProgram("nope", to: "x") }
        #expect(throws: RipitCoreError.self) { try db.renameProgramWorkout("nope", to: "x") }
    }

    @Test("History: a program session carries its program name and week; an ad-hoc one has neither")
    func historyCarriesProgramAndWeek() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram(Plans.standard("Strength Block"))
        let s = try db.complete(p.workoutId(week: 2, day: 3), at: day(3))
        let adHoc = try db.makeWorkout(start: day(4), finish: day(4, hour: 10), [(benchPressId, [(5, 135)])])
        let history = try db.history()
        let program = try #require(history.first { $0.id == s })
        #expect(program.name == "Day 3" && program.programName == "Strength Block" && program.weekNumber == 2)
        let free = try #require(history.first { $0.id == adHoc })
        #expect(free.programName == nil && free.weekNumber == nil)
    }
}
