// Public API surface for slice 2, importing a ripit-export file (work item 158). The body is a stub
// that throws `RipitCoreError.notImplemented`; the slice 2 implementer replaces it. The tests in
// Tests/RipitCoreTests/Import*Tests.swift are the contract: change the bodies, not the shapes.
//
// The format is docs/RIPIT_EXPORT_FORMAT.md (branch feature/data-export, commit 575a5d05):
// - Refuse a file whose `format` is not "ripit-export" or whose `version` is not 1, and a file
//   that isn't valid JSON. A refused file changes nothing.
// - Rows keep their ids, so importing the same file again adds nothing.
// - Plan (prescribedSets under exercises) and reality (loggedSets under completions) stay apart.
// - LoggedSet.weight is a number with weightUnit "lbs" or "kg"; nothing is converted.
// - An exercise ref resolves by id against the catalog, then by normalized name against the catalog
//   (the web's normalizeExerciseName), else it is kept under its own id as a non-system definition.
//   Exercises and saved workout snapshots point at the resolved id.
// - An imported draft session is resumable, with completedAt NULL like local drafts.
// - The file's active program stays active only if the phone has no active program.
// - Keys v1 doesn't use locally (settings, pinnedExercises, userId, copyStatus, ...) are ignored.

import Foundation

/// Why a file was refused. `reason` is a plain sentence for the person importing.
public enum ImportError: Error, Equatable {
    /// Valid JSON, but `format` is missing or not "ripit-export".
    case notRipitExport
    /// A ripit-export file of a version this app can't read.
    case unsupportedVersion(Int)
    /// Not JSON, or a ripit-export v1 file with missing or wrongly typed fields.
    case corrupt

    public var reason: String {
        // Stub: the implementer writes the sentences.
        ""
    }
}

/// What one import brought in: counts of rows in the file, by kind.
public struct ImportSummary: Sendable, Equatable {
    public let programs: Int
    public let workouts: Int
    public let savedWorkouts: Int
    public let customExercises: Int
    public let loggedSets: Int

    public init(programs: Int, workouts: Int, savedWorkouts: Int, customExercises: Int, loggedSets: Int) {
        self.programs = programs
        self.workouts = workouts
        self.savedWorkouts = savedWorkouts
        self.customExercises = customExercises
        self.loggedSets = loggedSets
    }
}

extension AppDatabase {
    /// Imports a ripit-export v1 file in one transaction. Throws `ImportError` for a refused file.
    @discardableResult
    public func importExport(data: Data) throws -> ImportSummary {
        throw RipitCoreError.notImplemented
    }
}
