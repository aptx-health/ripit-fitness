// Scenarios: "Exercise info", "Exercise notes" (work item 177). Muscle names are the web's
// FAU_DISPLAY_NAMES (components/workout-logging/ExerciseInfoContent.tsx), copied here so a drift fails.

import Foundation
import Testing
@testable import RipitCore

@Suite("Exercise info")
struct ExerciseInfoTests {
    static let webNames: [String: String] = [
        "chest": "Chest", "mid-back": "Mid Back", "lower-back": "Lower Back", "front-delts": "Front Delts",
        "side-delts": "Side Delts", "rear-delts": "Rear Delts", "lats": "Lats", "traps": "Traps",
        "biceps": "Biceps", "triceps": "Triceps", "forearms": "Forearms", "quads": "Quads",
        "adductors": "Adductors", "hamstrings": "Hamstrings", "glutes": "Glutes", "calves": "Calves",
        "abs": "Abs", "obliques": "Obliques",
    ]

    @Test("Muscle names match the web's, and an unknown key shows as itself")
    func muscleNames() {
        for (key, name) in Self.webNames { #expect(ExerciseInfo.muscleName(key) == name, "\(key)") }
        #expect(ExerciseInfo.muscleName("neck") == "neck")
    }

    @Test("Info reads the definition; empty or broken JSON and blank instructions read as none")
    func emptyFallback() throws {
        let db = try TempDB().open()
        let now = Date()
        try db.dbQueue.write { db in
            try db.execute(sql: """
                INSERT INTO exerciseDefinition (id, name, normalizedName, createdAt, updatedAt, equipment, instructions,
                                                primaryFAUs, secondaryFAUs)
                VALUES ('x-empty', 'Empty', 'empty', ?, ?, '[]', '  ', '[]', 'not json'),
                       ('x-full', 'Full', 'full', ?, ?, '["barbell"]', ' Push. ', '["chest"]', '["triceps"]')
                """, arguments: [now, now, now, now])
        }
        #expect(try db.exerciseInfo(definitionId: "x-empty")
                == ExerciseInfo(instructions: nil, primaryMuscles: [], secondaryMuscles: [], equipment: []))
        #expect(try db.exerciseInfo(definitionId: "x-full")
                == ExerciseInfo(instructions: "Push.", primaryMuscles: ["chest"], secondaryMuscles: ["triceps"], equipment: ["barbell"]))
        #expect(try db.exerciseInfo(definitionId: "missing") == nil)
    }

    @Test("Notes: the plan's text, trimmed; none when blank")
    func notes() throws {
        let db = try TempDB().open()
        let w = try db.startWorkout(at: Date())
        let e = try db.addExercise(definitionId: benchPressId, to: w)
        #expect(try db.exerciseNotes(exerciseId: e) == nil)
        try db.dbQueue.write { try $0.execute(sql: "UPDATE exercise SET notes = '  ' WHERE id = ?", arguments: [e]) }
        #expect(try db.exerciseNotes(exerciseId: e) == nil)
        try db.dbQueue.write { try $0.execute(sql: "UPDATE exercise SET notes = ' Pause 1s. ' WHERE id = ?", arguments: [e]) }
        #expect(try db.exerciseNotes(exerciseId: e) == "Pause 1s.")
    }
}
