// Scenarios: "Up Next is the first unfinished workout of the current week",
// "Finishing a week moves me to the next week", "Finishing the program offers a restart".
// Oracle: lib/db/current-week.ts, lib/training/home.ts, lib/db/program-completion.ts,
// lib/db/program-restart.ts. Done = a non-archived completion with status 'completed'; a draft
// is not done. Restart archives the old cycle's completions (isArchived = 1) like the web, and
// also raises the cycle number, which the web does not.
//
// API used:
// - currentWeek(), upNext(), programProgress(_:), restartProgram(_:), startProgramWorkout(_:at:),
//   programSession(_:)
// - slice 1: finishWorkout(_:at:), history(), workout(_:)

import Foundation
import GRDB
import Testing
@testable import RipitCore

@Suite("Programs: current week, Up Next, completion and restart")
struct ProgramScheduleTests {
    // ---- Up Next

    @Test("Up Next: with nothing done it is week 1, workout 1")
    func upNextFresh() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        #expect(try db.upNext() == UpNext(programId: p.id, workoutId: p.workoutId(week: 1, day: 1), workoutName: "Day 1",
                                          weekNumber: 1, dayNumber: 1, hasDraft: false))
        #expect(try db.currentWeek() == 1)
    }

    @Test("Up Next: after finishing the first workout it is week 1, workout 2, and the current week is 1")
    func upNextAfterFirst() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let p = try db.activeProgram()
        try db.complete(p.workoutId(week: 1, day: 1), at: day(1))
        let reopened = try tmp.open()
        let next = try #require(try reopened.upNext())
        #expect(try next.workoutId == p.workoutId(week: 1, day: 2))
        #expect((next.weekNumber, next.dayNumber) == (1, 2))
        #expect(next.workoutName == "Day 2")
        #expect(try reopened.currentWeek() == 1)
    }

    @Test("Up Next: finishing out of order points back at the earliest unfinished workout")
    func upNextOutOfOrder() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        try db.complete(p.workoutId(week: 1, day: 2), at: day(1))
        #expect(try db.upNext()?.workoutId == p.workoutId(week: 1, day: 1))
        try db.complete(p.workoutId(week: 1, day: 1), at: day(2))
        #expect(try db.upNext()?.workoutId == p.workoutId(week: 1, day: 3))
    }

    @Test("Up Next: an unfinished session does not count as done, and shows as a draft")
    func upNextDraftNotDone() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let session = try db.startProgramWorkout(p.workoutId(week: 1, day: 1), at: day(1))
        _ = try db.logSet(exerciseId: try db.programSession(session).exercises.at(0).id, reps: 5, weight: 135)
        let next = try #require(try db.upNext())
        #expect(try next.workoutId == p.workoutId(week: 1, day: 1))
        #expect(next.hasDraft == true)
        #expect(try db.programProgress(p.id).doneWorkouts == 0)
    }

    @Test("Up Next: ad-hoc workouts don't move the program")
    func upNextIgnoresAdHoc() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        try db.makeWorkout(start: day(1), finish: day(1, hour: 10), [(benchPressId, [(5, 135)])])
        #expect(try db.upNext()?.workoutId == p.workoutId(week: 1, day: 1))
    }

    @Test("Archived: archived completions are ignored by Up Next, current week and progress")
    func archivedCompletionsIgnored() throws {
        // Imported files carry isArchived; set it directly with a test migration.
        let tmp = try TempDB()
        let db = try tmp.open()
        let p = try db.activeProgram()
        var sessions: [String] = []
        for d in 1...3 { sessions.append(try db.complete(p.workoutId(week: 1, day: d), at: day(d))) }
        try db.complete(p.workoutId(week: 2, day: 1), at: day(4))
        let ids = sessions
        let archived = try tmp.open(extra: [ExtraMigration("test-archive-week-1") { db in
            for id in ids { try db.execute(sql: "UPDATE workoutCompletion SET isArchived = 1 WHERE id = ?", arguments: [id]) }
        }])
        #expect(try archived.currentWeek() == 1)
        #expect(try archived.upNext()?.workoutId == p.workoutId(week: 1, day: 1))
        #expect(try archived.programProgress(p.id).doneWorkouts == 1)
        #expect(try archived.history().count == 4, "archived completions stay in history")
    }

    @Test("Up Next: no active program means no Up Next and no current week")
    func upNextNoActive() throws {
        let db = try TempDB().open()
        _ = try db.createProgram(Plans.standard())
        #expect(try db.upNext() == nil)
        #expect(try db.currentWeek() == nil)
    }

    // ---- Finishing a week

    @Test("Week: finishing every workout of week 1 makes week 2 current, Up Next its first workout")
    func weekAdvances() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        for d in 1...3 { try db.complete(p.workoutId(week: 1, day: d), at: day(d)) }
        #expect(try db.currentWeek() == 2)
        let next = try #require(try db.upNext())
        #expect(try next.workoutId == p.workoutId(week: 2, day: 1))
        #expect((next.weekNumber, next.dayNumber) == (2, 1))
    }

    @Test("Week: two of three done keeps week 1 current")
    func weekNotYet() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        for d in [1, 3] { try db.complete(p.workoutId(week: 1, day: d), at: day(d)) }
        #expect(try db.currentWeek() == 1)
        #expect(try db.upNext()?.workoutId == p.workoutId(week: 1, day: 2))
    }

    @Test("Week: a workout done in week 2 doesn't skip an unfinished week 1")
    func weekEarliestUnfinished() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        for d in 1...3 { try db.complete(p.workoutId(week: 2, day: d), at: day(d)) }
        try db.complete(p.workoutId(week: 1, day: 1), at: day(4))
        #expect(try db.currentWeek() == 1)
        #expect(try db.upNext()?.workoutId == p.workoutId(week: 1, day: 2))
    }

    // ---- Finishing the program and restarting

    func finishAll(_ db: AppDatabase, _ p: ProgramDetail) throws -> [String] {
        try p.allWorkoutIds.enumerated().map { i, w in try db.complete(w, at: day(i + 1)) }
    }

    @Test("Complete: after the last workout of the last week the program shows as complete")
    func programComplete() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let ids = p.allWorkoutIds
        for (i, w) in ids.dropLast().enumerated() { try db.complete(w, at: day(i + 1)) }
        #expect(try db.programProgress(p.id) == ProgramProgress(isComplete: false, totalWorkouts: 6, doneWorkouts: 5, cycleNumber: 1))
        try db.complete(ids.last!, at: day(6))
        #expect(try db.programProgress(p.id) == ProgramProgress(isComplete: true, totalWorkouts: 6, doneWorkouts: 6, cycleNumber: 1))
        #expect(try db.upNext() == nil)
        #expect(try db.currentWeek() == 2, "all done: the current week is the last week")
    }

    @Test("Complete: doing a workout twice counts it once")
    func repeatCountsOnce() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let w = try p.workoutId(week: 1, day: 1)
        try db.complete(w, at: day(1))
        try db.complete(w, at: day(2))
        #expect(try db.programProgress(p.id).doneWorkouts == 1)
        #expect(try db.upNext()?.workoutId == p.workoutId(week: 1, day: 2))
    }

    @Test("Restart: week 1 is current again, old completions are archived, the cycle goes up, history is kept")
    func restart() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let p = try db.activeProgram()
        let sessions = try finishAll(db, p)
        let historyBefore = try db.history()
        #expect(historyBefore.count == 6)

        try db.restartProgram(p.id)

        let reopened = try tmp.open()
        #expect(try reopened.programProgress(p.id) == ProgramProgress(isComplete: false, totalWorkouts: 6, doneWorkouts: 0, cycleNumber: 2))
        #expect(try reopened.currentWeek() == 1)
        #expect(try reopened.upNext()?.workoutId == p.workoutId(week: 1, day: 1))
        #expect(try reopened.history() == historyBefore)
        for s in sessions { #expect(try reopened.workout(s).exercises.at(0).sets.map(\.reps) == [5]) }
        let flags = try reopened.read { db in
            try sessions.map { try Bool.fetchOne(db, sql: "SELECT isArchived FROM workoutCompletion WHERE id = ?", arguments: [$0]) }
        }
        #expect(flags == Array(repeating: true, count: 6), "like lib/db/program-restart.ts")
    }

    @Test("Restart: a session started after restart is in the new cycle; old sessions keep theirs")
    func restartCycleOnSessions() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        let old = try finishAll(db, p)
        try db.restartProgram(p.id)
        let fresh = try db.startProgramWorkout(p.workoutId(week: 1, day: 1), at: day(10))
        #expect(try db.programSession(fresh).cycleNumber == 2)
        #expect(try db.programSession(old.at(0)).cycleNumber == 1)
    }

    @Test("Restart: twice gives cycle 3, and progress counts only the new cycle")
    func restartTwice() throws {
        let db = try TempDB().open()
        let p = try db.activeProgram()
        _ = try finishAll(db, p)
        try db.restartProgram(p.id)
        try db.complete(p.workoutId(week: 1, day: 1), at: day(10))
        #expect(try db.programProgress(p.id).doneWorkouts == 1)
        try db.restartProgram(p.id)
        #expect(try db.programProgress(p.id) == ProgramProgress(isComplete: false, totalWorkouts: 6, doneWorkouts: 0, cycleNumber: 3))
        #expect(try db.history().count == 7)
    }
}
