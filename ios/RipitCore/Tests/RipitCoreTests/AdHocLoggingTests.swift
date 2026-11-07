// Scenarios: "Log an ad-hoc workout", "Logged weight is a number with a unit, like the web app".
//
// API used:
// - startWorkout(at:), addExercise(definitionId:to:), logSet(exerciseId:reps:weight:unit:),
//   finishWorkout(_:at:), history(), workout(_:)

import Foundation
import GRDB
import Testing
@testable import RipitCore

@Suite("Logging an ad-hoc workout")
struct AdHocLoggingTests {
    let today = Clock.at(2026, 11, 7, 18, 0)

    @Test("Log an ad-hoc workout: history shows one workout dated today with 1 exercise and 2 sets")
    func logAdHocWorkout() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: today)
        let e = try db.addExercise(definitionId: benchPressId, to: w)
        _ = try db.logSet(exerciseId: e, reps: 8, weight: 135)
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 155)
        let finish = today.addingTimeInterval(45 * 60)
        try db.finishWorkout(w, at: finish)

        let history = try db.history()
        try #require(history.count == 1)
        #expect(history[0].id == w)
        #expect(history[0].exerciseCount == 1)
        #expect(history[0].setCount == 2)
        #expect(abs(history[0].completedAt.timeIntervalSince(finish)) < 1)
        #expect(Clock.sameLocalDay(history[0].completedAt, today))
    }

    @Test("Log an ad-hoc workout: the detail keeps the exercise name and the sets in order")
    func detailKeepsSets() throws {
        let db = try TempDB().open()
        let w = try db.makeWorkout(start: today, finish: today.addingTimeInterval(60),
                                   [(benchPressId, [(8, 135), (5, 155)])])
        let detail = try db.workout(w)
        #expect(detail.completedAt != nil)
        try #require(detail.exercises.count == 1)
        let ex = detail.exercises[0]
        #expect(ex.name == "Barbell Bench Press")
        #expect(ex.definitionId == benchPressId)
        #expect(ex.sets.map(\.setNumber) == [1, 2])
        #expect(ex.sets.map(\.reps) == [8, 5])
        #expect(ex.sets.map(\.weight) == [135, 155])
    }

    @Test("Log an ad-hoc workout: a late-evening workout stays on its local day")
    func lateEveningStaysToday() throws {
        // 23:30 in Denver is 06:30 UTC the next day.
        let late = Clock.at(2026, 11, 7, 23, 30)
        let db = try TempDB().open()
        try db.makeWorkout(start: late.addingTimeInterval(-1800), finish: late, [(benchPressId, [(5, 185)])])
        let entry = try #require(try db.history().first)
        #expect(abs(entry.completedAt.timeIntervalSince(late)) < 1)
        #expect(Clock.sameLocalDay(entry.completedAt, Clock.at(2026, 11, 7, 12)))
    }

    @Test("History lists finished workouts newest first, and only finished ones")
    func historyNewestFirst() throws {
        let db = try TempDB().open()
        let older = try db.makeWorkout(start: Clock.at(2026, 11, 5, 9), finish: Clock.at(2026, 11, 5, 10), [(benchPressId, [(5, 135)])])
        let newer = try db.makeWorkout(start: Clock.at(2026, 11, 6, 9), finish: Clock.at(2026, 11, 6, 10), [(benchPressId, [(5, 140)])])
        _ = try db.makeWorkout(start: Clock.at(2026, 11, 7, 9), finish: nil, [(benchPressId, [(5, 145)])])
        #expect(try db.history().map(\.id) == [newer, older])
    }

    // ---- Logged weight is a number with a unit, like the web app

    @Test("Logged weight: 62.5 kg x 5 is saved as weight 62.5, unit \"kg\", reps 5")
    func numberWithUnit() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let w = try db.startWorkout(at: today)
        let e = try db.addExercise(definitionId: benchPressId, to: w)
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 62.5, unit: "kg")
        let set = try #require(try tmp.open().workout(w).exercises.first?.sets.first)
        #expect(set.weight == 62.5)
        #expect(set.weightUnit == "kg")
        #expect(set.reps == 5)
    }

    @Test("Logged weight: a set logged with no unit defaults to \"lbs\"")
    func unitDefaultsToLbs() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let w = try db.startWorkout(at: today)
        let e = try db.addExercise(definitionId: benchPressId, to: w)
        _ = try db.logSet(exerciseId: e, reps: 8, weight: 135)
        let set = try #require(try tmp.open().workout(w).exercises.first?.sets.first)
        #expect(set.weight == 135)
        #expect(set.weightUnit == "lbs")
    }

    @Test("Logged weight: fractional and zero (bodyweight) values round-trip exactly",
          arguments: [(0.0, "lbs"), (2.5, "kg"), (102.25, "lbs"), (62.5, "kg")])
    func roundTrip(_ weight: Double, _ unit: String) throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let w = try db.startWorkout(at: today)
        let e = try db.addExercise(definitionId: benchPressId, to: w)
        _ = try db.logSet(exerciseId: e, reps: 3, weight: weight, unit: unit)
        let set = try #require(try tmp.open().workout(w).exercises.first?.sets.first)
        #expect(set.weight == weight)
        #expect(set.weightUnit == unit)
    }

    @Test("Logged weight: stored like the web schema, a REAL weight and a weightUnit column")
    func storedAsRealWithUnit() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: today)
        let e = try db.addExercise(definitionId: benchPressId, to: w)
        _ = try db.logSet(exerciseId: e, reps: 5, weight: 62.5, unit: "kg")
        // CAST keeps decoding safe: a Row subscript that cannot decode would crash the test run.
        let row = try #require(try db.read { try Row.fetchOne($0, sql: """
            SELECT typeof(weight) AS t, CAST(weight AS REAL) AS w, CAST(weightUnit AS TEXT) AS u, CAST(reps AS INTEGER) AS r
            FROM loggedSet
            """) })
        #expect(row["t"] as String? == "real")
        #expect(row["w"] as Double? == 62.5)
        #expect(row["u"] as String? == "kg")
        #expect(row["r"] as Int? == 5)
    }
}
