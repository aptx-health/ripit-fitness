// The exercise picker's search and filters, multi-pick, and custom exercises (slice 8,
// features/ios-app/picker-custom.feature). Shapes were fixed by work item 189's tests
// (Picker*Tests, the contract); work item 190 fills in the bodies.
//
// The web is the oracle; Tests/Fixtures/picker/picker.json is what its own routes did
// (scripts/ios/picker.goldens.ts). The phone departs from it on three points, marked PHONE below
// (Dustin, 2026-11-08: trimmed names, sort then cut, a letter or digit required). The rules:
//
// Search (app/api/exercises/search, called with ExerciseSearchInterface's params):
// - The query is trimmed; an empty one adds no text condition. PHONE: so does a query with no
//   letter or digit (Unicode \p{L} or \p{N}), such as "!!" or " - ".
// - Text: the name contains the query, ignoring case; or the stored normalizedName contains the
//   query lowercased with everything but a-z and 0-9 removed; or one alias equals the query
//   lowercased (exact only, as on the web).
// - Filters are single-choice, as on the web (FilterChoiceSheet). Muscle: a primary muscle of the
//   exercise. Equipment: in the exercise's equipment, where "other" stands for any type in
//   `ExerciseChoices.other` (resistance bands included, as on the web).
// - Every condition applies. Built-in exercises first, then custom ones, each by name in the web
//   database's collation (en_US.utf8: case, spaces and punctuation are only tie-breakers). Then,
//   with a query, a stable sort by score, highest first: name equal +100, else name starts with
//   +50, else name contains +25; an alias equal +75; an alias containing +15 (everything
//   lowercased). Then the first `limit` rows. PHONE: the web cuts to `limit` before scoring.
//
// Custom exercises (lib/validators/exercise-definition.ts, app/api/exercise-definitions):
// - Problems, in this order: name (required once trimmed; at most 100 UTF-16 units once
//   trimmed; PHONE: else, with no letter or digit (\p{L} or \p{N}), "Name must include a letter
//   or number"), equipment (at least one; each a key of `ExerciseChoices.equipment` or "bench" or
//   "pull_up_bar"), primary muscles (at least one; each known), secondary muscles (each known),
//   instructions (at most 4000; the web raised it from 1000 on 2026-11-09). The messages are the web's.
// - Then a duplicate: another exercise, built-in or custom, whose normalizedName equals
//   normalizeExerciseName(name).
// - PHONE: the name is stored trimmed (the web stores it as typed); everything above uses the
//   trimmed name. Empty instructions are stored as nil.
// - Editing: a built-in is refused; problems as for create; the duplicate check runs only when the
//   trimmed name differs from the stored one, and ignores the exercise itself.

import Foundation
import GRDB

/// What the picker has typed and picked.
public struct ExerciseSearch: Sendable, Equatable {
    public var query: String
    /// One muscle (FAU) key, a primary muscle; nil for all.
    public var muscle: String?
    /// One equipment key; nil for all. "other" stands for every specialized type.
    public var equipment: String?
    /// The web's picker asks for 50.
    public var limit: Int

    public init(query: String = "", muscle: String? = nil, equipment: String? = nil, limit: Int = 50) {
        self.query = query
        self.muscle = muscle
        self.equipment = equipment
        self.limit = limit
    }
}

/// One picker row: a built-in or custom exercise definition.
public struct PickerExercise: Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let aliases: [String]
    public let equipment: [String]
    public let primaryMuscles: [String]
    public let secondaryMuscles: [String]
    /// Bundled image names, `[start, finish]`, or `[]` (custom exercises have none).
    public let images: [String]
    /// The person's own exercise ("mine"); false for built-in ones.
    public let isCustom: Bool

    public init(id: String, name: String, aliases: [String], equipment: [String], primaryMuscles: [String],
                secondaryMuscles: [String], images: [String], isCustom: Bool) {
        self.id = id
        self.name = name
        self.aliases = aliases
        self.equipment = equipment
        self.primaryMuscles = primaryMuscles
        self.secondaryMuscles = secondaryMuscles
        self.images = images
        self.isCustom = isCustom
    }
}

/// The editor's fields for a custom exercise.
public struct CustomExerciseDraft: Sendable, Equatable {
    public var name: String
    public var equipment: [String]
    public var primaryMuscles: [String]
    public var secondaryMuscles: [String]
    public var instructions: String?

