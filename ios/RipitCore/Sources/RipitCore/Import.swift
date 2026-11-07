// Importing a ripit-export file (slice 2). The API shapes were fixed by work item 158's tests
// (Tests/RipitCoreTests/Import*Tests.swift, the contract); work item 160 filled in the bodies.
//
// The format is docs/RIPIT_EXPORT_FORMAT.md (branch feature/data-export, commit 575a5d05):
// - Refuse a file whose `format` is not "ripit-export" or whose `version` is not 1, and a file
//   that isn't valid JSON. A refused file changes nothing.
// - Rows keep their ids, so importing the same file again adds nothing. A later export updates rows
//   that came from a file, but only where the web changed them since the last import (work item 164);
//   rows created on the phone, and phone edits to rows the web didn't change, are kept.
// - Plan (prescribedSets under exercises) and reality (loggedSets under completions) stay apart.
// - LoggedSet.weight is a number with weightUnit "lbs" or "kg"; nothing is converted.
// - An exercise ref resolves by id against the catalog, then by normalized name against the catalog
//   (the web's normalizeExerciseName), else it is kept under its own id as a non-system definition.
//   Exercises and saved workout snapshots point at the resolved id.
// - An imported draft session is resumable, with completedAt NULL like local drafts, when the phone
//   has no open draft and the draft was active within 24 hours of the export; otherwise it is stored
//   as abandoned (work item 164).
// - The file's active program stays active only if the phone has no active program.
// - pinnedExercises become the phone's pins when it has none (slice 4).
// - Keys v1 doesn't use locally (settings, userId, copyStatus, ...) are ignored.

import CryptoKit
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

/// What one import changed on the phone, next to what the file held.
public struct ImportReport: Sendable, Equatable {
    /// Counts of rows in the file, by kind.
    public let file: ImportSummary
    public let addedPrograms: Int
    public let addedWorkouts: Int
    public let addedSets: Int
    public let addedSavedWorkouts: Int
    public let addedCustomExercises: Int
    /// Programs, workouts and saved workouts already on the phone that the file changed
    /// (their own row or anything under them).
    public let updated: Int
    /// Programs, workouts and saved workouts already on the phone and already up to date.
    public let unchanged: Int
    /// Logged sets that came from an earlier file and that the web has since deleted.
    public let removedSets: Int

    public init(file: ImportSummary, addedPrograms: Int, addedWorkouts: Int, addedSets: Int, addedSavedWorkouts: Int,
                addedCustomExercises: Int, updated: Int, unchanged: Int, removedSets: Int = 0) {
        self.file = file
        self.addedPrograms = addedPrograms
        self.addedWorkouts = addedWorkouts
        self.addedSets = addedSets
        self.addedSavedWorkouts = addedSavedWorkouts
        self.addedCustomExercises = addedCustomExercises
        self.updated = updated
        self.unchanged = unchanged
        self.removedSets = removedSets
    }
}

extension AppDatabase {
    /// Imports a ripit-export v1 file in one transaction. Throws `ImportError` for a refused file.
    @discardableResult
    public func importExport(data: Data) throws -> ImportSummary {
        try importReport(data: data).file
    }

