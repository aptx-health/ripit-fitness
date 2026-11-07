// Scenarios: "Start a program workout prefilled from the plan and last time",
// "Plan and logged sets stay apart", "Supersets in a program".
// Prefill oracle: lib/workout/prefill.ts computePrefillValues, run with node on these cases
// (expected values below are its output). "Last time" is the most recent completed workout
// containing the exercise (lib/queries/exercise-history.ts): program or ad-hoc, archived or not,
// never a draft.
//
// API used:
// - startProgramWorkout(_:at:), programSession(_:), prefill(exerciseId:setNumber:), updateSet(_:reps:weight:unit:)
// - slice 1: logSet, finishWorkout, history(), workout(_:)

import Foundation
import Testing
@testable import RipitCore

@Suite("Programs: logging against the plan")
struct ProgramLoggingTests {
    /// The day 2 Squat (3 x "5") session exercise, after an earlier finished workout logged `history`.
    func squatSession(_ db: AppDatabase, history: [(Int, Double, String)]) throws -> (ProgramDetail, String, SessionExercise) {
        let p = try db.activeProgram()
        if !history.isEmpty {
            let w = try db.startWorkout(at: day(1))
            let e = try db.addExercise(definitionId: squatId, to: w)
            for (reps, weight, unit) in history { _ = try db.logSet(exerciseId: e, reps: reps, weight: weight, unit: unit) }
            try db.finishWorkout(w, at: day(1, hour: 10))
        }
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 2), at: day(2))
        let squat = try db.programSession(session).exercises.at(0)
        return (p, session, squat)
    }

    // ---- Prefill

    @Test("Prefill: each Squat set shows the plan and is prefilled from 225 lbs x 5 last time")
    func prefillFromLastTime() throws {
        let db = try TempDB().open()
        let (_, _, squat) = try squatSession(db, history: [(5, 225, "lbs")])
        #expect(squat.name == "Barbell Back Squat")
        #expect(squat.planned.map(\.setNumber) == [1, 2, 3])
        #expect(squat.planned.map(\.reps) == ["5", "5", "5"])
        #expect(squat.logged.isEmpty)
        for n in 1...3 {
            #expect(try db.prefill(exerciseId: squat.id, setNumber: n) == Prefill(reps: "5", weight: "225", weightUnit: "lbs", rpe: "", rir: ""))
        }
    }

    @Test("Prefill: the last set of last time wins over earlier sets")
    func prefillLastSetOfLastTime() throws {
        let db = try TempDB().open()
        let (_, _, squat) = try squatSession(db, history: [(5, 225, "lbs"), (3, 235, "lbs")])
        #expect(try db.prefill(exerciseId: squat.id, setNumber: 1) == Prefill(reps: "3", weight: "235", weightUnit: "lbs", rpe: "", rir: ""))
    }

    @Test("Prefill: a set logged this session wins over last time")
    func prefillSessionWins() throws {
        let db = try TempDB().open()
        let (_, _, squat) = try squatSession(db, history: [(5, 225, "lbs")])
        _ = try db.logSet(exerciseId: squat.id, reps: 5, weight: 230)
        #expect(try db.prefill(exerciseId: squat.id, setNumber: 2) == Prefill(reps: "5", weight: "230", weightUnit: "lbs", rpe: "", rir: ""))
    }

    @Test("Prefill: numbers print like the web (102.5 kg, 0 for bodyweight)")
    func prefillNumberFormat() throws {
        let db = try TempDB().open()
        let (_, _, squat) = try squatSession(db, history: [(5, 102.5, "kg")])
        #expect(try db.prefill(exerciseId: squat.id, setNumber: 1) == Prefill(reps: "5", weight: "102.5", weightUnit: "kg", rpe: "", rir: ""))
        let db2 = try TempDB().open()
        let (_, _, squat2) = try squatSession(db2, history: [(10, 0, "lbs")])
        #expect(try db2.prefill(exerciseId: squat2.id, setNumber: 1) == Prefill(reps: "10", weight: "0", weightUnit: "lbs", rpe: "", rir: ""))
    }

    @Test("Prefill: the most recent finished workout wins; a discarded one is not last time")
    func prefillMostRecentFinished() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        for (d, weight) in [(1, 200.0), (2, 215.0)] {
            let w = try db.startWorkout(at: day(d))
            _ = try db.logSet(exerciseId: try db.addExercise(definitionId: squatId, to: w), reps: 5, weight: weight)
            try db.finishWorkout(w, at: day(d, hour: 10))
        }
        let draft = try db.startWorkout(at: day(3))
        _ = try db.logSet(exerciseId: try db.addExercise(definitionId: squatId, to: draft), reps: 5, weight: 999)
        try db.discardWorkout(draft)
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 2), at: day(4))
        let squat = try db.programSession(session).exercises.at(0)
        #expect(try db.prefill(exerciseId: squat.id, setNumber: 1).weight == "215")
    }

    @Test("Prefill: with no history it falls back to the plan",
          arguments: [("5", Prefill(reps: "5", weight: "0", weightUnit: nil, rpe: "", rir: "")),
                      ("8-12", Prefill(reps: "12", weight: "0", weightUnit: nil, rpe: "", rir: "")),
                      ("15+", Prefill(reps: "15", weight: "0", weightUnit: nil, rpe: "", rir: "")),
                      ("AMRAP", Prefill(reps: "", weight: "0", weightUnit: nil, rpe: "", rir: ""))])
    func prefillFromPlan(_ reps: String, _ expected: Prefill) throws {
        let db = try TempDB().open()
        let id = try db.createProgram(Plans.single(squatId, [PlannedSet(reps: reps)]))
        try db.activateProgram(id)
        let session = try db.startProgramWorkout(try db.program(id).workoutId(week: 1, day: 1), at: day(1))
        let squat = try db.programSession(session).exercises.at(0)
        #expect(try db.prefill(exerciseId: squat.id, setNumber: 1) == expected)
    }

    @Test("Prefill: the plan's RPE is used only when there is no history")
    func prefillPlanRpe() throws {
        let db = try TempDB().open()
        let id = try db.createProgram(Plans.single(squatId, [PlannedSet(reps: "5", rpe: 8), PlannedSet(reps: "3", rir: 1)]))
        try db.activateProgram(id)
        let session = try db.startProgramWorkout(try db.program(id).workoutId(week: 1, day: 1), at: day(2))
        let squat = try db.programSession(session).exercises.at(0)
        #expect(try db.prefill(exerciseId: squat.id, setNumber: 1) == Prefill(reps: "5", weight: "0", weightUnit: nil, rpe: "8", rir: ""))
        #expect(try db.prefill(exerciseId: squat.id, setNumber: 2) == Prefill(reps: "3", weight: "0", weightUnit: nil, rpe: "", rir: "1"))

        // Once there is a last time, its (empty) RPE wins over the plan's.
        _ = try db.logSet(exerciseId: squat.id, reps: 5, weight: 225)
        try db.finishWorkout(session, at: day(2, hour: 10))
        let next = try db.startProgramWorkout(try db.program(id).workoutId(week: 1, day: 1), at: day(3))
        let again = try db.programSession(next).exercises.at(0)
        #expect(try db.prefill(exerciseId: again.id, setNumber: 1) == Prefill(reps: "5", weight: "225", weightUnit: "lbs", rpe: "", rir: ""))
    }

    @Test("Prefill: history from before a restart still counts as last time")
    func prefillAcrossRestart() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        try db.complete(p.workoutId(week: 1, day: 2), at: day(1), reps: 5, weight: 245)
        try db.restartProgram(p.id)
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 2), at: day(5))
        let squat = try db.programSession(session).exercises.at(0)
        #expect(try db.prefill(exerciseId: squat.id, setNumber: 1).weight == "245")
    }

    // ---- Plan and logged sets stay apart

    @Test("Plan vs logged: 2 of 3 prescribed sets logged, one changed; the plan is unchanged")
    func planAndLoggedApart() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let p = try db.activeProgram()
        let planBefore = try db.program(p.id)
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 2), at: day(2))
        let squat = try db.programSession(session).exercises.at(0)
        let s1 = try db.logSet(exerciseId: squat.id, reps: 5, weight: 225)
        _ = try db.logSet(exerciseId: squat.id, reps: 5, weight: 225)
        try db.updateSet(s1, reps: 4, weight: 225, unit: "lbs")
        try db.finishWorkout(session, at: day(2, hour: 10))

        let reopened = try tmp.open()
        #expect(try reopened.program(p.id) == planBefore)
        let after = try reopened.programSession(session).exercises.at(0)
        #expect(after.planned.map(\.reps) == ["5", "5", "5"])
        #expect(after.logged.map(\.reps) == [4, 5])
        #expect(after.logged.map(\.setNumber) == [1, 2])
        let detail = try reopened.workout(session)
        #expect(detail.exercises.map(\.name) == ["Barbell Back Squat"])
        #expect(try detail.exercises.at(0).sets.map(\.reps) == [4, 5])
        #expect(try reopened.history().first?.setCount == 2)
    }

    @Test("Plan vs logged: updating a set changes only that set")
    func updateSetInPlace() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 2), at: day(2))
        let squat = try db.programSession(session).exercises.at(0)
        let ids = try (0..<3).map { _ in try db.logSet(exerciseId: squat.id, reps: 5, weight: 225) }
        try db.updateSet(ids.at(1), reps: 3, weight: 100, unit: "kg")
        let logged = try db.programSession(session).exercises.at(0).logged
        #expect(logged.map(\.id) == ids)
        #expect(logged.map(\.reps) == [5, 3, 5])
        #expect(logged.map(\.weight) == [225, 100, 225])
        #expect(logged.map(\.weightUnit) == ["lbs", "kg", "lbs"])
    }

    @Test("Program session: the history entry is named after the workout")
    func historyNamedAfterWorkout() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let s = try db.complete(p.workoutId(week: 1, day: 2), at: day(2))
        let entry = try #require(try db.history().first)
        #expect(entry.id == s)
        #expect(entry.name == "Day 2")
        #expect(entry.exerciseCount == 1)
    }

    // ---- Supersets

    @Test("Supersets: A1/A2 show as a superset in the session; the third exercise is alone")
    func supersetInSession() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 3), at: day(3))
        let ex = try db.programSession(session).exercises
        #expect(ex.map(\.definitionId) == [benchPressId, rowId, squatId])
        #expect(try ex.at(0).group != nil && ex.at(0).group == ex.at(1).group)
        #expect(try ex.at(2).group == nil)
    }

    @Test("Supersets: logged alternately they stay grouped after finishing and in history")
    func supersetInHistory() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let p = try db.activeProgram()
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 3), at: day(3))
        let ex = try db.programSession(session).exercises
        for _ in 0..<2 {
            _ = try db.logSet(exerciseId: ex.at(0).id, reps: 10, weight: 135)
            _ = try db.logSet(exerciseId: ex.at(1).id, reps: 10, weight: 95)
        }
        try db.finishWorkout(session, at: day(3, hour: 10))
        let detail = try tmp.open().workout(session)
        #expect(detail.exercises.map(\.name) == ["Barbell Bench Press", "Barbell Row", "Barbell Back Squat"])
        #expect(try detail.exercises.at(0).group != nil && detail.exercises.at(0).group == detail.exercises.at(1).group)
        #expect(try detail.exercises.at(2).group == nil)
        #expect(try detail.exercises.at(0).sets.map(\.weight) == [135, 135])
        #expect(try detail.exercises.at(1).sets.map(\.weight) == [95, 95])
        #expect(try detail.exercises.at(0).sets.map(\.setNumber) == [1, 2])
    }
}