    public init(name: String, equipment: [String], primaryMuscles: [String], secondaryMuscles: [String] = [],
                instructions: String? = nil) {
        self.name = name
        self.equipment = equipment
        self.primaryMuscles = primaryMuscles
        self.secondaryMuscles = secondaryMuscles
        self.instructions = instructions
    }

    /// The validation problems, in the web's order (plus the phone's letter-or-digit rule); empty
    /// when the draft can be saved.
    public func problems() throws -> [FieldProblem] {
        var problems: [FieldProblem] = []
        let name = trimmedName
        if name.isEmpty {
            problems.append(FieldProblem(field: "name", message: "Name is required"))
        } else if name.utf16.count > 100 {
            problems.append(FieldProblem(field: "name", message: "Name must be 100 characters or less"))
        } else if !hasLetterOrDigit(name) {
            problems.append(FieldProblem(field: "name", message: "Name must include a letter or number"))
        }
        let validEquipment = Set(try ExerciseChoices.equipment().map(\.key) + ["bench", "pull_up_bar"])
        if equipment.isEmpty {
            problems.append(FieldProblem(field: "equipment", message: "At least one equipment type is required"))
        } else if case let bad = equipment.filter({ !validEquipment.contains($0) }), !bad.isEmpty {
            problems.append(FieldProblem(field: "equipment", message: "Invalid equipment types: \(bad.joined(separator: ", "))"))
        }
        let validMuscles = Set(try ExerciseChoices.muscles().map(\.key))
        if primaryMuscles.isEmpty {
            problems.append(FieldProblem(field: "primaryFAUs", message: "At least one primary muscle group is required"))
        } else if case let bad = primaryMuscles.filter({ !validMuscles.contains($0) }), !bad.isEmpty {
            problems.append(FieldProblem(field: "primaryFAUs", message: "Invalid muscle groups: \(bad.joined(separator: ", "))"))
        }
        if case let bad = secondaryMuscles.filter({ !validMuscles.contains($0) }), !bad.isEmpty {
            problems.append(FieldProblem(field: "secondaryFAUs", message: "Invalid muscle groups: \(bad.joined(separator: ", "))"))
        }
        if let instructions, instructions.utf16.count > 1000 {
            problems.append(FieldProblem(field: "instructions", message: "Instructions must be 1000 characters or less"))
        }
        return problems
    }

    /// The name as stored (PHONE: trimmed).
    var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
}

/// One validation problem, as the web reports it: field "name", "equipment", "primaryFAUs",
/// "secondaryFAUs" or "instructions", and the web's message.
public struct FieldProblem: Sendable, Equatable {
    public let field: String
    public let message: String

    public init(field: String, message: String) {
        self.field = field
        self.message = message
    }
}

public enum CustomExerciseError: Error, Equatable {
    /// The web's 422: every problem, in its order.
    case invalid([FieldProblem])
    /// The web's 409 ("An exercise with this name already exists"), with the exercise it matched.
    case duplicateName(existingId: String)
    /// The web's 403: built-in exercises can't be edited.
    case builtIn
}

/// A choice in the editor or a filter sheet: a stored key and the web's label.
public struct Choice: Sendable, Equatable {
    public let key: String
    public let label: String

    public init(key: String, label: String) {
        self.key = key
        self.label = label
    }
}

public enum ExerciseChoices {
    /// The editor's equipment list, in the web's order (EQUIPMENT_GROUPS common, then specialized).
    public static func equipment() throws -> [Choice] { equipmentList }
    /// Muscle groups (FAU_DISPLAY_NAMES), in the web's order.
    public static func muscles() throws -> [Choice] { muscleList }
    /// What the search's "other" stands for (SPECIALIZED_EQUIPMENT), in the web's order.
    public static func other() throws -> [String] { otherList }

