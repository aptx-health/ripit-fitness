// Scenarios: "Summary after Finish", "Save an ad-hoc workout to repeat", "Manage a saved workout",
// "Start a saved workout", "Training shows Pinned and Recent", "Repeat a finished workout":
// the phone-only parts the web golden can't show. Workouts here are built on the phone, the
// clock is passed in, and "after relaunch" = a new AppDatabase opened on the same file.
//
// API used:
// - workoutRollup(_:now:), WorkoutRollup.text(), saveWorkout(fromCompletion:name:notes:at:)
// - savedWorkout(_:), savedWorkoutPlan(_:), savedWorkoutGroups(now:), pinSavedWorkout(_:at:),
//   archiveSavedWorkout(_:at:), deleteSavedWorkout(_:), startSavedWorkout(_:at:), repeatWorkout(_:at:)
// - trainingRecent(), trainingPinned()
// - slice 1: startWorkout(at:), addExercise(definitionId:to:), finishWorkout(_:at:), inProgressWorkout(),
//   history(), workout(_:); slice 5: logSet(exerciseId:reps:weight:unit:rpe:rir:isWarmup:at:)

import Foundation
import GRDB
import Testing
@testable import RipitCore

private let pullupId = "cmiz7vkvr0008vr0m7rv3dapc"   // Pull-Up

extension AppDatabase {
    /// Bench: a warm-up and two working sets, then rows; finished 5 m 03 s after `start`.
    fileprivate func benchAndRows(start: Date) throws -> String {
        let w = try startWorkout(at: start)
        let bench = try addExercise(definitionId: benchPressId, to: w)
        _ = try logSet(exerciseId: bench, reps: 10, weight: 45, isWarmup: true, at: start.addingTimeInterval(30))
        _ = try logSet(exerciseId: bench, reps: 5, weight: 185, rpe: 8, at: start.addingTimeInterval(90))
        _ = try logSet(exerciseId: bench, reps: 5, weight: 185, rpe: 9, at: start.addingTimeInterval(180))
        let row = try addExercise(definitionId: rowId, to: w)
        _ = try logSet(exerciseId: row, reps: 8, weight: 135, rir: 2, at: start.addingTimeInterval(240))
        try finishWorkout(w, at: start.addingTimeInterval(303))
        return w
    }
}

@Suite("Saved workouts on the phone")
struct SavedWorkoutsTests {
    let start = Clock.at(2026, 11, 7, 9)
    var now: Date { start.addingTimeInterval(3600) }

    // MARK: Summary

    @Test("Summary: a workout logged on the phone gets the web's summary after Finish")
    func summaryOfPhoneWorkout() throws {
        let db = try TempDB().open()
        let w = try db.benchAndRows(start: start)
        let rollup = try #require(try db.workoutRollup(w, now: now))
        #expect(rollup.durationSeconds == 303)
        #expect(rollup.workingSetCount == 3, "the warm-up is not a working set")
        #expect(rollup.totalVolumeLbs == 185 * 10 + 135 * 8)
        #expect(rollup.exercises.map(\.exerciseDefinitionId) == [benchPressId, rowId])
        #expect(rollup.lifetimeWorkoutCount == 1)
        let text = try rollup.text()
        #expect(text.tiles.first == RollupTile(label: "Volume (lbs)", value: "2,930"))
        #expect(text.tiles.last == RollupTile(label: "Duration", value: "5m 03s"))
        #expect(text.canSave)
    }

    @Test("Summary: an unfinished workout has none")
    func noSummaryWhileOpen() throws {
        let db = try TempDB().open()
        let w = try db.makeWorkout(start: start, finish: nil, [(benchPressId, [(5, 185)])])
        #expect(try db.workoutRollup(w, now: now) == nil)
    }

    @Test("Summary: Last 7 Days counts back from the `now` passed in")
    func lastSevenDaysUsesNow() throws {
        let db = try TempDB().open()
        let older = try db.benchAndRows(start: start.addingTimeInterval(-8 * 86_400))
        let w = try db.benchAndRows(start: start)
        #expect(try db.workoutRollup(w, now: now)?.workoutsLast7Days == 1)
        #expect(try db.workoutRollup(w, now: start.addingTimeInterval(-86_400))?.workoutsLast7Days == 2)
        #expect(try db.workoutRollup(older, now: now)?.lifetimeWorkoutCount == 2)
    }

