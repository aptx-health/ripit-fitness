// Scenarios: "Rest timer starts when I log a set", "Rest timer keeps true time", "Workout clock",
// "Last time line" (never logged, unfinished workouts, the tap), "Logging effort", "Warm-up sets".
// The web's answers for a whole history are in LoggingHelpGoldenTests; these cover what needs a
// clock, a relaunch or the phone's own logging. Expected values come from hooks/useRestTimer.ts,
// hooks/useWorkoutTimer.ts, lib/workout/prefill.ts and lib/stats/exercise-history-derivation.ts.
//
// API used:
// - logSet(exerciseId:reps:weight:unit:rpe:rir:isWarmup:at:), setWarmup(_:_:),
//   restTimer(exerciseId:workoutId:), lastTime(definitionId:includeIntensity:),
//   exerciseHistory(definitionId:), LoggingClock
// - earlier slices: startWorkout, addExercise, deleteSet, finishWorkout, workout(_:), inProgressWorkout,
//   createProgram/activateProgram/startProgramWorkout/programSession/prefill, weeklyReport, liftHistory

import Foundation
import Testing
@testable import RipitCore

private let t0 = Clock.at(2026, 11, 3, 18)

private extension AppDatabase {
    /// An ad-hoc workout started at t0 with one bench exercise: (workout id, exercise id).
    func benchWorkout(start: Date = t0) throws -> (String, String) {
        let w = try startWorkout(at: start)
        return (w, try addExercise(definitionId: benchPressId, to: w))
    }

    func set(_ id: String, in workoutId: String) throws -> SetDetail {
        guard let s = try workout(workoutId).exercises.flatMap(\.sets).first(where: { $0.id == id }) else {
            throw Missing(description: "no set \(id)")
        }
        return s
    }
}

@Suite("Logging help: rest timer")
struct RestTimerTests {
    @Test("Rest timer: starts at 0:00 when a set is logged")
    func startsAtZero() throws {
        let db = try TempDB().open()
        let (w, e) = try db.benchWorkout()
        #expect(try db.restTimer(exerciseId: e, workoutId: w) == nil)
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 185, at: t0.addingTimeInterval(300))
        let timer = try #require(try db.restTimer(exerciseId: e, workoutId: w))
        #expect(timer.startedAt == t0.addingTimeInterval(300))
        #expect(timer.setCount == 1)
        #expect(try LoggingClock.restText(try LoggingClock.elapsedSeconds(from: timer.startedAt, to: timer.startedAt)) == "0:00")
    }

    @Test("Rest timer: another set resets it to that set's time")
    func resetsOnNewSet() throws {
        let db = try TempDB().open()
        let (w, e) = try db.benchWorkout()
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 185, at: t0)
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 185, at: t0.addingTimeInterval(95))
        let timer = try #require(try db.restTimer(exerciseId: e, workoutId: w))
        #expect(timer.startedAt == t0.addingTimeInterval(95))
        #expect(timer.setCount == 2)
        #expect(try LoggingClock.elapsedSeconds(from: timer.startedAt, to: t0.addingTimeInterval(105)) == 10)
    }

    @Test("Rest timer: kept per exercise")
    func perExercise() throws {
        let db = try TempDB().open()
        let (w, bench) = try db.benchWorkout()
        let squat = try db.addExercise(definitionId: squatId, to: w)
        _ = try db.logSet(exerciseId: bench, reps: 5, weight: 185, at: t0)
        _ = try db.logSet(exerciseId: squat, reps: 5, weight: 225, at: t0.addingTimeInterval(30))
        #expect(try db.restTimer(exerciseId: bench, workoutId: w)?.startedAt == t0)
        #expect(try db.restTimer(exerciseId: squat, workoutId: w)?.startedAt == t0.addingTimeInterval(30))
    }

    @Test("Rest timer: keeps true time after 2 minutes away and a relaunch")
    func survivesRelaunch() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let (w, e) = try db.benchWorkout()
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 185, at: t0)
        let timer = try #require(try tmp.open().restTimer(exerciseId: e, workoutId: w))
        let seconds = try LoggingClock.elapsedSeconds(from: timer.startedAt, to: t0.addingTimeInterval(120))
        #expect(seconds == 120)
        #expect(try LoggingClock.restText(seconds) == "2:00")
    }

    @Test("Rest timer: stops when the exercise's last set is deleted")
    func stopsWhenNoSets() throws {
        let db = try TempDB().open()
        let (w, e) = try db.benchWorkout()
        let s = try db.logSet(exerciseId: e, reps: 5, weight: 185, at: t0)
        try db.deleteSet(s)
        #expect(try db.restTimer(exerciseId: e, workoutId: w) == nil)
    }

    @Test("Rest timer: a program exercise's earlier workouts don't start it")
    func programSessionOnly() throws {
        let db = try TempDB().open()
        let program = try db.activeProgram(Plans.single(benchPressId, [PlannedSet(reps: "5")]))
        let workoutId = try program.workoutId(week: 1, day: 1)
        let first = try db.startProgramWorkout(workoutId, at: day(1))
        let e = try db.programSession(first).exercises.at(0).id
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 185, at: day(1, hour: 10))
        try db.finishWorkout(first, at: day(1, hour: 11))
        let second = try db.startProgramWorkout(workoutId, at: day(3))
        #expect(second != first)
        #expect(try db.restTimer(exerciseId: e, workoutId: second) == nil)
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 190, at: day(3, hour: 10))
        let timer = try #require(try db.restTimer(exerciseId: e, workoutId: second))
        #expect(timer.startedAt == day(3, hour: 10))
        #expect(timer.setCount == 1)
    }
}

