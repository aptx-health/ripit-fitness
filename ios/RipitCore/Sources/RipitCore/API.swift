// Public API for slice 1. Shapes were fixed by work item 153's tests (Tests/RipitCoreTests, the
// contract); work item 154 filled in the GRDB-backed bodies. The schema is in Schema.swift.

import Foundation
import GRDB

public enum RipitCoreError: Error, Equatable {
    case notImplemented
    case notFound(String)
    /// A logged weight that isn't a finite number from 0 to `LoggedWeight.max`.
    case invalidWeight(Double)
    /// Finishing a workout with no exercises and no logged sets: log a set first, or discard it.
    case emptyWorkout
}

public enum LoggedWeight {
    /// The heaviest weight a set can log, in lbs or kg.
    public static let max: Double = 2000

    public static func isValid(_ weight: Double) -> Bool {
        weight.isFinite && weight >= 0 && weight <= max
    }
}

// MARK: - Catalog

/// One system exercise from the bundled catalog (built from prisma/seeds/exercise-definitions.json).
public struct CatalogExercise: Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let aliases: [String]
    public let category: String?
    public let equipment: [String]
    /// Bundled image names in display order, `[start, finish]`, or `[]` when the exercise has
    /// no matched image (the app shows a placeholder).
    public let images: [String]

    public init(id: String, name: String, aliases: [String], category: String?, equipment: [String], images: [String]) {
        self.id = id
        self.name = name
        self.aliases = aliases
        self.category = category
        self.equipment = equipment
        self.images = images
    }
}

public struct ExerciseCatalog: Sendable {
    public let exercises: [CatalogExercise]

    public init(exercises: [CatalogExercise]) {
        self.exercises = exercises
    }

    /// The catalog that ships with the app. Works offline.
    public static func bundled() throws -> ExerciseCatalog {
        try BundledCatalog.load().catalog
    }

    /// Exercises whose name or any alias contains the query, ignoring case and punctuation.
    /// Punctuation counts as a space, and a match with every space removed also counts, so
    /// "bench-press", "pull up" and "pullup" all find "Pull-Up" style names.
    /// Each exercise appears at most once.
    /// Name matches come first, then alias-only matches, each alphabetical. An empty query returns
    /// every exercise alphabetically.
    public func search(_ query: String) throws -> [CatalogExercise] {
        let q = Self.normalize(query)
        let sorted = exercises.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        if q.isEmpty { return sorted }
        let squashed = q.replacingOccurrences(of: " ", with: "")
        func matches(_ text: String) -> Bool {
            let t = Self.normalize(text)
            return t.contains(q) || t.replacingOccurrences(of: " ", with: "").contains(squashed)
        }
        let byName = sorted.filter { matches($0.name) }
        let named = Set(byName.map(\.id))
        let byAlias = sorted.filter { !named.contains($0.id) && $0.aliases.contains(where: matches) }
        return byName + byAlias
    }

    /// Lowercase, turn everything but letters and digits into spaces, collapse spaces, trim.
    static func normalize(_ s: String) -> String {
        String(s.lowercased().map { $0.isLetter || $0.isNumber ? $0 : " " })
            .split(separator: " ").joined(separator: " ")
    }
}

// MARK: - Database

/// A migration registered after the app's own, so tests can prove migrations run in order and once.
public struct ExtraMigration: Sendable {
    public let identifier: String
    public let migrate: @Sendable (Database) throws -> Void

    public init(_ identifier: String, migrate: @escaping @Sendable (Database) throws -> Void) {
        self.identifier = identifier
        self.migrate = migrate
    }
}

public struct HistoryEntry: Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String?
    public let completedAt: Date
    public let exerciseCount: Int
    public let setCount: Int
    /// For a program session: its program and week (work item 170), so the app can say
    /// "Strength Block · W2 · Pull". nil for ad-hoc workouts.
    public let programName: String?
    public let weekNumber: Int?

    public init(id: String, name: String?, completedAt: Date, exerciseCount: Int, setCount: Int,
                programName: String? = nil, weekNumber: Int? = nil) {
        self.id = id
        self.name = name
        self.completedAt = completedAt
        self.exerciseCount = exerciseCount
        self.setCount = setCount
        self.programName = programName
        self.weekNumber = weekNumber
    }
}

public struct SetDetail: Sendable, Equatable, Identifiable {
    public let id: String
    public let setNumber: Int
    public let reps: Int
    /// A number, like the web app's LoggedSet.weight (0 for bodyweight).
    public let weight: Double
    /// "lbs" or "kg"; defaults to "lbs".
    public let weightUnit: String
    /// Effort logged on the set (slice 5); nil when none.
    public let rpe: Int?
    public let rir: Int?
    public let isWarmup: Bool

    public init(id: String, setNumber: Int, reps: Int, weight: Double, weightUnit: String,
                rpe: Int? = nil, rir: Int? = nil, isWarmup: Bool = false) {
        self.id = id
        self.setNumber = setNumber
        self.reps = reps
        self.weight = weight
        self.weightUnit = weightUnit
        self.rpe = rpe
        self.rir = rir
        self.isWarmup = isWarmup
    }
}

public struct ExerciseDetail: Sendable, Equatable, Identifiable {
    public let id: String
    public let definitionId: String
    public let name: String
    /// Superset group; exercises sharing a non-nil value are one superset.
    public let group: String?
    public let sets: [SetDetail]

    public init(id: String, definitionId: String, name: String, group: String?, sets: [SetDetail]) {
        self.id = id
        self.definitionId = definitionId
        self.name = name
        self.group = group
        self.sets = sets
    }
}

public struct WorkoutDetail: Sendable, Equatable, Identifiable {
    public let id: String
    public let startedAt: Date
    /// nil while the workout is in progress.
    public let completedAt: Date?
    /// In the order they were added.
    public let exercises: [ExerciseDetail]

    public init(id: String, startedAt: Date, completedAt: Date?, exercises: [ExerciseDetail]) {
        self.id = id
        self.startedAt = startedAt
        self.completedAt = completedAt
        self.exercises = exercises
    }
}