    /// Imports a ripit-export v1 file in one transaction and says what changed.
    /// Throws `ImportError` for a refused file.
    @discardableResult
    public func importReport(data: Data) throws -> ImportReport {
        let file = try ExportFile.decode(data)
        do {
            return try dbQueue.write { db in
                var importer = ExportImporter(file: file, db: db)
                try importer.run()
                return importer.report()
            }
        } catch is DatabaseError {
            // A row the schema rejects (a dangling reference, a missing value): the transaction rolled back.
            throw ImportError.corrupt
        }
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

/// What happened to one row.
private enum Outcome {
    case added, updated, unchanged
    /// The id exists but the row was created on the phone: never touched.
    case keptLocal

    /// The outcome of a parent and its children: added wins, then updated.
    func merged(_ other: Outcome) -> Outcome {
        switch (self, other) {
        case (.added, _): .added
        case (_, .updated), (.updated, _), (_, .added): .updated
        default: self
        }
    }
}

private struct ExportImporter {
    let file: ExportFile
    let db: Database
    /// File exercise definition id -> local exerciseDefinition id.
    private var definitionIds: [String: String] = [:]
    private var counts: [String: Int] = [:]

    init(file: ExportFile, db: Database) {
        self.file = file
        self.db = db
    }

    mutating func run() throws {
        for custom in file.customExercises { try resolveCustom(custom) }
        for ref in file.exerciseRefs where definitionIds[ref.id] == nil { try resolveRef(ref) }

        for program in file.programs { tally(try upsert(program)) }
        for completion in file.workoutCompletions {
            let outcome = try upsert(completion)
            tally(outcome)
            if outcome == .added { counts["addedWorkouts", default: 0] += 1 }
        }
        try importPins()
        for saved in file.savedWorkouts {
            let outcome = try upsert(saved)
            tally(outcome)
            if outcome == .added { counts["addedSavedWorkouts", default: 0] += 1 }
        }
    }

    func report() -> ImportReport {
        ImportReport(
            file: ImportSummary(programs: file.programs.count, workouts: file.workoutCompletions.count,
                                savedWorkouts: file.savedWorkouts.count, customExercises: file.customExercises.count,
                                loggedSets: file.workoutCompletions.reduce(0) { $0 + $1.loggedSets.count }),
            addedPrograms: counts["addedPrograms", default: 0], addedWorkouts: counts["addedWorkouts", default: 0],
            addedSets: counts["addedSets", default: 0], addedSavedWorkouts: counts["addedSavedWorkouts", default: 0],
            addedCustomExercises: counts["addedCustomExercises", default: 0],
            updated: counts["updated", default: 0], unchanged: counts["unchanged", default: 0],
            removedSets: counts["removedSets", default: 0])
    }

    private mutating func tally(_ outcome: Outcome) {
        switch outcome {
        case .updated: counts["updated", default: 0] += 1
        case .unchanged, .keptLocal: counts["unchanged", default: 0] += 1
        case .added: break
        }
    }

    // MARK: Exercise definitions (insert only)

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
                 movementPattern, intensityClass, isBodyweight, taggedAt, taggedBy, importHash)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'insert-only')
            """, arguments: [
                e.id, e.name, normalizeExerciseName(e.name), try jsonText(e.aliases), e.category, e.createdBy,
                e.createdAt, e.updatedAt, try jsonText(e.equipment), e.instructions, e.notes, try jsonText(e.imageUrls),
                try jsonText(e.primaryFAUs), try jsonText(e.secondaryFAUs), e.force, e.mechanic, e.level,
                e.movementPattern, e.intensityClass, e.isBodyweight, e.taggedAt, e.taggedBy,
            ])
        definitionIds[e.id] = e.id
        counts["addedCustomExercises", default: 0] += 1
    }

    private mutating func resolveRef(_ ref: ExportFile.ExerciseRef) throws {
        if let local = try existingDefinition(id: ref.id, name: ref.name) {
            definitionIds[ref.id] = local
            return
        }
        // Not in the catalog: keep it under its own id, so its sets keep their exercise.
        try db.execute(sql: """
            INSERT INTO exerciseDefinition (id, name, normalizedName, isSystem, createdAt, updatedAt, importHash)
            VALUES (?, ?, ?, 0, ?, ?, 'insert-only')
            """, arguments: [ref.id, ref.name, normalizeExerciseName(ref.name), file.exportedAt, file.exportedAt])
        definitionIds[ref.id] = ref.id
    }

    private func definitionId(_ fileId: String) throws -> String {
        guard let local = definitionIds[fileId] else { throw ImportError.corrupt }
        return local
    }

    // MARK: Upsert

    /// Inserts the row if its id is new. If it exists and came from a file, updates `columns` only when
    /// the file's values changed since the last import (`importHash`), so phone edits to rows the web
    /// left alone survive. `hashed` are the file's own values; `columns` may differ from them where the
    /// phone applies a rule (the active program, imported drafts). `linkColumns` are set on insert only.
    private func upsert(_ table: String, id: String, columns: [(String, (any DatabaseValueConvertible)?)],
                        hashed: [(any DatabaseValueConvertible)?], linkColumns: [(String, (any DatabaseValueConvertible)?)] = [])
        throws -> Outcome
    {
        let hash = Self.hash(hashed)
        guard let existing = try Row.fetchOne(db, sql: "SELECT importHash FROM \"\(table)\" WHERE id = ?", arguments: [id]) else {
            let all = [("id", id as (any DatabaseValueConvertible)?)] + linkColumns + columns + [("importHash", hash)]
            let names = all.map { "\"\($0.0)\"" }.joined(separator: ", ")
            try db.execute(sql: "INSERT INTO \"\(table)\" (\(names)) VALUES (\(databaseQuestionMarks(count: all.count)))",
                           arguments: StatementArguments(all.map(\.1)))
            return .added
        }
        guard let stored: String = existing["importHash"] else { return .keptLocal }
        if stored == hash { return .unchanged }
        let sets = (columns.map { "\"\($0.0)\" = ?" } + ["importHash = ?"]).joined(separator: ", ")
        try db.execute(sql: "UPDATE \"\(table)\" SET \(sets) WHERE id = ?",
                       arguments: StatementArguments(columns.map(\.1) + [hash, id]))
        return .updated
    }

    private static func hash(_ values: [(any DatabaseValueConvertible)?]) -> String {
        let text = values.map { ($0?.databaseValue ?? .null).description }.joined(separator: "\u{1F}")
        return SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    private mutating func upsert(_ p: ExportFile.Program) throws -> Outcome {
        // The file's active program stays active only if the phone has no other active program.
        let otherActive = try Bool.fetchOne(db, sql: "SELECT 1 FROM program WHERE isActive = 1 AND id != ?",
                                            arguments: [p.id]) ?? false
        let fields: [(String, (any DatabaseValueConvertible)?)] = [
            ("name", p.name), ("description", p.description), ("isActive", p.isActive),
            ("createdAt", p.createdAt), ("updatedAt", p.updatedAt), ("isUserCreated", p.isUserCreated),
            ("programType", p.programType), ("isArchived", p.isArchived), ("archivedAt", p.archivedAt),
            ("deletedAt", p.deletedAt), ("goals", try jsonText(p.goals)), ("level", p.level),
            ("durationWeeks", p.durationWeeks), ("durationDisplay", p.durationDisplay),
            ("targetDaysPerWeek", p.targetDaysPerWeek), ("equipmentNeeded", try jsonText(p.equipmentNeeded)),
            ("focusAreas", try jsonText(p.focusAreas)), ("sourceCommunityProgramId", p.sourceCommunityProgramId),
        ]
        let columns = fields.map { $0.0 == "isActive" ? ($0.0, p.isActive && !otherActive) : $0 }
        var outcome = try upsert("program", id: p.id, columns: columns, hashed: fields.map(\.1))
        if outcome == .added { counts["addedPrograms", default: 0] += 1 }
        for week in p.weeks {
            let weekFields: [(String, (any DatabaseValueConvertible)?)] = [
                ("weekNumber", week.weekNumber), ("name", week.name), ("description", week.description),
            ]
            outcome = outcome.merged(try upsert("week", id: week.id, columns: weekFields, hashed: weekFields.map(\.1),
                                                linkColumns: [("programId", p.id)]))
            for workout in week.workouts {
                let workoutFields: [(String, (any DatabaseValueConvertible)?)] = [
                    ("name", workout.name), ("dayNumber", workout.dayNumber),
                ]
                outcome = outcome.merged(try upsert("workout", id: workout.id, columns: workoutFields,
                                                    hashed: workoutFields.map(\.1), linkColumns: [("weekId", week.id)]))
                for exercise in workout.exercises { outcome = outcome.merged(try upsert(exercise)) }
            }
        }
        return outcome
    }

    private func upsert(_ e: ExportFile.Exercise) throws -> Outcome {
        let fields: [(String, (any DatabaseValueConvertible)?)] = [
            ("name", e.name), ("exerciseDefinitionId", try definitionId(e.exerciseDefinitionId)), ("order", e.order),
            ("exerciseGroup", e.exerciseGroup), ("notes", e.notes), ("isOneOff", e.isOneOff),
        ]
        var outcome = try upsert("exercise", id: e.id, columns: fields, hashed: fields.map(\.1),
                                 linkColumns: [("workoutId", e.workoutId), ("workoutCompletionId", e.workoutCompletionId)])
        for s in e.prescribedSets {
            let setFields: [(String, (any DatabaseValueConvertible)?)] = [
                ("setNumber", s.setNumber), ("reps", s.reps), ("weight", s.weight), ("rpe", s.rpe), ("rir", s.rir),
                ("isWarmup", s.isWarmup),
            ]
            outcome = outcome.merged(try upsert("prescribedSet", id: s.id, columns: setFields, hashed: setFields.map(\.1),
                                                linkColumns: [("exerciseId", e.id)]))
        }
        return outcome
    }

    private mutating func upsert(_ c: ExportFile.WorkoutCompletion) throws -> Outcome {
        let fields: [(String, (any DatabaseValueConvertible)?)] = [
            ("savedWorkoutId", c.savedWorkoutId), ("completedAt", c.completedAt), ("startedAt", c.startedAt),
            ("status", c.status), ("notes", c.notes), ("isArchived", c.isArchived), ("cycleNumber", c.cycleNumber),
            ("isAdHoc", c.isAdHoc), ("name", c.name), ("durationSeconds", c.durationSeconds),
            ("sessionRpe", c.sessionRpe),
        ]
        var columns = fields
        if c.status == "draft" {
            let status = try resumable(c) ? "draft" : "abandoned"
            columns = fields.map { field -> (String, (any DatabaseValueConvertible)?) in
                switch field.0 {
                // The web sets completedAt when a session starts; a local draft has none.
                case "completedAt": ("completedAt", status == "draft" ? nil : c.completedAt)
                case "status": ("status", status)
                default: field
                }
            }
        }
        var outcome = try upsert("workoutCompletion", id: c.id, columns: columns, hashed: fields.map(\.1),
                                 linkColumns: [("workoutId", c.workoutId)])
        for exercise in c.exercises { outcome = outcome.merged(try upsert(exercise)) }
        // A session that came from an earlier file: the file is the truth for its file-origin sets.
        let phoneSets = outcome == .added || outcome == .keptLocal ? [] : try reconcileSets(c, &outcome)
        for s in c.loggedSets {
            let setFields: [(String, (any DatabaseValueConvertible)?)] = [
                ("setNumber", s.setNumber), ("reps", s.reps), ("weight", s.weight), ("weightUnit", s.weightUnit),
                ("rpe", s.rpe), ("rir", s.rir), ("isWarmup", s.isWarmup), ("createdAt", s.createdAt),
            ]
            let setOutcome = try upsert("loggedSet", id: s.id, columns: setFields, hashed: setFields.map(\.1),
                                        linkColumns: [("exerciseId", s.exerciseId), ("completionId", c.id)])
            if setOutcome == .added { counts["addedSets", default: 0] += 1 }
            outcome = outcome.merged(setOutcome)
        }
        // Phone sets moved aside go after the file's sets for their exercise, in their old order.
        for phoneSet in phoneSets {
            try db.execute(sql: """
                UPDATE loggedSet SET setNumber =
                    (SELECT MAX(setNumber) FROM loggedSet WHERE completionId = ? AND exerciseId = ?) + 1
                WHERE id = ?
                """, arguments: [c.id, phoneSet.exerciseId, phoneSet.id])
        }
        return outcome
    }

    /// Before a file-origin session's sets are written: deletes file-origin sets the file no longer
    /// lists, moves the rest to their file numbers in two passes (temporary negatives first, so
    /// UNIQUE(completionId, exerciseId, setNumber) never trips), and moves phone sets that would
    /// collide out of the way. Returns those phone sets, to be numbered after the file's sets.
    private mutating func reconcileSets(_ c: ExportFile.WorkoutCompletion, _ outcome: inout Outcome)
        throws -> [(id: String, exerciseId: String)]
    {
        let fileIds = c.loggedSets.map(\.id)
        let marks = fileIds.isEmpty ? "NULL" : databaseQuestionMarks(count: fileIds.count)
        try db.execute(sql: """
            DELETE FROM loggedSet WHERE completionId = ? AND importHash IS NOT NULL AND id NOT IN (\(marks))
            """, arguments: StatementArguments([c.id] + fileIds))
        if db.changesCount > 0 {
            counts["removedSets", default: 0] += db.changesCount
            outcome = outcome.merged(.updated)
        }

        // Pass 1: every set of this session that the file lists, and every phone set sitting on a number
        // the file wants, goes to a unique negative number.
        let targets = Set(c.loggedSets.map { "\($0.exerciseId)|\($0.setNumber)" })
        let rows = try Row.fetchAll(db, sql: """
            SELECT id, exerciseId, setNumber, importHash FROM loggedSet WHERE completionId = ? ORDER BY setNumber
            """, arguments: [c.id])
        var phoneMoved: [(id: String, exerciseId: String)] = []
        var temp = -1
        for row in rows {
            let id: String = row["id"]
            let exerciseId: String = row["exerciseId"]
            let setNumber: Int = row["setNumber"]
            let fromFile = (row["importHash"] as String?) != nil
            guard fromFile || targets.contains("\(exerciseId)|\(setNumber)") else { continue }
            try db.execute(sql: "UPDATE loggedSet SET setNumber = ? WHERE id = ?", arguments: [temp, id])
            temp -= 1
            if !fromFile { phoneMoved.append((id, exerciseId)) }
        }
        // Pass 2: file sets already here take the file's numbers; the upserts that follow compare the
        // rest of their values.
        for s in c.loggedSets {
            try db.execute(sql: "UPDATE loggedSet SET setNumber = ? WHERE id = ? AND importHash IS NOT NULL",
                           arguments: [s.setNumber, s.id])
        }
        return phoneMoved
    }

    /// The file's pinned lifts become the phone's pins only when the phone has none, so a later
    /// import never brings back a lift unpinned on the phone.
    private func importPins() throws {
        guard let pins = file.pinnedExercises, !pins.isEmpty,
              try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM pinnedExercise") == 0 else { return }
        for pin in pins.sorted(by: { $0.position < $1.position }) {
            try AppDatabase.appendPin(db, try definitionId(pin.exerciseDefinitionId))
        }
    }

    /// A web draft can be resumed on the phone only if the phone has no open draft of its own and the
    /// draft was active (started, or last logged a set) within 24 hours before the export.
    private func resumable(_ c: ExportFile.WorkoutCompletion) throws -> Bool {
        let otherDraft = try Bool.fetchOne(db, sql: """
            SELECT 1 FROM workoutCompletion WHERE status = 'draft' AND isArchived = 0 AND id != ?
            """, arguments: [c.id]) ?? false
        if otherDraft { return false }
        let activity = ([c.startedAt, c.completedAt] + c.loggedSets.map(\.createdAt)).compactMap { $0 }.max()
        guard let activity else { return false }
        return file.exportedAt.timeIntervalSince(activity) <= 24 * 3600
    }

    private func upsert(_ w: ExportFile.SavedWorkout) throws -> Outcome {
        let fields: [(String, (any DatabaseValueConvertible)?)] = [
            ("name", w.name), ("notes", w.notes), ("sourceCompletionId", w.sourceCompletionId),
            ("workoutData", try jsonText(rewritingDefinitionIds(w.workoutData))), ("exerciseCount", w.exerciseCount),
            ("createdAt", w.createdAt), ("updatedAt", w.updatedAt), ("lastUsedAt", w.lastUsedAt),
            ("pinnedAt", w.pinnedAt), ("origin", w.origin), ("archivedAt", w.archivedAt),
            ("dismissedAt", w.dismissedAt),
        ]
        return try upsert("savedWorkout", id: w.id, columns: fields, hashed: fields.map(\.1))
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