@Suite("Logging help: clocks")
struct LoggingClockTests {
    @Test("Clocks: whole seconds, floored, never below 0")
    func elapsed() throws {
        #expect(try LoggingClock.elapsedSeconds(from: t0, to: t0.addingTimeInterval(59.9)) == 59)
        #expect(try LoggingClock.elapsedSeconds(from: t0, to: t0.addingTimeInterval(3723)) == 3723)
        #expect(try LoggingClock.elapsedSeconds(from: t0, to: t0.addingTimeInterval(-30)) == 0)
    }

    @Test("Rest timer text: m:ss, minutes not capped", arguments: [
        (0, "0:00"), (5, "0:05"), (65, "1:05"), (125, "2:05"), (3700, "61:40"),
    ])
    func restText(_ c: (Int, String)) throws {
        #expect(try LoggingClock.restText(c.0) == c.1)
    }

    @Test("Workout clock text: mm:ss under an hour, then h:mm:ss", arguments: [
        (0, "00:00"), (330, "05:30"), (3599, "59:59"), (3600, "1:00:00"), (3723, "1:02:03"), (36000, "10:00:00"),
    ])
    func workoutText(_ c: (Int, String)) throws {
        #expect(try LoggingClock.workoutText(c.0) == c.1)
    }

    @Test("Workout clock: counts from the workout's start, also after a relaunch")
    func workoutClockRelaunch() throws {
        let tmp = try TempDB()
        _ = try tmp.open().benchWorkout(start: t0)
        let resumed = try #require(try tmp.open().inProgressWorkout())
        let seconds = try LoggingClock.elapsedSeconds(from: resumed.startedAt, to: t0.addingTimeInterval(1530))
        #expect(seconds == 1530)
        #expect(try LoggingClock.workoutText(seconds) == "25:30")
    }
}