    // MARK: Saving

    @Test("Save: kept after relaunch, saved now, last used when the workout finished, in Recent")
    func saveSurvivesRelaunch() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let w = try db.benchAndRows(start: start)
        let id = try db.saveWorkout(fromCompletion: w, name: " Bench day ", notes: " slow negatives ", at: now)

        let reopened = try tmp.open()
        let saved = try #require(try reopened.savedWorkout(id))
        #expect(saved.name == "Bench day")
        #expect(saved.notes == "slow negatives")
        #expect(saved.origin == "session")
        #expect(abs(saved.createdAt.timeIntervalSince(now)) < 1)
        #expect(abs(try #require(saved.lastUsedAt).timeIntervalSince(start.addingTimeInterval(303))) < 1)
        #expect(saved.exerciseCount == 2)
        #expect(try reopened.savedWorkoutGroups(now: now).recent.map(\.id) == [id])
        let plan = try reopened.savedWorkoutPlan(id)
        #expect(plan.map(\.exerciseDefinitionId) == [benchPressId, rowId])
        #expect(plan.first?.sets == [
            SavedSet(setNumber: 1, reps: "10", rir: nil, rpe: nil, isWarmup: true),
            SavedSet(setNumber: 2, reps: "5", rir: nil, rpe: 8, isWarmup: false),
            SavedSet(setNumber: 3, reps: "5", rir: nil, rpe: 9, isWarmup: false),
        ])
        #expect(plan.last?.sets == [SavedSet(setNumber: 1, reps: "8", rir: 2, rpe: nil, isWarmup: false)])
    }

    @Test("Save: an unfinished workout is refused, and nothing is saved")
    func saveOpenRefused() throws {
        let db = try TempDB().open()
        let w = try db.makeWorkout(start: start, finish: nil, [(benchPressId, [(5, 185)])])
        #expect(throws: SavedWorkoutError.notFinished) { try db.saveWorkout(fromCompletion: w, name: "Open", notes: nil, at: now) }
        #expect(try db.count("savedWorkout") == 0)
    }

    @Test("Save: an unknown workout is not found")
    func saveUnknown() throws {
        let db = try TempDB().open()
        expectNotFound("unknown workout") { _ = try db.saveWorkout(fromCompletion: "nope", name: "X", notes: nil, at: now) }
    }

    // MARK: Managing

    @Test("Manage: pin and archive stay that way after relaunch")
    func manageSurvivesRelaunch() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let a = try db.saveWorkout(fromCompletion: try db.benchAndRows(start: start), name: "A", notes: nil, at: now)
        let b = try db.saveWorkout(fromCompletion: try db.benchAndRows(start: start.addingTimeInterval(-7200)), name: "B", notes: nil, at: now)
        try db.pinSavedWorkout(a, at: now)
        try db.archiveSavedWorkout(b, at: now)

        let groups = try tmp.open().savedWorkoutGroups(now: now)
        #expect(groups.pinned.map(\.id) == [a])
        #expect(groups.archived.map(\.id) == [b])
        #expect(groups.recent.isEmpty && groups.older.isEmpty && groups.new.isEmpty)
    }

    @Test("Manage: deleting a saved workout keeps the workouts started from it")
    func deleteKeepsHistory() throws {
        let db = try TempDB().open()
        let saved = try db.saveWorkout(fromCompletion: try db.benchAndRows(start: start), name: "A", notes: nil, at: now)
        let w = try db.startSavedWorkout(saved, at: now)
        _ = try db.logSet(exerciseId: try #require(try db.workout(w).exercises.first?.id), reps: 5, weight: 185, at: now.addingTimeInterval(60))
        try db.finishWorkout(w, at: now.addingTimeInterval(600))
        try db.deleteSavedWorkout(saved)
        #expect(try db.savedWorkout(saved) == nil)
        #expect(try db.history().map(\.id).contains(w))
        #expect(try db.workoutRollup(w, now: now.addingTimeInterval(600)) != nil)
    }

    // MARK: Start and repeat

    @Test("Start: the workout opens with the plan, logs and finishes like any ad-hoc workout")
    func startThenLog() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let saved = try db.saveWorkout(fromCompletion: try db.benchAndRows(start: start), name: "Bench day", notes: nil, at: now)
        let later = now.addingTimeInterval(86_400)
        let w = try db.startSavedWorkout(saved, at: later)

        let open = try #require(try tmp.open().inProgressWorkout(), "the started workout is the open one, after relaunch too")
        #expect(open.id == w)
        #expect(open.exercises.map(\.definitionId) == [benchPressId, rowId])
        #expect(open.exercises.map { $0.planned.map(\.reps) } == [["10", "5", "5"], ["8"]])
        #expect(open.exercises.first?.planned.map(\.isWarmup) == [true, false, false])
        #expect(open.exercises.allSatisfy { $0.sets.isEmpty }, "nothing logged yet")
        #expect(abs(try #require(try db.savedWorkout(saved)?.lastUsedAt).timeIntervalSince(later)) < 1)

        _ = try db.logSet(exerciseId: open.exercises[0].id, reps: 5, weight: 190, at: later.addingTimeInterval(60))
        try db.finishWorkout(w, at: later.addingTimeInterval(900))
        let entry = try #require(try db.history().first)
        #expect(entry.id == w)
        #expect(entry.name == "Bench day")
    }

    @Test("Start and repeat: refused while a workout is open, and nothing changes")
    func refusedWhileOpen() throws {
        let db = try TempDB().open()
        let done = try db.benchAndRows(start: start)
        let saved = try db.saveWorkout(fromCompletion: done, name: "A", notes: nil, at: now)
        let before = try db.savedWorkout(saved)
        let open = try db.makeWorkout(start: now, finish: nil, [(pullupId, [(8, 0)])])
        let completions = try db.count("workoutCompletion")

        #expect(throws: SavedWorkoutError.workoutOpen(open)) { try db.startSavedWorkout(saved, at: now) }
        #expect(throws: SavedWorkoutError.workoutOpen(open)) { try db.repeatWorkout(done, at: now) }
        #expect(try db.count("workoutCompletion") == completions)
        #expect(try db.savedWorkout(saved) == before, "lastUsedAt unchanged")
        #expect(try db.inProgressWorkout()?.id == open)
    }

    @Test("Repeat: a phone workout repeats with the same exercises and sets, no weights, not linked to a saved workout")
    func repeatPhoneWorkout() throws {
        let db = try TempDB().open()
        let done = try db.benchAndRows(start: start)
        let w = try db.repeatWorkout(done, at: now)
        let open = try #require(try db.inProgressWorkout())
        #expect(open.id == w)
        #expect(open.exercises.map(\.definitionId) == [benchPressId, rowId])
        #expect(open.exercises.map { $0.planned.map(\.reps) } == [["10", "5", "5"], ["8"]])
        #expect(open.exercises.flatMap(\.planned).allSatisfy { $0.weight == nil })
        let link = try db.read { try String.fetchOne($0, sql: "SELECT savedWorkoutId FROM workoutCompletion WHERE id = ?", arguments: [w]) }
        #expect(link == nil)
        #expect(try db.count("savedWorkout") == 0)
    }

    // MARK: Training

    @Test("Training: the open workout isn't recent; a phone workout is, newest first, with Repeat")
    func trainingRecent() throws {
        let db = try TempDB().open()
        let first = try db.benchAndRows(start: start)
        let second = try db.benchAndRows(start: start.addingTimeInterval(3600))
        _ = try db.makeWorkout(start: now.addingTimeInterval(3600), finish: nil, [(pullupId, [(8, 0)])])
        let recent = try db.trainingRecent()
        #expect(recent.map(\.id) == [second, first])
        #expect(recent.map(\.name) == ["Open Workout", "Open Workout"])
        #expect(recent.allSatisfy { $0.canRepeat && $0.durationSeconds == 303 })
    }

    @Test("Training: a pin made on the phone shows, newest pin first")
    func trainingPinned() throws {
        let db = try TempDB().open()
        let a = try db.saveWorkout(fromCompletion: try db.benchAndRows(start: start), name: "A", notes: nil, at: now)
        let b = try db.saveWorkout(fromCompletion: try db.benchAndRows(start: start.addingTimeInterval(-7200)), name: "B", notes: nil, at: now)
        try db.pinSavedWorkout(a, at: now)
        try db.pinSavedWorkout(b, at: now.addingTimeInterval(60))
        #expect(try db.trainingPinned().map(\.id) == [b, a])
        #expect(try db.trainingPinned().map(\.exerciseCount) == [2, 2])
    }
}
