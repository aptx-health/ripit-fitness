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
//   instructions (at most 1000). The messages are the web's.
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
        throw RipitCoreError.notImplemented
    }
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
    public static func equipment() throws -> [Choice] { throw RipitCoreError.notImplemented }
    /// Muscle groups (FAU_DISPLAY_NAMES), in the web's order.
    public static func muscles() throws -> [Choice] { throw RipitCoreError.notImplemented }
    /// What the search's "other" stands for (SPECIALIZED_EQUIPMENT), in the web's order.
    public static func other() throws -> [String] { throw RipitCoreError.notImplemented }
}

/// The exercises ticked in the picker, in the order they were ticked. Ticking one again unticks it;
/// ticking it after that puts it last (the web's AdHocExercisePickerModal).
public struct PickList: Sendable, Equatable {
    public private(set) var ids: [String] = []

    public init() {}

    public func contains(_ id: String) -> Bool { ids.contains(id) }

    public mutating func toggle(_ id: String) throws {
        throw RipitCoreError.notImplemented
    }
}

extension AppDatabase {
    /// The picker's results, as the web's search returns them (rules at the top of this file).
    public func searchExercises(_ search: ExerciseSearch) throws -> [PickerExercise] {
        throw RipitCoreError.notImplemented
    }

    /// The id of another exercise (built-in or custom) with this name once normalized, else nil.
    /// `excluding` leaves one exercise out (the one being edited).
    public func duplicateExercise(named name: String, excluding: String? = nil) throws -> String? {
        throw RipitCoreError.notImplemented
    }

    /// Saves a new custom exercise and returns its id. Throws CustomExerciseError.invalid, then
    /// .duplicateName.
    public func createCustomExercise(_ draft: CustomExerciseDraft) throws -> String {
        throw RipitCoreError.notImplemented
    }

    /// Replaces a custom exercise's fields. Throws RipitCoreError.notFound("exerciseDefinition <id>"),
    /// CustomExerciseError.builtIn, .invalid, then .duplicateName. A new name shows wherever the exercise is used.
    public func updateCustomExercise(_ id: String, _ draft: CustomExerciseDraft) throws {
        throw RipitCoreError.notImplemented
    }

    /// The editor's fields for a custom exercise; nil when it doesn't exist or is built-in.
    public func customExercise(_ id: String) throws -> CustomExerciseDraft? {
        throw RipitCoreError.notImplemented
    }

    /// Adds several exercises to a workout, in this order, after the ones it has, and returns the
    /// new exercise ids. An unknown definition id adds none and throws
    /// RipitCoreError.notFound("exerciseDefinition <id>"), as addExercise does.
    public func addExercises(definitionIds: [String], to workoutId: String) throws -> [String] {
        throw RipitCoreError.notImplemented
    }
}