@Suite("Logging help: last time")
struct LastTimeTests {
    @Test("Last time: none for an exercise never logged")
    func neverLogged() throws {
        let db = try TempDB().open()
        #expect(try db.lastTime(definitionId: benchPressId, includeIntensity: true) == nil)
        // Logged only in the open workout: still the first time.
        let (_, e) = try db.benchWorkout()
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 185, at: t0)
        #expect(try db.lastTime(definitionId: benchPressId, includeIntensity: true) == nil)
    }

    @Test("Last time: the latest finished workout, not the open one")
    func latestFinished() throws {
        let db = try TempDB().open()
        let (old, e1) = try db.benchWorkout(start: day(1))
        _ = try db.logSet(exerciseId: e1, reps: 5, weight: 135, at: day(1))
        try db.finishWorkout(old, at: day(1, hour: 10))
        let (mid, e2) = try db.benchWorkout(start: day(2))
        _ = try db.logSet(exerciseId: e2, reps: 5, weight: 155, rpe: 8, at: day(2))
        _ = try db.logSet(exerciseId: e2, reps: 5, weight: 155, rpe: 8, at: day(2))
        try db.finishWorkout(mid, at: day(2, hour: 10))
        let (_, e3) = try db.benchWorkout(start: day(3))
        _ = try db.logSet(exerciseId: e3, reps: 5, weight: 225, at: day(3))
        let last = try #require(try db.lastTime(definitionId: benchPressId, includeIntensity: true))
        #expect(last.summary == "155 lbs × 5 × 2 @ RPE 8")
        #expect(last.completedAt == day(2, hour: 10))
        #expect(last.workoutName == "Open Workout")
        #expect(last.fill == Prefill(reps: "5", weight: "155", weightUnit: "lbs", rpe: "8", rir: ""))
    }

    @Test("Last time: a tap fills the next set like the prefill, with the program workout's name")
    func tapMatchesPrefill() throws {
        let db = try TempDB().open()
        let program = try db.activeProgram(Plans.single(benchPressId, [PlannedSet(reps: "5"), PlannedSet(reps: "5")], name: "Block"))
        let workoutId = try program.workoutId(week: 1, day: 1)
        let first = try db.startProgramWorkout(workoutId, at: day(1))
        let e = try db.programSession(first).exercises.at(0).id
        _ = try db.logSet(exerciseId: e, reps: 6, weight: 102.5, unit: "kg", rir: 1, at: day(1, hour: 10))
        try db.finishWorkout(first, at: day(1, hour: 11))
        _ = try db.startProgramWorkout(workoutId, at: day(3))
        let last = try #require(try db.lastTime(definitionId: benchPressId, includeIntensity: true))
        #expect(last.workoutName == "Only")
        #expect(last.fill == Prefill(reps: "6", weight: "102.5", weightUnit: "kg", rpe: "", rir: "1"))
        #expect(last.fill == (try db.prefill(exerciseId: e, setNumber: 1)))
    }
}

