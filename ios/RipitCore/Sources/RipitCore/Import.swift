// Importing a ripit-export file (slice 2). The API shapes were fixed by work item 158's tests
// (Tests/RipitCoreTests/Import*Tests.swift, the contract); work item 160 filled in the bodies.
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
import GRDB

/// Why a file was refused. `reason` is a plain sentence for the person importing.
public enum ImportError: Error, Equatable {
    /// Valid JSON, but `format` is missing or not "ripit-export".
    case notRipitExport
    /// A ripit-export file of a version this app can't read.
    case unsupportedVersion(Int)
    /// Not JSON, or a ripit-export v1 file with missing or wrongly typed fields.
    case corrupt

    public var reason: String {
        switch self {
        case .notRipitExport:
            "This isn't a Ripit export. Use the file from Download my data on ripit.fit."
        case .unsupportedVersion(let v):
            "This file is a newer Ripit export (version \(v)). Update the app, then import it again."
        case .corrupt:
            "This file is damaged or incomplete. Download your data from ripit.fit again."
        }
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
        let file = try ExportFile.decode(data)
        do {
            try dbQueue.write { db in
                var importer = ExportImporter(file: file, db: db)
                try importer.run()
            }
        } catch is DatabaseError {
            // A row the schema rejects (a dangling reference, a missing value): the transaction rolled back.
            throw ImportError.corrupt
        }
        return ImportSummary(programs: file.programs.count, workouts: file.workoutCompletions.count,
                             savedWorkouts: file.savedWorkouts.count, customExercises: file.customExercises.count,
                             loggedSets: file.workoutCompletions.reduce(0) { $0 + $1.loggedSets.count })
    }
}

/// The web's normalizeExerciseName (lib/validators/exercise-definition.ts), plus a final trim.
func normalizeExerciseName(_ name: String) -> String {
    let kept = name.lowercased().trimmingCharacters(in: .whitespacesAndNewlines).unicodeScalars.filter {
        ("a"..."z").contains($0) || ("0"..."9").contains($0) || $0 == "-" || CharacterSet.whitespacesAndNewlines.contains($0)
    }
    return String(String.UnicodeScalarView(kept))
        .split(whereSeparator: \.isWhitespace).joined(separator: " ")
}

// MARK: - Writing rows

private struct ExportImporter {
    let file: ExportFile
    let db: Database
    /// File exercise definition id -> local exerciseDefinition id.
    private var definitionIds: [String: String] = [:]

    init(file: ExportFile, db: Database) {
        self.file = file
        self.db = db
    }

    mutating func run() throws {
        for custom in file.customExercises { try resolveCustom(custom) }
        for ref in file.exerciseRefs where definitionIds[ref.id] == nil { try resolveRef(ref) }

        // The file's active program stays active only if the phone has none.
        let phoneHasActive = try Bool.fetchOne(db, sql: "SELECT 1 FROM program WHERE isActive = 1") ?? false
        for program in file.programs { try insert(program, keepActive: !phoneHasActive) }
        for completion in file.workoutCompletions { try insert(completion) }
        for saved in file.savedWorkouts { try insert(saved) }
    }

    private func exists(_ table: String, _ id: String) throws -> Bool {
        try Bool.fetchOne(db, sql: "SELECT 1 FROM \"\(table)\" WHERE id = ?", arguments: [id]) ?? false
    }

    /// A local definition for this id or name: the same id, else the same normalized name.
    private func existingDefinition(id: String, name: String) throws -> String? {
        if try exists("exerciseDefinition", id) { return id }
        return try String.fetchOne(db, sql: """
            SELECT id FROM exerciseDefinition WHERE normalizedName = ? ORDER BY isSystem DESC LIMIT 1
            """, arguments: [normalizeExerciseName(name)])
    }

