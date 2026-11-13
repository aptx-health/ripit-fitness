// Scenarios "Reorder, swap, delete and add" and "Exit" of features/ios-app/one-exercise-logger.feature
// (work item 203): what the plan list's edits and Exit do to the stored workout.
// - Reorder changes today's workout only; the program's order for that workout, its other workouts and a
//   later session keep the plan's order (Dustin 2026-11-10, item 196; the web rewrites the template).
// - Swap keeps the place; like the web's replace route (app/api/exercises/[exerciseId]/replace/route.ts:95-140)
//   the sets logged on it stay.
// - Delete removes the exercise and its sets logged today (the web's "Any sets you've logged for it will be
//   removed too", AdHocLoggerView.tsx). It never touches a finished workout's sets.
// - In a program session, swap and delete change today's workout only, like reorder (Dustin 2026-11-11,
//   follow-up 1): the plan for this day, other weeks and the next session keep the plan's exercises.
// - Supersets (follow-up 1): the plan list groups and ungroups; a superset left with one exercise, after an
//   ungroup or a delete, is no superset (the web's normalise rule, as removeExercise does today).
// - Add appends (the web's adhoc exercises route: order = max + 1), also in a program session.
// - Exit with nothing logged deletes the workout (item 196, observed); with any set logged, warm-ups too,
//   nothing changes and the person chooses.
//
// API used: moveExercise(_:to:inWorkout:), swapExercise(_:to:inWorkout:), deleteExercise(_:fromWorkout:),
// exitWorkout(_:), removeFromSuperset(_:); earlier slices: groupAsSuperset, startWorkout, addExercises, logSet(…isWarmup:at:), workout(_:),
// inProgressWorkout, finishWorkout, history, createProgram/activateProgram/program, startProgramWorkout,
// programSession, restartProgram

import Foundation
import GRDB
import Testing
@testable import RipitCore

private let deadliftId = "cmiz7vjvh0002vr0mtcmhiz70"   // Conventional Deadlift
private let pressId = "cmiz7vk780004vr0md53c57bz"      // Overhead Press
private let t0 = Clock.at(2026, 11, 11, 18)

private extension AppDatabase {
    /// A freestyle workout with Bench, Squat, Row, Deadlift: (workout id, exercise ids).
    func fourExercises() throws -> (String, [String]) {
        let w = try startWorkout(at: t0)
        return (w, try addExercises(definitionIds: [benchPressId, squatId, rowId, deadliftId], to: w))
    }

    func ids(_ workoutId: String) throws -> [String] { try workout(workoutId).exercises.map(\.id) }
    func definitions(_ workoutId: String) throws -> [String] { try workout(workoutId).exercises.map(\.definitionId) }

    func loggedSetCount(exerciseId: String) throws -> Int {
        try read { try Int.fetchOne($0, sql: "SELECT COUNT(*) FROM loggedSet WHERE exerciseId = ?", arguments: [exerciseId]) ?? 0 }
    }

    /// Definition ids of a program workout, in the program's order.
    func planDefinitions(_ programId: String, week: Int, day: Int) throws -> [String] {
        let p = try program(programId)
        guard let w = p.weeks.first(where: { $0.weekNumber == week })?.workouts.first(where: { $0.dayNumber == day }) else {
            throw Missing(description: "no week \(week) day \(day)")
        }
        return w.exercises.map(\.definitionId)
    }
}

