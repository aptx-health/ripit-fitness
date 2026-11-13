// Scenarios: "The exercise catalog ships with the app", "Search the catalog".
// Oracle: prisma/seeds/exercise-definitions.json and scripts/exercise-mapping.json (see Support.swift).
// Expected search results were recorded from the seed with: lowercase, drop every character
// that is not a letter, digit or space, trim; match when the query is a substring of the
// name or of any alias.
//
// API used:
// - ExerciseCatalog.bundled(), .exercises, .search(_:)
// - AppDatabase.systemExerciseIds()

import Foundation
import Testing
@testable import RipitCore

@Suite("Catalog: bundled exercises and search")
struct CatalogTests {
    // ---- Ships with the app

    @Test("Catalog: all 312 system exercises are bundled, matching the seed ids and names")
    func bundledMatchesSeed() throws {
        let catalog = try ExerciseCatalog.bundled()
        let seed = try Repo.seedExercises()
        #expect(seed.count == 312)
        #expect(catalog.exercises.count == 312)
        #expect(Set(catalog.exercises.map(\.id)) == Set(seed.map(\.id)))
        let names = Dictionary(uniqueKeysWithValues: catalog.exercises.map { ($0.id, $0.name) })
        for s in seed { #expect(names[s.id] == s.name, "\(s.id)") }
        let aliases = Dictionary(uniqueKeysWithValues: catalog.exercises.map { ($0.id, $0.aliases) })
        #expect(aliases[benchPressId] == ["bench press", "flat bench", "bb bench"])
    }

    @Test("Catalog: a fresh database holds the same 312 system exercises")
    func freshDatabaseHasCatalog() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        let ids = try db.systemExerciseIds()
        #expect(ids.count == 312)
        #expect(Set(ids) == Set(try Repo.seedExercises().map(\.id)))
        _ = try tmp.open()
        #expect(try tmp.open().systemExerciseIds().count == 312, "reopening must not duplicate the catalog")
    }

    @Test("Catalog: each exercise with a matched image has a start and a finish image")
    func matchedExercisesHaveTwoImages() throws {
        let catalog = try ExerciseCatalog.bundled()
        let matched = try Repo.imageMatchedIds()
        #expect(matched.count == 297)
        for e in catalog.exercises where matched.contains(e.id) {
            #expect(e.images.count == 2, "\(e.name)")
            #expect(Set(e.images).count == e.images.count, "\(e.name): start and finish must differ")
            #expect(e.images.allSatisfy { !$0.isEmpty }, "\(e.name)")
        }
    }

    @Test("Catalog: an exercise with no image has no image names (the app shows a placeholder)")
    func unmatchedExercisesHaveNoImages() throws {
        let catalog = try ExerciseCatalog.bundled()
        let matched = try Repo.imageMatchedIds()
        let unmatched = catalog.exercises.filter { !matched.contains($0.id) }
        #expect(unmatched.count == 15)
        for e in unmatched { #expect(e.images.isEmpty, "\(e.name)") }
    }

    // ---- Search

    static let benchNames: Set<String> = [
        "Barbell Bench Press", "Incline Barbell Bench Press", "Dumbbell Bench Press", "Tricep Dip",
        "Smith Machine Bench Press", "Close Grip Bench Press", "Bench Press",
        "Smith Machine Incline Bench Press", "Incline Dumbbell Press", "Incline Dumbbell Bench Press",
        "Decline Dumbbell Bench Press",
    ]

    func names(_ q: String) throws -> [String] { try ExerciseCatalog.bundled().search(q).map(\.name) }

    @Test("Search: \"bench\" matches by name and by alias")
    func benchByNameAndAlias() throws {
        let found = try names("bench")
        #expect(Set(found) == Self.benchNames)
        #expect(found.contains("Tricep Dip"), "alias-only match (\"bench dip\")")
        #expect(found.contains("Incline Dumbbell Press"), "alias-only match (\"incline dumbbell bench press\")")
    }

    @Test("Search: each exercise appears once even when name and alias both match")
    func noDuplicates() throws {
        let found = try names("bench")
        #expect(found.count == Set(found).count)
        #expect(found.filter { $0 == "Barbell Bench Press" }.count == 1)
    }

    @Test("Search: the match ignores case", arguments: ["BENCH", "Bench", "bEnCh"])
    func ignoresCase(_ q: String) throws {
        #expect(Set(try names(q)) == Self.benchNames)
    }

    @Test("Search: the match ignores punctuation in the name")
    func ignoresPunctuationInName() throws {
        // "Farmer's Walk" has no alias containing "farmers walk"; only the name can match.
        #expect(Set(try names("farmers walk")) == ["Farmer's Walk", "Farmer Walk", "Kettlebell Farmer Carry"])
    }

    @Test("Search: the match ignores punctuation in the query", arguments: ["bench!", "bench.", "farmer's walk"])
    func ignoresPunctuationInQuery(_ q: String) throws {
        let clean = q.hasPrefix("bench") ? "bench" : "farmers walk"
        #expect(Set(try names(q)) == Set(try names(clean)))
        #expect(!(try names(q)).isEmpty)
    }

    @Test("Search: an alias abbreviation finds its exercise; nonsense finds nothing")
    func aliasAbbreviationAndNoMatch() throws {
        #expect(try names("cgbp") == ["Close Grip Bench Press"])
        #expect(try names("zzzz").isEmpty)
    }
}