    private mutating func resolveCustom(_ e: ExportFile.ExerciseDefinition) throws {
        if let local = try existingDefinition(id: e.id, name: e.name) {
            definitionIds[e.id] = local
            return
        }
        try db.execute(sql: """
            INSERT INTO exerciseDefinition
                (id, name, normalizedName, aliases, category, isSystem, createdBy, createdAt, updatedAt, equipment,
                 instructions, notes, imageUrls, primaryFAUs, secondaryFAUs, force, mechanic, level,
                 movementPattern, intensityClass, isBodyweight, taggedAt, taggedBy)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, arguments: [
                e.id, e.name, normalizeExerciseName(e.name), try jsonText(e.aliases), e.category, e.createdBy,
                e.createdAt, e.updatedAt, try jsonText(e.equipment), e.instructions, e.notes, try jsonText(e.imageUrls),
                try jsonText(e.primaryFAUs), try jsonText(e.secondaryFAUs), e.force, e.mechanic, e.level,
                e.movementPattern, e.intensityClass, e.isBodyweight, e.taggedAt, e.taggedBy,
            ])
        definitionIds[e.id] = e.id
    }

    private mutating func resolveRef(_ ref: ExportFile.ExerciseRef) throws {
        if let local = try existingDefinition(id: ref.id, name: ref.name) {
            definitionIds[ref.id] = local
            return
        }
        // Not in the catalog: keep it under its own id, so its sets keep their exercise.
        try db.execute(sql: """
            INSERT INTO exerciseDefinition (id, name, normalizedName, isSystem, createdAt, updatedAt)
            VALUES (?, ?, ?, 0, ?, ?)
            """, arguments: [ref.id, ref.name, normalizeExerciseName(ref.name), file.exportedAt, file.exportedAt])
        definitionIds[ref.id] = ref.id
    }

    private func definitionId(_ fileId: String) throws -> String {
        guard let local = definitionIds[fileId] else { throw ImportError.corrupt }
        return local
    }

    private func insert(_ p: ExportFile.Program, keepActive: Bool) throws {
        if try !exists("program", p.id) {
            try db.execute(sql: """
                INSERT INTO program
                    (id, name, description, isActive, createdAt, updatedAt, isUserCreated, programType, isArchived,
                     archivedAt, deletedAt, goals, level, durationWeeks, durationDisplay, targetDaysPerWeek,
                     equipmentNeeded, focusAreas, sourceCommunityProgramId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [
                    p.id, p.name, p.description, p.isActive && keepActive, p.createdAt, p.updatedAt, p.isUserCreated,
                    p.programType, p.isArchived, p.archivedAt, p.deletedAt, try jsonText(p.goals), p.level,
                    p.durationWeeks, p.durationDisplay, p.targetDaysPerWeek, try jsonText(p.equipmentNeeded),
                    try jsonText(p.focusAreas), p.sourceCommunityProgramId,
                ])
        }
        for week in p.weeks {
            if try !exists("week", week.id) {
                try db.execute(sql: """
                    INSERT INTO week (id, weekNumber, name, description, programId) VALUES (?, ?, ?, ?, ?)
                    """, arguments: [week.id, week.weekNumber, week.name, week.description, p.id])
            }
            for workout in week.workouts {
                if try !exists("workout", workout.id) {
                    try db.execute(sql: "INSERT INTO workout (id, name, dayNumber, weekId) VALUES (?, ?, ?, ?)",
                                   arguments: [workout.id, workout.name, workout.dayNumber, week.id])
                }
                for exercise in workout.exercises { try insert(exercise) }
            }
        }
    }

    private func insert(_ e: ExportFile.Exercise) throws {
        if try !exists("exercise", e.id) {
            try db.execute(sql: """
                INSERT INTO exercise
                    (id, name, exerciseDefinitionId, "order", exerciseGroup, workoutId, notes, isOneOff, workoutCompletionId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [
                    e.id, e.name, try definitionId(e.exerciseDefinitionId), e.order, e.exerciseGroup, e.workoutId,
                    e.notes, e.isOneOff, e.workoutCompletionId,
                ])
        }
        for s in e.prescribedSets where try !exists("prescribedSet", s.id) {
            try db.execute(sql: """
                INSERT INTO prescribedSet (id, setNumber, reps, weight, rpe, rir, isWarmup, exerciseId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [s.id, s.setNumber, s.reps, s.weight, s.rpe, s.rir, s.isWarmup, e.id])
        }
    }

    private func insert(_ c: ExportFile.WorkoutCompletion) throws {
        if try !exists("workoutCompletion", c.id) {
            try db.execute(sql: """
                INSERT INTO workoutCompletion
                    (id, workoutId, savedWorkoutId, completedAt, startedAt, status, notes, isArchived, cycleNumber,
                     isAdHoc, name, durationSeconds, sessionRpe)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [
                    // The web sets completedAt when a session starts; a local draft has none.
                    c.id, c.workoutId, c.savedWorkoutId, c.status == "draft" ? nil : c.completedAt, c.startedAt,
                    c.status, c.notes, c.isArchived, c.cycleNumber, c.isAdHoc, c.name, c.durationSeconds, c.sessionRpe,
                ])
        }
        for exercise in c.exercises { try insert(exercise) }
        for s in c.loggedSets where try !exists("loggedSet", s.id) {
            try db.execute(sql: """
                INSERT INTO loggedSet
                    (id, setNumber, reps, weight, weightUnit, rpe, rir, isWarmup, exerciseId, completionId, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [
                    s.id, s.setNumber, s.reps, s.weight, s.weightUnit, s.rpe, s.rir, s.isWarmup, s.exerciseId, c.id,
                    s.createdAt,
                ])
        }
    }

    private func insert(_ w: ExportFile.SavedWorkout) throws {
        guard try !exists("savedWorkout", w.id) else { return }
        try db.execute(sql: """
            INSERT INTO savedWorkout
                (id, name, notes, sourceCompletionId, workoutData, exerciseCount, createdAt, updatedAt, lastUsedAt,
                 pinnedAt, origin, archivedAt, dismissedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, arguments: [
                w.id, w.name, w.notes, w.sourceCompletionId, try jsonText(rewritingDefinitionIds(w.workoutData)),
                w.exerciseCount, w.createdAt, w.updatedAt, w.lastUsedAt, w.pinnedAt, w.origin, w.archivedAt,
                w.dismissedAt,
            ])
    }

    /// The snapshot with every exerciseDefinitionId pointing at the resolved local row.
    private func rewritingDefinitionIds(_ value: JSONValue) throws -> JSONValue {
        switch value {
        case .array(let items):
            return .array(try items.map(rewritingDefinitionIds))
        case .object(let fields):
            var out: [String: JSONValue] = [:]
            for (key, field) in fields {
                if key == "exerciseDefinitionId", case .string(let id) = field {
                    out[key] = .string(try definitionId(id))
                } else {
                    out[key] = try rewritingDefinitionIds(field)
                }
            }
            return .object(out)
        default:
            return value
        }
    }

    private func jsonText<T: Encodable>(_ value: T) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return String(decoding: try encoder.encode(value), as: UTF8.self)
    }
}
