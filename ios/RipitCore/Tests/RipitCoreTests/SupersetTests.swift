// Scenario: "Supersets are kept".
//
// API used:
// - groupAsSuperset(_:), workout(_:), ExerciseDetail.group

import Foundation
import Testing
@testable import RipitCore

@Suite("Supersets")
struct SupersetTests {
    let start = Clock.at(2026, 11, 7, 17)
    let rowId = "cmiz7vk1i0003vr0mqucd1f52"        // Barbell Row
    let squatId = "cmiz7vjpo0001vr0msv9of7ib"      // Barbell Back Squat

    /// Bench + row grouped, squat alone; returns (workout, bench, row, squat).
    func build(_ db: AppDatabase) throws -> (String, String, String, String) {
        let w = try db.startWorkout(at: start)
        let bench = try db.addExercise(definitionId: benchPressId, to: w)
        let row = try db.addExercise(definitionId: rowId, to: w)
        let squat = try db.addExercise(definitionId: squatId, to: w)
        for e in [bench, row, squat] { _ = try db.logSet(exerciseId: e, reps: 8, weight: "135lbs") }
        try db.groupAsSuperset([bench, row])
        return (w, bench, row, squat)
    }

    @Test("Supersets: two grouped exercises share a group; the third is ungrouped")
    func groupedWhileInProgress() throws {
        let db = try TempDB().open()
        let (_, _, _, _) = try build(db)
        let ex = try #require(try db.inProgressWorkout()).exercises
        try #require(ex.count == 3)
        #expect(ex[0].group != nil)
        #expect(ex[0].group == ex[1].group)
        #expect(ex[2].group == nil)
    }

    @Test("Supersets: they stay grouped after finishing and in history, after reopening")
    func groupedAfterFinishAndReopen() throws {
        let tmp = try TempDB()
        let (w, bench, row, squat) = try build(try tmp.open())
        try tmp.open().finishWorkout(w, at: start.addingTimeInterval(3600))

        let db = try tmp.open()
        #expect(try db.history().map(\.id) == [w])
        #expect(try db.history().first?.exerciseCount == 3)
        let ex = try db.workout(w).exercises
        #expect(ex.map(\.id) == [bench, row, squat], "order added is kept")
        #expect(ex[0].group != nil && ex[0].group == ex[1].group)
        #expect(ex[2].group == nil)
    }

    @Test("Supersets: two separate supersets in one workout get different groups")
    func twoSupersetsDistinct() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: start)
        let ids = try [benchPressId, rowId, squatId, "ex_bw_034"].map { try db.addExercise(definitionId: $0, to: w) }
        try db.groupAsSuperset([ids[0], ids[1]])
        try db.groupAsSuperset([ids[2], ids[3]])
        try db.finishWorkout(w, at: start.addingTimeInterval(60))
        let g = try db.workout(w).exercises.map(\.group)
        #expect(g[0] != nil && g[0] == g[1])
        #expect(g[2] != nil && g[2] == g[3])
        #expect(g[0] != g[2])
    }
}
