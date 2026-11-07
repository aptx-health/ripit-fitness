// Shared helpers for the slice 3 program tests (work item 157, features/ios-app/programs.feature).
// All data is synthetic. Exercise ids come from the bundled catalog.

import Foundation
@testable import RipitCore

let squatId = "cmiz7vjpo0001vr0msv9of7ib"   // Barbell Back Squat
let rowId = "cmiz7vk1i0003vr0mqucd1f52"     // Barbell Row

enum Plans {
    /// 2 weeks x 3 workouts:
    /// - Day 1: Bench 3 x "5" @ "65%", Row 2 x "8-12" @ "RPE 8"
    /// - Day 2: Squat 3 x "5" (no weight)
    /// - Day 3: Bench A / Row A superset (2 x "10" each), Squat 1 x "AMRAP"
    static func standard(_ name: String = "Test Program") -> ProgramPlan {
        let day1 = PlannedWorkout("Day 1", [
            PlannedExercise(benchPressId, sets: Array(repeating: PlannedSet(reps: "5", weight: "65%"), count: 3)),
            PlannedExercise(rowId, sets: Array(repeating: PlannedSet(reps: "8-12", weight: "RPE 8"), count: 2)),
        ])
        let day2 = PlannedWorkout("Day 2", [
            PlannedExercise(squatId, sets: Array(repeating: PlannedSet(reps: "5"), count: 3)),
        ])
        let day3 = PlannedWorkout("Day 3", [
            PlannedExercise(benchPressId, group: "A", sets: Array(repeating: PlannedSet(reps: "10"), count: 2)),
            PlannedExercise(rowId, group: "A", sets: Array(repeating: PlannedSet(reps: "10"), count: 2)),
            PlannedExercise(squatId, sets: [PlannedSet(reps: "AMRAP")]),
        ])
        return ProgramPlan(name: name, weeks: [[day1, day2, day3], [day1, day2, day3]])
    }

    /// One week, one workout: a single exercise with the given plan.
    static func single(_ definitionId: String, _ sets: [PlannedSet], name: String = "Single") -> ProgramPlan {
        ProgramPlan(name: name, weeks: [[PlannedWorkout("Only", [PlannedExercise(definitionId, sets: sets)])]])
    }
}

/// Day `n` (1-based) of the program, as a local time.
func day(_ n: Int, hour: Int = 9) -> Date { Clock.at(2026, 11, n, hour) }

struct Missing: Error, CustomStringConvertible { let description: String }

extension Array {
    /// Throws instead of crashing on a bad index, so one wrong result fails one test, not the run.
    func at(_ i: Int) throws -> Element {
        guard indices.contains(i) else { throw Missing(description: "no element \(i) in \(count) items") }
        return self[i]
    }
}

extension ProgramDetail {
    func workoutId(week: Int, day: Int) throws -> String {
        guard let w = weeks.first(where: { $0.weekNumber == week })?.workouts.first(where: { $0.dayNumber == day }) else {
            throw Missing(description: "no week \(week) day \(day)")
        }
        return w.id
    }
    var allWorkoutIds: [String] { weeks.flatMap { $0.workouts.map(\.id) } }
}

extension AppDatabase {
    /// A program from the plan, made active.
    func activeProgram(_ plan: ProgramPlan = Plans.standard()) throws -> ProgramDetail {
        let id = try createProgram(plan)
        try activateProgram(id)
        return try program(id)
    }

    /// Starts a program workout, logs one set on its first exercise and finishes it. Returns the session id.
    @discardableResult
    func complete(_ workoutId: String, at date: Date, reps: Int = 5, weight: Double = 135) throws -> String {
        let session = try startProgramWorkout(workoutId, at: date)
        let first = try programSession(session).exercises.at(0).id
        _ = try logSet(exerciseId: first, reps: reps, weight: weight)
        try finishWorkout(session, at: date.addingTimeInterval(3600))
        return session
    }
}