    private static let equipmentList: [Choice] = [
        ("barbell", "Barbell"), ("dumbbell", "Dumbbell"), ("kettlebell", "Kettlebell"), ("cable", "Cable"),
        ("machine", "Machine"), ("smith_machine", "Smith Machine"), ("bodyweight", "Bodyweight"),
        ("resistance_band", "Resistance Band"), ("ez_bar", "EZ Bar"), ("safety_squat_bar", "Safety Squat Bar"),
        ("trap_bar", "Trap Bar"), ("swiss_bar", "Swiss Bar"), ("chains", "Chains"), ("bands", "Bands"), ("sled", "Sled"),
        ("dip_bars", "Dip Bars"), ("incline_bench", "Incline Bench"), ("decline_bench", "Decline Bench"),
        ("preacher_bench", "Preacher Bench"), ("ab_wheel", "Ab Wheel"), ("parallel_bars", "Parallel Bars"),
        ("roman_chair", "Roman Chair"), ("hangboard", "Hangboard"), ("campus_board", "Campus Board"),
        ("system_board", "System Board"), ("climbing_wall", "Climbing Wall"), ("foam_roller", "Foam Roller"),
        ("weight_belt", "Weight Belt"), ("suspension_trainer", "Suspension Trainer"), ("plyo_box", "Plyo Box"),
        ("medicine_ball", "Medicine Ball"), ("functional_trainer", "Functional Trainer (Dual-Pulley)"),
        ("assisted_pullup_dip", "Assisted Pull-Up / Dip"), ("other", "Other"),
    ].map { Choice(key: $0.0, label: $0.1) }

    private static let muscleList: [Choice] = [
        "chest", "mid-back", "lower-back", "front-delts", "side-delts", "rear-delts", "lats", "traps", "biceps",
        "triceps", "forearms", "quads", "adductors", "hamstrings", "glutes", "calves", "abs", "obliques",
    ].map { Choice(key: $0, label: ExerciseInfo.muscleName($0)) }

    private static let otherList = [
        "resistance_band", "ez_bar", "dip_bars", "incline_bench", "decline_bench", "preacher_bench", "ab_wheel",
        "foam_roller", "weight_belt", "parallel_bars", "roman_chair", "hangboard", "campus_board", "system_board",
        "climbing_wall", "safety_squat_bar", "trap_bar", "swiss_bar", "chains", "bands", "sled", "suspension_trainer",
        "plyo_box", "medicine_ball", "functional_trainer", "assisted_pullup_dip", "other",
    ]
}

/// The exercises ticked in the picker, in the order they were ticked. Ticking one again unticks it;
/// ticking it after that puts it last (the web's AdHocExercisePickerModal).
public struct PickList: Sendable, Equatable {
    public private(set) var ids: [String] = []

    public init() {}

    public func contains(_ id: String) -> Bool { ids.contains(id) }

    public mutating func toggle(_ id: String) throws {
        if let i = ids.firstIndex(of: id) { ids.remove(at: i) } else { ids.append(id) }
    }
}

/// Unicode \p{L} or \p{N}: the phone's "a letter or digit" rule for names and queries.
func hasLetterOrDigit(_ s: String) -> Bool {
    s.unicodeScalars.contains { CharacterSet.letters.contains($0) || $0.properties.numericType != nil }
}

