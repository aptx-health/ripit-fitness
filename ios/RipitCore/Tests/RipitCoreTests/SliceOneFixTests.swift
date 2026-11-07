// Fixes after review 155 (work item 163): weight bounds, punctuation-as-space search, and removing an
// exercise from an open workout. The slice 1 tests stay locked; these are new.

import Foundation
import Testing
@testable import RipitCore

@Suite("Slice 1 fixes: weight bounds")
struct WeightBoundsTests {
    let start = Clock.at(2026, 11, 7, 17)

    func openExercise() throws -> (AppDatabase, String) {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: start)
        return (db, try db.addExercise(definitionId: benchPressId, to: w))
    }

    @Test("Weight: non-finite, negative and over-2000 weights are refused and nothing is saved",
          arguments: [Double.infinity, -Double.infinity, Double.nan, -0.5, 2000.5, 1e20])
    func refused(_ weight: Double) throws {
        let (db, e) = try openExercise()
        #expect(throws: RipitCoreError.self) { try db.logSet(exerciseId: e, reps: 5, weight: weight, unit: "kg") }
        #expect(try db.count("loggedSet") == 0)
    }

    @Test("Weight: the error names the bad weight")
    func clearError() throws {
        let (db, e) = try openExercise()
        #expect(throws: RipitCoreError.invalidWeight(2500)) { try db.logSet(exerciseId: e, reps: 5, weight: 2500) }
    }

    @Test("Weight: 0 (bodyweight) and exactly 2000 are allowed", arguments: [0.0, 2000.0])
    func boundsAllowed(_ weight: Double) throws {
        let (db, e) = try openExercise()
        _ = try db.logSet(exerciseId: e, reps: 1, weight: weight)
        #expect(try db.count("loggedSet") == 1)
    }
}

@Suite("Slice 1 fixes: search treats punctuation as a space")
struct PunctuationSearchTests {
    func names(_ q: String) throws -> Set<String> { Set(try ExerciseCatalog.bundled().search(q).map(\.name)) }

    @Test("Search: a hyphen in the query matches a space in the name")
    func hyphenatedQuery() throws {
        let found = try names("BENCH-press!")
        #expect(found.contains("Barbell Bench Press"))
        #expect(found.contains("Bench Press"))
    }

    @Test("Search: \"pull up\" finds the hyphenated Pull-Up variants")
    func pullUpWithSpace() throws {
        let found = try names("pull up")
        for name in ["Pull-Up", "Wide Grip Pull-Up", "Neutral Grip Pull-Up", "L-Sit Pull-Up"] {
            #expect(found.contains(name), "\(name)")
        }
    }

    @Test("Search: a space in the query matches a hyphen in the name")
    func spacedQueryHyphenatedName() throws {
        // The catalog has no T-Bar row, so "t bar row" (review 155) has nothing to find; these hyphenated names do.
        #expect(try names("lock off") == ["Lock-Off Hold"])
        #expect(try names("l sit pull up") == ["L-Sit Pull-Up"])
        #expect(try names("t bar row").isEmpty)
    }

    @Test("Search: spaces removed still match (\"lockoff\" finds Lock-Off Hold, \"pullup\" finds Wide Grip Pull-Up)")
    func squashed() throws {
        #expect(try names("lockoff").contains("Lock-Off Hold"))
        #expect(try names("pullup").contains("Wide Grip Pull-Up"))
    }
}

@Suite("Slice 1 fixes: removing an exercise")
struct RemoveExerciseTests {
    let start = Clock.at(2026, 11, 7, 17)
    let rowId = "cmiz7vk1i0003vr0mqucd1f52"

    @Test("Remove: the exercise and its sets leave the open workout; the others stay")
    func removesWithSets() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: start)
        let bench = try db.addExercise(definitionId: benchPressId, to: w)
        let row = try db.addExercise(definitionId: rowId, to: w)
        _ = try db.logSet(exerciseId: bench, reps: 8, weight: 135)
        _ = try db.logSet(exerciseId: row, reps: 10, weight: 95)
        _ = try db.logSet(exerciseId: row, reps: 10, weight: 95)

        try db.removeExercise(row)

        #expect(try db.workout(w).exercises.map(\.id) == [bench])
        #expect(try db.count("loggedSet") == 1)
        #expect(try db.count("exercise") == 1)
    }

    @Test("Remove: an exercise in a finished workout can't be removed")
    func finishedIsUntouched() throws {
        let db = try TempDB().open()
        let w = try db.makeWorkout(start: start, finish: start.addingTimeInterval(600), [(benchPressId, [(5, 135)])])
        let e = try #require(try db.workout(w).exercises.first?.id)
        #expect(throws: RipitCoreError.self) { try db.removeExercise(e) }
        #expect(try db.history().first?.setCount == 1)
    }
}