@Suite("Logging help: effort and warm-ups")
struct EffortWarmupTests {
    @Test("Effort: RPE or RIR saved on the set and read back; blank stays blank")
    func savedAndReadBack() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let (w, e) = try db.benchWorkout()
        let a = try db.logSet(exerciseId: e, reps: 5, weight: 185, rpe: 8, at: t0)
        let b = try db.logSet(exerciseId: e, reps: 5, weight: 185, rir: 2, at: t0.addingTimeInterval(120))
        let c = try db.logSet(exerciseId: e, reps: 5, weight: 185, at: t0.addingTimeInterval(240))
        let again = try tmp.open()
        #expect(try again.set(a, in: w).rpe == 8)
        #expect(try again.set(a, in: w).rir == nil)
        #expect(try again.set(b, in: w).rir == 2)
        #expect(try again.set(b, in: w).rpe == nil)
        #expect(try again.set(c, in: w).rpe == nil)
        #expect(try again.set(c, in: w).rir == nil)
        #expect(try again.set(a, in: w).isWarmup == false)
    }

    @Test("Effort: shown in history and counted in Progress's effort number")
    func historyAndProgress() throws {
        let db = try TempDB().open()
        let (w, e) = try db.benchWorkout()
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 185, rpe: 8, at: t0)
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 185, rpe: 9, at: t0.addingTimeInterval(120))
        try db.finishWorkout(w, at: t0.addingTimeInterval(3600))
        let sets = try db.exerciseHistory(definitionId: benchPressId).at(0).workingSets
        #expect(sets.map(\.rpe) == [8, 9])
        let week = try ProgressCalendar.weekStart(for: t0, timeZone: Clock.tz)
        let report = try db.weeklyReport(weekStart: week, timeZone: Clock.tz, now: t0.addingTimeInterval(7200), unit: .lbs, target: 3)
        let effort = try #require(report.current.effort)
        #expect(effort.ratedSets == 2)
        #expect(effort.avgRpe == 8.5)
    }

    @Test("Effort: a planned RPE or RIR is offered as the default", arguments: [
        (PlannedSet(reps: "5", rpe: 8), "8", ""), (PlannedSet(reps: "5", rir: 2), "", "2"),
    ])
    func plannedDefault(_ c: (PlannedSet, String, String)) throws {
        let db = try TempDB().open()
        let program = try db.activeProgram(Plans.single(benchPressId, [c.0]))
        let session = try db.startProgramWorkout(try program.workoutId(week: 1, day: 1), at: day(1))
        let e = try db.programSession(session).exercises.at(0).id
        let p = try db.prefill(exerciseId: e, setNumber: 1)
        #expect(p.rpe == c.1)
        #expect(p.rir == c.2)
    }

    @Test("Warm-up: logged as a warm-up, and a logged set can be marked and unmarked")
    func warmupSaved() throws {
        let db = try TempDB().open()
        let (w, e) = try db.benchWorkout()
        let warm = try db.logSet(exerciseId: e, reps: 8, weight: 95, isWarmup: true, at: t0)
        let work = try db.logSet(exerciseId: e, reps: 5, weight: 185, at: t0.addingTimeInterval(120))
        #expect(try db.set(warm, in: w).isWarmup)
        #expect(try db.set(work, in: w).isWarmup == false)
        try db.setWarmup(work, true)
        #expect(try db.set(work, in: w).isWarmup)
        try db.setWarmup(work, false)
        #expect(try db.set(work, in: w).isWarmup == false)
    }

    @Test("Warm-up: tucked away in history and left out of e1RM, last time and records")
    func warmupLeftOut() throws {
        let db = try TempDB().open()
        let (w, e) = try db.benchWorkout()
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 300, isWarmup: true, at: t0)
        let work = try db.logSet(exerciseId: e, reps: 5, weight: 200, at: t0.addingTimeInterval(120))
        let marked = try db.logSet(exerciseId: e, reps: 5, weight: 250, at: t0.addingTimeInterval(240))
        try db.setWarmup(marked, true)
        try db.finishWorkout(w, at: t0.addingTimeInterval(3600))
        _ = work

        let session = try db.exerciseHistory(definitionId: benchPressId).at(0)
        #expect(session.workingSets.map(\.weight) == [200])
        #expect(session.warmupSets.map(\.weight) == [300, 250])
        #expect(abs((session.e1rm ?? 0) - 200 * (1 + 5.0 / 30)) < 1e-9)
        #expect(session.isPR == false)

        let last = try #require(try db.lastTime(definitionId: benchPressId, includeIntensity: true))
        #expect(last.summary == "200 lbs × 5 × 1")   // the web counts a lone set too
        #expect(last.fill?.weight == "200")

        let week = try ProgressCalendar.weekStart(for: t0, timeZone: Clock.tz)
        let report = try db.weeklyReport(weekStart: week, timeZone: Clock.tz, now: t0.addingTimeInterval(7200), unit: .lbs, target: 3)
        #expect(report.current.workingSets == 1)
        let lift = try #require(try db.liftHistory(benchPressId, timeZone: Clock.tz, now: t0.addingTimeInterval(7200), unit: .lbs))
        #expect(try lift.sessions.at(0).topSet == WeightReps(weight: 200, reps: 5))
    }
}