extension AppDatabase {
    /// The picker's results, as the web's search returns them (rules at the top of this file).
    public func searchExercises(_ search: ExerciseSearch) throws -> [PickerExercise] {
        let query = search.query.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasQuery = !query.isEmpty && hasLetterOrDigit(query)
        var conditions: [String] = []
        var arguments: [any DatabaseValueConvertible] = []
        if let muscle = search.muscle {
            conditions.append("EXISTS (SELECT 1 FROM json_each(primaryFAUs) WHERE value = ?)")
            arguments.append(muscle)
        }
        if let equipment = search.equipment {
            let key = equipment.replacingFirst("dumbbells", "dumbbell").replacingFirst("resistance band", "resistance_band")
            let keys = key == "other" ? try ExerciseChoices.other() : [key]
            conditions.append("EXISTS (SELECT 1 FROM json_each(equipment) WHERE value IN (\(databaseQuestionMarks(count: keys.count))))")
            arguments.append(contentsOf: keys)
        }
        let rows = try dbQueue.read { db in
            try Row.fetchAll(db, sql: """
                SELECT id, name, normalizedName, aliases, equipment, primaryFAUs, secondaryFAUs, imageUrls, isSystem
                FROM exerciseDefinition \(conditions.isEmpty ? "" : "WHERE " + conditions.joined(separator: " AND "))
                """, arguments: StatementArguments(arguments) ?? [])
        }
        let images = Dictionary(uniqueKeysWithValues: try BundledCatalog.load().records.map { ($0.id, $0.images) })
        var found: [(exercise: PickerExercise, key: CollationKey)] = rows.compactMap { row in
            let name: String = row["name"]
            let aliases = Self.list(row["aliases"])
            if hasQuery {
                let lowered = query.lowercased()
                let squashed = String(String.UnicodeScalarView(lowered.unicodeScalars.filter {
                    ("a"..."z").contains($0) || ("0"..."9").contains($0)
                }))
                let normalized: String = row["normalizedName"]
                guard name.lowercased().contains(lowered) || squashed.isEmpty || normalized.lowercased().contains(squashed)
                    || aliases.contains(lowered) else { return nil }
            }
            let id: String = row["id"]
            let isSystem: Bool = row["isSystem"]
            let exercise = PickerExercise(id: id, name: name, aliases: aliases, equipment: Self.list(row["equipment"]),
                                          primaryMuscles: Self.list(row["primaryFAUs"]),
                                          secondaryMuscles: Self.list(row["secondaryFAUs"]),
                                          images: isSystem ? images[id] ?? [] : [], isCustom: !isSystem)
            return (exercise, CollationKey(name))
        }
        found.sort { a, b in
            a.exercise.isCustom != b.exercise.isCustom ? !a.exercise.isCustom : a.key < b.key
        }
        var result = found.map(\.exercise)
        if hasQuery {
            let term = query.lowercased()
            func score(_ e: PickerExercise) -> Int {
                let name = e.name.lowercased()
                var score = name == term ? 100 : name.hasPrefix(term) ? 50 : name.contains(term) ? 25 : 0
                if e.aliases.contains(where: { $0.lowercased() == term }) { score += 75 }
                if e.aliases.contains(where: { $0.lowercased().contains(term) }) { score += 15 }
                return score
            }
            result = result.enumerated().map { ($0.offset, score($0.element), $0.element) }
                .sorted { $0.1 != $1.1 ? $0.1 > $1.1 : $0.0 < $1.0 }
                .map(\.2)
        }
        return Array(result.prefix(min(search.limit, 100)))
    }

    /// The id of another exercise (built-in or custom) with this name once normalized, else nil.
    /// `excluding` leaves one exercise out (the one being edited).
    public func duplicateExercise(named name: String, excluding: String? = nil) throws -> String? {
        try dbQueue.read { try Self.duplicate($0, name, excluding: excluding) }
    }

