// Scenarios: "Create a custom exercise", "Edit a custom exercise".
// Each case is what the web's own routes did (Tests/Fixtures/picker/picker.json):
// POST /api/exercise-definitions, GET .../check-duplicate, PATCH .../[id].
// Two departures from the web (Dustin, work item 189 follow-up 1): the name is trimmed on save,
// and a name with no letter or digit is refused ("Name must include a letter or number").
//
// The golden covers:
// - create: minimal, every field, spaces around the name (stored trimmed), the 100 and 1000
//   limits (the name counted once trimmed), specialized equipment; each problem alone (no name,
//   blank, 101, no or unknown
//   equipment, no or unknown primary, unknown secondary, 1001 instructions), all at once, and a
//   problem beating a duplicate; duplicates of a built-in (case, punctuation, spaces, hyphen), of
//   a custom, of one just made; not duplicates (hyphen for a space; "Farmer's Walk", whose
//   built-in is stored with its apostrophe); a punctuation-only name (alone, with spaces, with
//   another problem); a single digit, a letter outside a-z; a duplicate once trimmed
// - check-duplicate: the same rules, plus excluding the exercise itself or another
// - edit: rename with every field, same name in another case, unchanged name, rename onto a
//   built-in or another custom, problems, punctuation only, spaces around a new name (trimmed;
//   still checked for a duplicate), a built-in (refused), a missing id
// Creates run in order on one database; each edit starts from a fresh one.
//
// API used:
// - createCustomExercise(_:), updateCustomExercise(_:_:), duplicateExercise(named:excluding:)
// - CustomExerciseDraft.problems(), CustomExerciseError, FieldProblem

import Foundation
import Testing
@testable import RipitCore

@Suite("Custom exercises: create, duplicate check and edit match the web")
struct CustomExerciseGoldenTests {
    static let file = try? PickerGolden.load()
    static let duplicateLabels = file?.duplicates.map(\.label) ?? []
    static let editLabels = file?.edits.map(\.label) ?? []

    @Test("Golden: picker.json has the create, duplicate and edit cases")
    func goldenLoads() throws {
        let file = try PickerGolden.load()
        #expect(file.creates.count == 32)
        #expect(file.duplicates.count == 10)
        #expect(file.edits.count == 12)
    }

    @Test("Create matches the web, case by case, in order")
    func creates() throws {
        let file = try PickerGolden.load()
        var (db, customs) = try PickerGolden.freshDatabase(file)
        for c in file.creates {
            let draft = c.draft.draft
            if c.status == 200 {
                #expect(try draft.problems().isEmpty, "\(c.label)")
                let id = try db.createCustomExercise(draft)
                customs.ids[c.stored?.name ?? c.draft.name] = id   // the web labels it by its stored (trimmed) name
                #expect(try PickerGolden.stored(db, id) == c.stored, "\(c.label)")
            } else {
                let before = try db.customIds()
                let expected = try #require(PickerGolden.expectedError(c, customs), "\(c.label)")
                #expect(throws: expected, "\(c.label)") { try db.createCustomExercise(draft) }
                if case .invalid(let problems) = expected {
                    #expect(try draft.problems() == problems, "\(c.label)")
                } else {
                    #expect(try draft.problems().isEmpty, "\(c.label): a duplicate is not a validation problem")
                }
                #expect(try db.customIds() == before, "\(c.label): nothing saved")
            }
        }
    }

    @Test("Duplicate check matches the web", arguments: duplicateLabels)
    func duplicates(_ label: String) throws {
        let file = try PickerGolden.load()
        let c = try #require(file.duplicates.first { $0.label == label })
        let (db, customs) = try PickerGolden.freshDatabase(file)
        let found = try db.duplicateExercise(named: c.name, excluding: c.exclude.map { customs.local("custom:\($0)") })
        #expect(found == c.existing.map(customs.local), "\(label)")
        #expect((found != nil) == c.exists, "\(label)")
    }

    @Test("Edit matches the web", arguments: editLabels)
    func edits(_ label: String) throws {
        let file = try PickerGolden.load()
        let c = try #require(file.edits.first { $0.label == label })
        let (db, customs) = try PickerGolden.freshDatabase(file)
        let target = try #require(c.target)
        let id = target.hasPrefix("seed:") ? try PickerGolden.seedId(target) : customs.local("custom:\(target)")
        let before = try PickerGolden.stored(db, id)
        switch c.status {
        case 200:
            try db.updateCustomExercise(id, c.draft.draft)
            #expect(try PickerGolden.stored(db, id) == c.stored, "\(label)")
        case 404:
            #expect(throws: RipitCoreError.notFound("exerciseDefinition \(id)"), "\(label)") {
                try db.updateCustomExercise(id, c.draft.draft)
            }
        default:
            let expected = try #require(PickerGolden.expectedError(c, customs), "\(label)")
            #expect(throws: expected, "\(label)") { try db.updateCustomExercise(id, c.draft.draft) }
            #expect(try PickerGolden.stored(db, id) == before, "\(label): nothing changed")
        }
    }
}
