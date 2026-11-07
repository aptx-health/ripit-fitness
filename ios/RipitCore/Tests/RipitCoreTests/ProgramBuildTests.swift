// Scenarios: "Build a program", "Only one program is active", "Archive a program".
//
// API used:
// - createProgram(_:), program(_:), programs(), activateProgram(_:), archiveProgram(_:)
// - slice 1: history(), workout(_:)

import Foundation
import Testing
@testable import RipitCore

@Suite("Programs: build, activate, archive")
struct ProgramBuildTests {
    // ---- Build a program

    @Test("Build: weeks, workouts, exercises and sets are saved in order")
    func buildSavedInOrder() throws {
        let tmp = try TempDB()
        let id = try tmp.open().createProgram(Plans.standard())
        let p = try tmp.open().program(id)
        #expect(p.name == "Test Program")
        #expect(p.weeks.map(\.weekNumber) == [1, 2])
        for w in p.weeks {
            #expect(w.workouts.map(\.dayNumber) == [1, 2, 3])
            #expect(w.workouts.map(\.name) == ["Day 1", "Day 2", "Day 3"])
        }
        let d1 = try p.weeks.at(0).workouts.at(0)
        #expect(d1.exercises.map(\.definitionId) == [benchPressId, rowId])
        #expect(d1.exercises.map(\.name) == ["Barbell Bench Press", "Barbell Row"])
        #expect(try d1.exercises.at(0).sets.map(\.setNumber) == [1, 2, 3])
        #expect(try d1.exercises.at(0).sets.map(\.reps) == ["5", "5", "5"])
        #expect(try d1.exercises.at(1).sets.map(\.reps) == ["8-12", "8-12"])
        let d3 = try p.weeks.at(1).workouts.at(2)
        #expect(d3.exercises.map(\.definitionId) == [benchPressId, rowId, squatId])
        #expect(d3.exercises.map(\.group) == ["A", "A", nil])
        #expect(try d3.exercises.at(2).sets.map(\.reps) == ["AMRAP"])
    }

    @Test("Build: prescribed weight stays free text", arguments: ["65%", "RPE 8", "135lbs", "BW+25"])
    func prescribedWeightFreeText(_ weight: String) throws {
        let tmp = try TempDB()
        let id = try tmp.open().createProgram(Plans.single(benchPressId, [PlannedSet(reps: "5", weight: weight)]))
        #expect(try tmp.open().program(id).weeks.at(0).workouts.at(0).exercises.at(0).sets.at(0).weight == weight)
    }

    @Test("Build: no prescribed weight, RPE, RIR and warm-up flag are kept")
    func prescribedOptionalFields() throws {
        let db = try TempDB().open()
        let id = try db.createProgram(Plans.single(squatId, [
            PlannedSet(reps: "5", isWarmup: true),
            PlannedSet(reps: "5", weight: nil, rpe: 8),
            PlannedSet(reps: "3", weight: "80%", rir: 2),
        ]))
        let sets = try db.program(id).weeks.at(0).workouts.at(0).exercises.at(0).sets
        #expect(sets.map(\.weight) == [nil, nil, "80%"])
        #expect(sets.map(\.rpe) == [nil, 8, nil])
        #expect(sets.map(\.rir) == [nil, nil, 2])
        #expect(sets.map(\.isWarmup) == [true, false, false])
    }

    @Test("Build: a new program is listed and not active")
    func newProgramInactive() throws {
        let db = try TempDB().open()
        let id = try db.createProgram(Plans.standard())
        #expect(try db.programs() == [ProgramSummary(id: id, name: "Test Program", isActive: false)])
        #expect(try db.program(id).isActive == false)
        #expect(try db.upNext() == nil)
    }

    // ---- Only one program is active

    @Test("Active: activating B makes B active and A not")
    func activateSwitches() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let a = try db.createProgram(Plans.standard("A"))
        let b = try db.createProgram(Plans.standard("B"))
        try db.activateProgram(a)
        try db.activateProgram(b)
        let reopened = try tmp.open()
        #expect(try reopened.program(a).isActive == false)
        #expect(try reopened.program(b).isActive == true)
        #expect(try reopened.programs().filter(\.isActive).map(\.id) == [b])
        #expect(try reopened.upNext()?.programId == b)
    }

    @Test("Active: switching back and forth leaves exactly one active")
    func activateBackAndForth() throws {
        let db = try TempDB().open()
        let ids = try ["A", "B", "C"].map { try db.createProgram(Plans.standard($0)) }
        for id in [try ids.at(0), try ids.at(1), try ids.at(2), try ids.at(0)] { try db.activateProgram(id) }
        #expect(try db.programs().filter(\.isActive).map(\.id) == [ids.at(0)])
        #expect(try db.programs().map(\.name) == ["A", "B", "C"])
    }

    // ---- Archive a program

    @Test("Archive: an inactive program leaves the list but its history stays")
    func archiveKeepsHistory() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let old = try db.activeProgram(Plans.standard("Old"))
        let session = try db.complete(old.workoutId(week: 1, day: 1), at: day(1))
        let other = try db.createProgram(Plans.standard("New"))
        try db.activateProgram(other)
        let before = try db.history()

        try db.archiveProgram(old.id)

        let reopened = try tmp.open()
        #expect(try reopened.programs().map(\.name) == ["New"])
        #expect(try reopened.program(old.id).isArchived == true)
        #expect(try reopened.history() == before)
        #expect(try reopened.workout(session).exercises.at(0).sets.map(\.weight) == [135])
    }

    @Test("Archive: archiving the active program leaves no program active, and its history stays")
    func archiveActive() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let p = try db.activeProgram()
        let other = try db.createProgram(Plans.standard("Other"))
        let session = try db.complete(p.workoutId(week: 1, day: 1), at: day(1))
        let before = try db.history()

        try db.archiveProgram(p.id)

        let reopened = try tmp.open()
        #expect(try reopened.program(p.id).isActive == false)
        #expect(try reopened.program(p.id).isArchived == true)
        #expect(try reopened.programs() == [ProgramSummary(id: other, name: "Other", isActive: false)])
        #expect(try reopened.upNext() == nil)
        #expect(try reopened.currentWeek() == nil)
        #expect(try reopened.history() == before)
        #expect(try reopened.workout(session).exercises.at(0).sets.map(\.weight) == [135])
    }

    @Test("Archive: archiving one program leaves the active one alone")
    func archiveLeavesActive() throws {
        let db = try TempDB().open()
        let a = try db.createProgram(Plans.standard("A"))
        let b = try db.createProgram(Plans.standard("B"))
        try db.activateProgram(b)
        try db.archiveProgram(a)
        #expect(try db.programs() == [ProgramSummary(id: b, name: "B", isActive: true)])
        #expect(try db.upNext()?.programId == b)
    }
}
