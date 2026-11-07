// Scenarios: "Log an ad-hoc workout", "Weight stays free text".
//
// API used:
// - startWorkout(at:), addExercise(definitionId:to:), logSet(exerciseId:reps:weight:),
//   finishWorkout(_:at:), history(), workout(_:)

import Foundation
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
        _ = try db.logSet(exerciseId: e, reps: 8, weight: "135lbs")
        _ = try db.logSet(exerciseId: e, reps: 5, weight: "155lbs")
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
                                   [(benchPressId, [(8, "135lbs"), (5, "155lbs")])])
        let detail = try db.workout(w)
        #expect(detail.completedAt != nil)
        try #require(detail.exercises.count == 1)
        let ex = detail.exercises[0]
        #expect(ex.name == "Barbell Bench Press")
        #expect(ex.definitionId == benchPressId)
        #expect(ex.sets.map(\.setNumber) == [1, 2])
        #expect(ex.sets.map(\.reps) == [8, 5])
        #expect(ex.sets.map(\.weight) == ["135lbs", "155lbs"])
    }

    @Test("Log an ad-hoc workout: a late-evening workout stays on its local day")
    func lateEveningStaysToday() throws {
        // 23:30 in Denver is 06:30 UTC the next day.
        let late = Clock.at(2026, 11, 7, 23, 30)
        let db = try TempDB().open()
        try db.makeWorkout(start: late.addingTimeInterval(-1800), finish: late, [(benchPressId, [(5, "185lbs")])])
        let entry = try #require(try db.history().first)
        #expect(abs(entry.completedAt.timeIntervalSince(late)) < 1)
        #expect(Clock.sameLocalDay(entry.completedAt, Clock.at(2026, 11, 7, 12)))
    }

    @Test("History lists finished workouts newest first, and only finished ones")
    func historyNewestFirst() throws {
        let db = try TempDB().open()
        let older = try db.makeWorkout(start: Clock.at(2026, 11, 5, 9), finish: Clock.at(2026, 11, 5, 10), [(benchPressId, [(5, "135lbs")])])
        let newer = try db.makeWorkout(start: Clock.at(2026, 11, 6, 9), finish: Clock.at(2026, 11, 6, 10), [(benchPressId, [(5, "140lbs")])])
        _ = try db.makeWorkout(start: Clock.at(2026, 11, 7, 9), finish: nil, [(benchPressId, [(5, "145lbs")])])
        #expect(try db.history().map(\.id) == [newer, older])
    }

    // ---- Weight stays free text

    @Test("Weight stays free text: saved and shown exactly as typed",
          arguments: ["RPE 8", "65%", "135lbs", "60 kg", "BW+25", "2x24kg KB"])
    func freeTextWeight(_ weight: String) throws {
        let tmp = try TempDB()
        let w = try tmp.open().makeWorkout(start: today, finish: today.addingTimeInterval(60), [(benchPressId, [(8, weight)])])
        let reopened = try tmp.open()
        #expect(try reopened.workout(w).exercises.first?.sets.first?.weight == weight)
    }

    @Test("Weight stays free text: \"RPE 8\" is not turned into a number")
    func rpeNotParsed() throws {
        let db = try TempDB().open()
        let w = try db.makeWorkout(start: today, finish: nil, [(benchPressId, [(8, "RPE 8")])])
        let stored = try db.read { try String.fetchAll($0, sql: "SELECT CAST(weight AS TEXT) FROM loggedSet") }
        #expect(stored == ["RPE 8"])
        #expect(try db.workout(w).exercises.first?.sets.first?.weight == "RPE 8")
    }
}
