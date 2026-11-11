// Work item 206 (slice 9b fixes): a reordered freestyle workout saves in today's order, and a program
// superset left with one exercise today shows no badge today while the program keeps it.
//
// API used: moveExercise(_:to:inWorkout:), swapExercise(_:to:inWorkout:), deleteExercise(_:fromWorkout:),
// saveWorkout(fromCompletion:name:notes:at:), savedWorkoutPlan(_:), startSavedWorkout(_:at:),
// programSession(_:), workout(_:), program(_:)

import Foundation
import Testing
@testable import RipitCore

private let pressId = "cmiz7vk780004vr0md53c57bz"   // Overhead Press
private let t0 = Clock.at(2026, 11, 11, 18)

@Suite("Logger fixes: saved order and lone supersets")
struct SessionOrderSaveTests {
    @Test("A reordered freestyle workout saves, and starts again, in today's order")
    func savedOrder() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: t0)
        let e = try db.addExercises(definitionIds: [benchPressId, rowId, squatId], to: w)
        try db.moveExercise(e[2], to: 0, inWorkout: w)
        for id in e { _ = try db.logSet(exerciseId: id, reps: 5, weight: 100) }
        try db.finishWorkout(w, at: t0.addingTimeInterval(1800))

        let saved = try db.saveWorkout(fromCompletion: w, name: "Reordered", notes: nil, at: t0.addingTimeInterval(1900))
        #expect(try db.savedWorkoutPlan(saved).map(\.exerciseDefinitionId) == [squatId, benchPressId, rowId])
        let again = try db.startSavedWorkout(saved, at: t0.addingTimeInterval(86400))
        #expect(try db.workout(again).exercises.map(\.definitionId) == [squatId, benchPressId, rowId])
    }

    @Test("Program: deleting one half of a superset ends it today only")
    func deleteEndsToday() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let day3 = try p.workoutId(week: 1, day: 3)
        let session = try db.startProgramWorkout(day3, at: t0)
        let row = try db.programSession(session).exercises.at(1).id
        try db.deleteExercise(row, fromWorkout: session)

        #expect(try db.workout(session).exercises.map(\.group) == [nil, nil])
        #expect(try db.programSession(session).exercises.map(\.group) == [nil, nil])
        #expect(try db.program(p.id).weeks.at(0).workouts.at(2).exercises.map(\.group) == ["A", "A", nil])
    }

    @Test("Program: swapping one half of a superset ends it today only")
    func swapEndsToday() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let day3 = try p.workoutId(week: 1, day: 3)
        let session = try db.startProgramWorkout(day3, at: t0)
        let row = try db.programSession(session).exercises.at(1).id
        _ = try db.swapExercise(row, to: pressId, inWorkout: session)

        #expect(try db.workout(session).exercises.map(\.group) == [nil, nil, nil])
        #expect(try db.program(p.id).weeks.at(0).workouts.at(2).exercises.map(\.group) == ["A", "A", nil])
        let next = try db.startProgramWorkout(try p.workoutId(week: 2, day: 3), at: t0.addingTimeInterval(86400))
        #expect(try db.programSession(next).exercises.map(\.group) == ["A", "A", nil])
    }

    @Test("Program: a superset with both halves left keeps its badge")
    func pairKept() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let session = try db.startProgramWorkout(try p.workoutId(week: 1, day: 3), at: t0)
        let squat = try db.programSession(session).exercises.at(2).id
        try db.deleteExercise(squat, fromWorkout: session)
        #expect(try db.workout(session).exercises.map(\.group) == ["A", "A"])
    }
}