    /// Saves a new custom exercise and returns its id. Throws CustomExerciseError.invalid, then
    /// .duplicateName.
    public func createCustomExercise(_ draft: CustomExerciseDraft) throws -> String {
        let problems = try draft.problems()
        guard problems.isEmpty else { throw CustomExerciseError.invalid(problems) }
        let id = Self.newId()
        try dbQueue.write { db in
            if let existing = try Self.duplicate(db, draft.trimmedName, excluding: nil) {
                throw CustomExerciseError.duplicateName(existingId: existing)
            }
            let now = Date()
            try db.execute(sql: """
                INSERT INTO exerciseDefinition
                    (id, name, normalizedName, isSystem, createdAt, updatedAt, equipment, instructions,
                     primaryFAUs, secondaryFAUs, isBodyweight)
                VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [
                    id, draft.trimmedName, normalizeExerciseName(draft.trimmedName), now, now, try Self.jsonList(draft.equipment),
                    draft.storedInstructions, try Self.jsonList(draft.primaryMuscles), try Self.jsonList(draft.secondaryMuscles),
                    draft.equipment.contains("bodyweight"),
                ])
        }
        return id
    }

    /// Replaces a custom exercise's fields. Throws RipitCoreError.notFound("exerciseDefinition <id>"),
    /// CustomExerciseError.builtIn, .invalid, then .duplicateName. A new name shows wherever the exercise is used.
    public func updateCustomExercise(_ id: String, _ draft: CustomExerciseDraft) throws {
        try dbQueue.write { db in
            guard let row = try Row.fetchOne(db, sql: "SELECT name, isSystem FROM exerciseDefinition WHERE id = ?", arguments: [id]) else {
                throw RipitCoreError.notFound("exerciseDefinition \(id)")
            }
            if row["isSystem"] as Bool { throw CustomExerciseError.builtIn }
            let problems = try draft.problems()
            guard problems.isEmpty else { throw CustomExerciseError.invalid(problems) }
            let name = draft.trimmedName
            if name != row["name"] as String, let existing = try Self.duplicate(db, name, excluding: id) {
                throw CustomExerciseError.duplicateName(existingId: existing)
            }
            try db.execute(sql: """
                UPDATE exerciseDefinition
                SET name = ?, normalizedName = ?, equipment = ?, instructions = ?, primaryFAUs = ?, secondaryFAUs = ?,
                    isBodyweight = ?, updatedAt = ?
                WHERE id = ?
                """, arguments: [
                    name, normalizeExerciseName(name), try Self.jsonList(draft.equipment), draft.storedInstructions,
                    try Self.jsonList(draft.primaryMuscles), try Self.jsonList(draft.secondaryMuscles),
                    draft.equipment.contains("bodyweight"), Date(), id,
                ])
            // Workouts and programs copy the name onto each exercise row.
            try db.execute(sql: "UPDATE exercise SET name = ? WHERE exerciseDefinitionId = ?", arguments: [name, id])
        }
    }

    /// The editor's fields for a custom exercise; nil when it doesn't exist or is built-in.
    public func customExercise(_ id: String) throws -> CustomExerciseDraft? {
        try dbQueue.read { db in
            guard let row = try Row.fetchOne(db, sql: """
                SELECT name, equipment, primaryFAUs, secondaryFAUs, instructions FROM exerciseDefinition
                WHERE id = ? AND isSystem = 0
                """, arguments: [id]) else { return nil }
            return CustomExerciseDraft(name: row["name"], equipment: Self.list(row["equipment"]),
                                       primaryMuscles: Self.list(row["primaryFAUs"]),
                                       secondaryMuscles: Self.list(row["secondaryFAUs"]), instructions: row["instructions"])
        }
    }

    /// Adds several exercises to a workout, in this order, after the ones it has, and returns the
    /// new exercise ids. An unknown definition id adds none and throws
    /// RipitCoreError.notFound("exerciseDefinition <id>"), as addExercise does.
    public func addExercises(definitionIds: [String], to workoutId: String) throws -> [String] {
        try dbQueue.write { db in
            try definitionIds.map { try Self.insertOneOff(db, definitionId: $0, workoutId: workoutId) }
        }
    }

    // MARK: - Helpers

    private static func duplicate(_ db: Database, _ name: String, excluding: String?) throws -> String? {
        try String.fetchOne(db, sql: """
            SELECT id FROM exerciseDefinition WHERE normalizedName = ? AND id IS NOT ?
            ORDER BY isSystem DESC LIMIT 1
            """, arguments: [normalizeExerciseName(name), excluding])
    }

    private static func list(_ text: String?) -> [String] {
        (try? JSONDecoder().decode([String].self, from: Data((text ?? "[]").utf8))) ?? []
    }

    private static func jsonList(_ value: [String]) throws -> String {
        String(decoding: try JSONEncoder().encode(value), as: UTF8.self)
    }
}

extension CustomExerciseDraft {
    /// Empty instructions are stored as nil.
    var storedInstructions: String? { instructions?.isEmpty == false ? instructions : nil }
}

/// Sorts names the way the web database's en_US.utf8 collation does: letters and digits first,
/// ignoring case; then case and punctuation only break ties.
struct CollationKey: Comparable {
    let primary: String
    let secondary: String
    let raw: String

    init(_ name: String) {
        let lowered = name.lowercased()
        primary = String(String.UnicodeScalarView(lowered.unicodeScalars.filter {
            CharacterSet.alphanumerics.contains($0)
        }))
        secondary = lowered
        raw = name
    }

    static func < (a: CollationKey, b: CollationKey) -> Bool {
        if a.primary != b.primary { return a.primary.unicodeScalars.lexicographicallyPrecedes(b.primary.unicodeScalars) }
        if a.secondary != b.secondary { return a.secondary.unicodeScalars.lexicographicallyPrecedes(b.secondary.unicodeScalars) }
        return a.raw.unicodeScalars.lexicographicallyPrecedes(b.raw.unicodeScalars)
    }
}

private extension String {
    func replacingFirst(_ target: String, _ replacement: String) -> String {
        guard let range = range(of: target) else { return self }
        return replacingCharacters(in: range, with: replacement)
    }
}
