// Public API surface for slice 1 (work item 153). Every body is a stub that throws
// `RipitCoreError.notImplemented`; work item 154 replaces them with GRDB-backed code.
// The tests in Tests/RipitCoreTests are the contract: change the bodies, not the shapes.

import Foundation
import GRDB

public enum RipitCoreError: Error, Equatable {
    case notImplemented
    case notFound(String)
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
        throw RipitCoreError.notImplemented
    }

    /// Exercises whose name or any alias contains the query, ignoring case and punctuation.
    /// Each exercise appears at most once.
    public func search(_ query: String) throws -> [CatalogExercise] {
        throw RipitCoreError.notImplemented
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

    public init(id: String, name: String?, completedAt: Date, exerciseCount: Int, setCount: Int) {
        self.id = id
        self.name = name
        self.completedAt = completedAt
        self.exerciseCount = exerciseCount
        self.setCount = setCount
    }
}

public struct SetDetail: Sendable, Equatable, Identifiable {
    public let id: String
    public let setNumber: Int
    public let reps: Int
    /// Free text, stored and shown exactly as typed ("135lbs", "65%", "RPE 8").
    public let weight: String

    public init(id: String, setNumber: Int, reps: Int, weight: String) {
        self.id = id
        self.setNumber = setNumber
        self.reps = reps
        self.weight = weight
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

/// The phone's local SQLite database. Opening it creates the file if needed, runs any missing
/// migrations in order, and seeds the system exercise catalog.
public final class AppDatabase: Sendable {
    /// The app's own migrations, oldest first.
    public static var migrationIdentifiers: [String] { [] }

    /// Opens (or creates) the database at `path`. `upTo` stops after that app migration
    /// (to build an older database); `extraMigrations` run after the app's own.
    public static func open(path: String, upTo: String? = nil, extraMigrations: [ExtraMigration] = []) throws -> AppDatabase {
        throw RipitCoreError.notImplemented
    }

    public static func inMemory() throws -> AppDatabase {
        throw RipitCoreError.notImplemented
    }

    /// Identifiers of every migration applied to this database, in the order they ran.
    public func appliedMigrations() throws -> [String] { throw RipitCoreError.notImplemented }

    /// Read-only access for inspection (tests, debugging).
    public func read<T>(_ block: (Database) throws -> T) throws -> T { throw RipitCoreError.notImplemented }

    /// Ids of the system exercise definitions in the database.
    public func systemExerciseIds() throws -> [String] { throw RipitCoreError.notImplemented }

    /// Finished workouts, newest first. Unfinished workouts are not history.
    public func history() throws -> [HistoryEntry] { throw RipitCoreError.notImplemented }

    /// Starts an ad-hoc workout and returns its id.
    public func startWorkout(at date: Date) throws -> String { throw RipitCoreError.notImplemented }

    /// The unfinished workout to offer for resume, if any.
    public func inProgressWorkout() throws -> WorkoutDetail? { throw RipitCoreError.notImplemented }

    /// Adds a catalog exercise to a workout and returns the new exercise id.
    public func addExercise(definitionId: String, to workoutId: String) throws -> String { throw RipitCoreError.notImplemented }

    /// Logs the next set for an exercise and returns the set id.
    public func logSet(exerciseId: String, reps: Int, weight: String) throws -> String { throw RipitCoreError.notImplemented }

    /// Groups exercises of one workout as a superset.
    public func groupAsSuperset(_ exerciseIds: [String]) throws { throw RipitCoreError.notImplemented }

    public func finishWorkout(_ workoutId: String, at date: Date) throws { throw RipitCoreError.notImplemented }

    /// Deletes an unfinished workout with its exercises and sets.
    public func discardWorkout(_ workoutId: String) throws { throw RipitCoreError.notImplemented }

    public func workout(_ id: String) throws -> WorkoutDetail { throw RipitCoreError.notImplemented }
}
