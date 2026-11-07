// Scenarios: "A workout in progress survives the app closing", "Discard an unfinished workout".
// "Closed and reopened" = a new AppDatabase opened on the same file.
//
// API used:
// - inProgressWorkout(), discardWorkout(_:), history(), workout(_:)

import Foundation
import Testing
@testable import RipitCore

@Suite("Resume and discard")
struct ResumeDiscardTests {
    let start = Clock.at(2026, 11, 7, 17)

    @Test("Resume: after closing and reopening, the unfinished workout is offered with its set")
    func resumeAfterReopen() throws {
        let tmp = try TempDB()
        let w = try tmp.open().makeWorkout(start: start, finish: nil, [(benchPressId, [(8, "135lbs")])])

        let reopened = try tmp.open()
        let resume = try #require(try reopened.inProgressWorkout())
        #expect(resume.id == w)
        #expect(resume.completedAt == nil)
        #expect(abs(resume.startedAt.timeIntervalSince(start)) < 1)
        #expect(resume.exercises.map(\.name) == ["Barbell Bench Press"])
        #expect(resume.exercises.first?.sets.map(\.weight) == ["135lbs"])
        #expect(resume.exercises.first?.sets.map(\.reps) == [8])
        #expect(try reopened.history().isEmpty, "an unfinished workout is not history")
    }

    @Test("Resume: logging continues after reopening and the workout can be finished")
    func continueAfterReopen() throws {
        let tmp = try TempDB()
        let w = try tmp.open().makeWorkout(start: start, finish: nil, [(benchPressId, [(8, "135lbs")])])
        let db = try tmp.open()
        let e = try #require(try db.inProgressWorkout()?.exercises.first?.id)
        _ = try db.logSet(exerciseId: e, reps: 5, weight: "155lbs")
        try db.finishWorkout(w, at: start.addingTimeInterval(1800))
        #expect(try db.inProgressWorkout() == nil)
        #expect(try db.history().map(\.setCount) == [2])
        #expect(try db.workout(w).exercises.first?.sets.map(\.setNumber) == [1, 2])
    }

    @Test("Resume: a finished workout is not offered")
    func finishedNotOffered() throws {
        let tmp = try TempDB()
        try tmp.open().makeWorkout(start: start, finish: start.addingTimeInterval(60), [(benchPressId, [(8, "135lbs")])])
        #expect(try tmp.open().inProgressWorkout() == nil)
    }

    @Test("Discard: the unfinished workout is gone and history is unchanged")
    func discardKeepsHistory() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let done = try db.makeWorkout(start: Clock.at(2026, 11, 6, 9), finish: Clock.at(2026, 11, 6, 10),
                                      [(benchPressId, [(8, "135lbs"), (5, "155lbs")])])
        let before = try db.history()
        let draft = try db.makeWorkout(start: start, finish: nil, [(benchPressId, [(3, "175lbs")]), ("ex_bw_034", [(10, "BW")])])

        try db.discardWorkout(draft)

        let reopened = try tmp.open()
        #expect(try reopened.inProgressWorkout() == nil)
        #expect(try reopened.history() == before)
        #expect(try reopened.workout(done).exercises.first?.sets.count == 2)
        #expect(throws: (any Error).self) { try reopened.workout(draft) }
    }

    @Test("Discard: its exercises and sets are deleted too, nothing else")
    func discardLeavesNoOrphans() throws {
        let db = try TempDB().open()
        try db.makeWorkout(start: Clock.at(2026, 11, 6, 9), finish: Clock.at(2026, 11, 6, 10), [(benchPressId, [(8, "135lbs")])])
        let draft = try db.makeWorkout(start: start, finish: nil, [(benchPressId, [(3, "175lbs"), (3, "175lbs")]), ("ex_bw_034", [(10, "BW")])])
        try db.discardWorkout(draft)
        #expect(try db.count("loggedSet") == 1)
        #expect(try db.count("exercise") == 1)
        #expect(try db.count("exerciseDefinition") >= 312, "discard must not touch the catalog")
    }
}