@Suite("Logger store: reorder")
struct LoggerReorderTests {
    @Test("Freestyle: an exercise moves to its new place, and stays there after a relaunch")
    func freestyle() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let (w, e) = try db.fourExercises()
        try db.moveExercise(e[3], to: 0, inWorkout: w)
        #expect(try db.ids(w) == [e[3], e[0], e[1], e[2]])
        try db.moveExercise(e[0], to: 3, inWorkout: w)
        #expect(try db.ids(w) == [e[3], e[1], e[2], e[0]])
        #expect(try tmp.open().ids(w) == [e[3], e[1], e[2], e[0]])
    }

    @Test("Freestyle: moving to the same place changes nothing")
    func samePlace() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        try db.moveExercise(e[1], to: 1, inWorkout: w)
        #expect(try db.ids(w) == e)
    }

    @Test("Program: today's order changes; the program's order and next session don't")
    func programToday() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let day3 = try p.workoutId(week: 1, day: 3)
        let session = try db.startProgramWorkout(day3, at: t0)
        let squat = try db.programSession(session).exercises.at(2).id
        try db.moveExercise(squat, to: 0, inWorkout: session)

        #expect(try db.definitions(session) == [squatId, benchPressId, rowId])
        #expect(try db.programSession(session).exercises.map(\.definitionId) == [squatId, benchPressId, rowId])
        #expect(try db.planDefinitions(p.id, week: 1, day: 3) == [benchPressId, rowId, squatId])
        #expect(try db.planDefinitions(p.id, week: 2, day: 3) == [benchPressId, rowId, squatId])

        // Logging still works on the moved exercise, and the next session follows the plan.
        _ = try db.logSet(exerciseId: squat, reps: 5, weight: 225)
        #expect(try db.programSession(session).exercises.at(0).logged.map(\.reps) == [5])
        try db.finishWorkout(session, at: t0.addingTimeInterval(3600))
        try db.restartProgram(p.id)
        let next = try db.startProgramWorkout(day3, at: t0.addingTimeInterval(86400))
        #expect(try db.programSession(next).exercises.map(\.definitionId) == [benchPressId, rowId, squatId])
    }
}

@Suite("Logger store: swap")
struct LoggerSwapTests {
    @Test("Freestyle: the new exercise takes the old one's place")
    func freestyle() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        let swapped = try db.swapExercise(e[1], to: pressId, inWorkout: w)
        #expect(try db.definitions(w) == [benchPressId, pressId, rowId, deadliftId])
        let ex = try db.workout(w).exercises.at(1)
        #expect(ex.id == swapped)
        #expect(ex.name == "Overhead Press")
        #expect(try db.ids(w).filter { $0 != swapped } == [e[0], e[2], e[3]])
    }

    @Test("Freestyle: sets already logged stay, as on the web")
    func keepsSets() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        _ = try db.logSet(exerciseId: e[1], reps: 5, weight: 225, at: t0)
        _ = try db.logSet(exerciseId: e[1], reps: 5, weight: 235, at: t0)
        let swapped = try db.swapExercise(e[1], to: pressId, inWorkout: w)
        #expect(try db.workout(w).exercises.first { $0.id == swapped }?.sets.map(\.weight) == [225, 235])
    }

    @Test("Program: today's workout gets the new exercise in place; the plan and the next session don't")
    func programToday() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let day1 = try p.workoutId(week: 1, day: 1)
        let session = try db.startProgramWorkout(day1, at: t0)
        let row = try db.programSession(session).exercises.at(1).id
        let swapped = try db.swapExercise(row, to: pressId, inWorkout: session)

        #expect(try db.definitions(session) == [benchPressId, pressId])
        #expect(try db.programSession(session).exercises.map(\.definitionId) == [benchPressId, pressId])
        #expect(try db.planDefinitions(p.id, week: 1, day: 1) == [benchPressId, rowId])
        #expect(try db.planDefinitions(p.id, week: 2, day: 1) == [benchPressId, rowId])

        // The swapped exercise can be logged, and the next session follows the plan.
        _ = try db.logSet(exerciseId: swapped, reps: 8, weight: 95)
        #expect(try db.programSession(session).exercises.at(1).logged.map(\.reps) == [8])
        try db.finishWorkout(session, at: t0.addingTimeInterval(3600))
        #expect(try db.workout(session).exercises.map(\.definitionId) == [benchPressId, pressId])
        try db.restartProgram(p.id)
        let next = try db.startProgramWorkout(day1, at: t0.addingTimeInterval(86400))
        #expect(try db.programSession(next).exercises.map(\.definitionId) == [benchPressId, rowId])
        #expect(try db.programSession(next).exercises.allSatisfy { $0.logged.isEmpty })
    }
}

