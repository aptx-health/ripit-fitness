// What the logger's Info and Notes show for an exercise (slice 5, logging-help.feature
// "Exercise info" and "Exercise notes"; web ExerciseInfoContent.tsx).

import Foundation
import GRDB

public struct ExerciseInfo: Sendable, Equatable {
    public let instructions: String?
    /// Muscle (FAU) keys as stored, e.g. "chest", "front-delts".
    public let primaryMuscles: [String]
    public let secondaryMuscles: [String]
    public let equipment: [String]

    public init(instructions: String?, primaryMuscles: [String], secondaryMuscles: [String], equipment: [String]) {
        self.instructions = instructions
        self.primaryMuscles = primaryMuscles
        self.secondaryMuscles = secondaryMuscles
        self.equipment = equipment
    }

    /// The web's display name for a muscle key (FAU_DISPLAY_NAMES), else the key itself.
    public static func muscleName(_ key: String) -> String {
        [
            "chest": "Chest", "mid-back": "Mid Back", "lower-back": "Lower Back", "front-delts": "Front Delts",
            "side-delts": "Side Delts", "rear-delts": "Rear Delts", "lats": "Lats", "traps": "Traps",
            "biceps": "Biceps", "triceps": "Triceps", "forearms": "Forearms", "quads": "Quads",
            "adductors": "Adductors", "hamstrings": "Hamstrings", "glutes": "Glutes", "calves": "Calves",
            "abs": "Abs", "obliques": "Obliques",
        ][key] ?? key
    }
}

extension AppDatabase {
    /// Instructions, muscles and equipment for an exercise definition, or nil when it doesn't exist.
    public func exerciseInfo(definitionId: String) throws -> ExerciseInfo? {
        try dbQueue.read { db in
            guard let row = try Row.fetchOne(db, sql: """
                SELECT instructions, primaryFAUs, secondaryFAUs, equipment FROM exerciseDefinition WHERE id = ?
                """, arguments: [definitionId]) else { return nil }
            func list(_ column: String) -> [String] {
                (try? JSONDecoder().decode([String].self, from: Data((row[column] as String? ?? "[]").utf8))) ?? []
            }
            let instructions = (row["instructions"] as String?)?.trimmingCharacters(in: .whitespacesAndNewlines)
            return ExerciseInfo(instructions: instructions?.isEmpty == false ? instructions : nil,
                                primaryMuscles: list("primaryFAUs"), secondaryMuscles: list("secondaryFAUs"),
                                equipment: list("equipment"))
        }
    }

    /// The plan's notes for an exercise, or nil when it has none.
    public func exerciseNotes(exerciseId: String) throws -> String? {
        try dbQueue.read { db in
            let notes = try String.fetchOne(db, sql: "SELECT notes FROM exercise WHERE id = ?", arguments: [exerciseId])?
                .trimmingCharacters(in: .whitespacesAndNewlines)
            return notes?.isEmpty == false ? notes : nil
        }
    }
}