@Suite("Logger store: delete")
struct LoggerDeleteTests {
    @Test("Freestyle: the exercise and its logged sets are removed")
    func freestyle() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        _ = try db.logSet(exerciseId: e[1], reps: 5, weight: 225, at: t0)
        _ = try db.logSet(exerciseId: e[2], reps: 8, weight: 135, at: t0)
        try db.deleteExercise(e[1], fromWorkout: w)
        #expect(try db.ids(w) == [e[0], e[2], e[3]])
        #expect(try db.loggedSetCount(exerciseId: e[1]) == 0)
        #expect(try db.workout(w).exercises.at(1).sets.map(\.reps) == [8])
    }

    @Test("Program: gone from today with today's sets; finished workouts and other weeks keep it")
    func programToday() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let day1 = try p.workoutId(week: 1, day: 1)

        // Cycle 1: Bench and Row logged and finished.
        let old = try db.startProgramWorkout(day1, at: t0)
        let oldExercises = try db.programSession(old).exercises
        _ = try db.logSet(exerciseId: oldExercises.at(0).id, reps: 5, weight: 185)
        _ = try db.logSet(exerciseId: oldExercises.at(1).id, reps: 10, weight: 115)
        try db.finishWorkout(old, at: t0.addingTimeInterval(3600))
        let historyBefore = try db.history()
        try db.restartProgram(p.id)

        // Cycle 2: a Row set today, then Row deleted.
        let today = try db.startProgramWorkout(day1, at: t0.addingTimeInterval(86400))
        let row = try db.programSession(today).exercises.at(1).id
        _ = try db.logSet(exerciseId: row, reps: 9, weight: 120)
        try db.deleteExercise(row, fromWorkout: today)

        #expect(try db.definitions(today) == [benchPressId])
        #expect(try db.programSession(today).exercises.map(\.definitionId) == [benchPressId])
        #expect(try db.workout(today).exercises.flatMap(\.sets).isEmpty)
        #expect(try db.workout(old).exercises.map { $0.sets.map(\.reps) } == [[5], [10]])
        #expect(try db.history() == historyBefore)
        #expect(try db.planDefinitions(p.id, week: 1, day: 1) == [benchPressId, rowId])
        #expect(try db.planDefinitions(p.id, week: 2, day: 1) == [benchPressId, rowId])

        // The next session has Row again.
        _ = try db.logSet(exerciseId: db.programSession(today).exercises.at(0).id, reps: 5, weight: 190)
        try db.finishWorkout(today, at: t0.addingTimeInterval(86400 + 3600))
        try db.restartProgram(p.id)
        let next = try db.startProgramWorkout(day1, at: t0.addingTimeInterval(2 * 86400))
        #expect(try db.programSession(next).exercises.map(\.definitionId) == [benchPressId, rowId])
    }
}

@Suite("Logger store: supersets from the plan list")
struct LoggerSupersetTests {
    func groups(_ db: AppDatabase, _ w: String) throws -> [String?] { try db.workout(w).exercises.map(\.group) }

    @Test("Ungrouping one of three leaves the other two a superset")
    func ungroupOneOfThree() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        try db.groupAsSuperset([e[0], e[1], e[2]])
        try db.removeFromSuperset(e[1])
        let g = try groups(db, w)
        #expect(g[1] == nil)
        #expect(g[0] != nil && g[0] == g[2])
        #expect(g[3] == nil)
    }

    @Test("Ungrouping one of two ends the superset")
    func ungroupOneOfTwo() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        try db.groupAsSuperset([e[0], e[1]])
        try db.groupAsSuperset([e[2], e[3]])
        try db.removeFromSuperset(e[0])
        let g = try groups(db, w)
        #expect(g[0] == nil && g[1] == nil)
        #expect(g[2] != nil && g[2] == g[3])
    }

    @Test("Ungrouping an exercise in no superset changes nothing")
    func ungroupNone() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        try db.groupAsSuperset([e[0], e[1]])
        let before = try groups(db, w)
        try db.removeFromSuperset(e[3])
        #expect(try groups(db, w) == before)
    }

    @Test("An ungrouped exercise can be grouped again")
    func regroup() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        try db.groupAsSuperset([e[0], e[1]])
        try db.removeFromSuperset(e[1])
        try db.groupAsSuperset([e[1], e[2]])
        let g = try groups(db, w)
        #expect(g[0] == nil && g[3] == nil)
        #expect(g[1] != nil && g[1] == g[2])
    }

    @Test("Deleting one of a pair ends the superset")
    func deleteEndsPair() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        try db.groupAsSuperset([e[1], e[2]])
        try db.deleteExercise(e[1], fromWorkout: w)
        #expect(try groups(db, w) == [nil, nil, nil])
    }

    @Test("A finished workout's supersets can't be changed")
    func finished() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        try db.groupAsSuperset([e[0], e[1]])
        _ = try db.logSet(exerciseId: e[0], reps: 5, weight: 135, at: t0)
        try db.finishWorkout(w, at: t0.addingTimeInterval(3600))
        #expect(throws: (any Error).self) { try db.removeFromSuperset(e[0]) }
        let g = try groups(db, w)
        #expect(g[0] != nil && g[0] == g[1])
    }
}

@Suite("Logger store: add")
struct LoggerAddTests {
    @Test("Freestyle: new exercises are appended in the order picked")
    func freestyle() throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        let added = try db.addExercises(definitionIds: [pressId, benchPressId], to: w)
        #expect(try db.ids(w) == e + added)
    }

    @Test("Program: new exercises go after the plan's, today only")
    func programSession() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 3), at: t0)
        _ = try db.addExercises(definitionIds: [pressId, deadliftId], to: session)
        #expect(try db.definitions(session) == [benchPressId, rowId, squatId, pressId, deadliftId])
        #expect(try db.programSession(session).exercises.map(\.definitionId) == [benchPressId, rowId, squatId, pressId, deadliftId])
        #expect(try db.planDefinitions(p.id, week: 1, day: 3) == [benchPressId, rowId, squatId])
    }
}

@Suite("Logger store: exit")
struct LoggerExitTests {
    @Test("Nothing logged: the freestyle workout is deleted", arguments: [0, 2])
    func emptyFreestyle(_ exercises: Int) throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: t0)
        _ = try db.addExercises(definitionIds: Array([benchPressId, squatId].prefix(exercises)), to: w)
        #expect(try db.exitWorkout(w) == true)
        #expect(try db.inProgressWorkout() == nil)
        #expect(throws: (any Error).self) { try db.workout(w) }
    }

    @Test("Nothing logged: the program session is deleted and the program is untouched")
    func emptyProgram() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 1), at: t0)
        #expect(try db.exitWorkout(session) == true)
        #expect(try db.inProgressWorkout() == nil)
        #expect(try db.program(p.id) == p)
        #expect(try db.upNext()?.hasDraft == false)
    }

    @Test("A logged set, warm-up or not, keeps the workout", arguments: [true, false])
    func logged(_ warmup: Bool) throws {
        let db = try TempDB().open()
        let (w, e) = try db.fourExercises()
        _ = try db.logSet(exerciseId: e[0], reps: 10, weight: 45, isWarmup: warmup, at: t0)
        #expect(try db.exitWorkout(w) == false)
        #expect(try db.inProgressWorkout()?.id == w)
        #expect(try db.workout(w).exercises.count == 4)
    }

    @Test("A logged set keeps a program session")
    func loggedProgram() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 1), at: t0)
        _ = try db.logSet(exerciseId: db.programSession(session).exercises.at(0).id, reps: 5, weight: 135)
        #expect(try db.exitWorkout(session) == false)
        #expect(try db.inProgressWorkout()?.id == session)
    }
}
