// Scenarios: "Search like the web", "Filter by muscle group", "Filter by equipment",
// "Search and filters together".
// Each case runs the web's search (app/api/exercises/search, with the params
// ExerciseSearchInterface.tsx sends) over the bundled catalog plus four custom exercises, and the
// phone must return the same exercises in the same order (Tests/Fixtures/picker/picker.json).
// Two departures from the web (Dustin, work item 189 follow-up 1): all matches are sorted by score
// before the limit cuts, and a query with no letter or digit acts as no query.
//
// The golden covers:
// - text: a name match, the exact name scoring first, case, surrounding spaces, alias equal only
//   ("cgbp", "rdl", "bench dip" but not "bench di"), hyphens and spaces ("pull-up", "pull up",
//   "pullup"), apostrophes, a query of only punctuation (acts as no query, alone or with a
//   filter), digits only ("90"), no match, a custom exercise, an alias equal outscoring a name
//   match ("flat bench"), more than 50 and more than 100 matches ("e", "a": sorted, then cut),
//   built-in before custom on equal score, alias-contains scoring ("press")
// - muscle (one at a time, as on the web): three groups, a secondary muscle on a custom not counting
// - equipment (one at a time, as on the web): barbell, kettlebell, "other" (every specialized type,
//   including resistance bands), "other" with limit 100 (reaches the customs), "bench" (common, not other)
// - together: text + muscle, text + equipment, all three, text + other, no result
// - nothing typed: the first 50, and 100
// - the editor's equipment and muscle lists, and what "other" stands for
//
// API used:
// - searchExercises(_:), ExerciseSearch, PickerExercise
// - createCustomExercise(_:) (to add the golden's custom exercises)
// - ExerciseChoices.equipment(), .muscles(), .other(); ExerciseCatalog.bundled()

import Foundation
import Testing
@testable import RipitCore

@Suite("Picker: search and filters match the web")
struct PickerSearchGoldenTests {
    static let file = try? PickerGolden.load()
    static let labels = file?.searches.map(\.label) ?? []

    @Test("Golden: picker.json loads and has every search case")
    func goldenLoads() throws {
        let file = try PickerGolden.load()
        #expect(file.searches.count == 40)
        #expect(file.collation == "en_US.utf8")
    }

    @Test("Search matches the web", arguments: labels)
    func matchesWeb(_ label: String) throws {
        let file = try PickerGolden.load()
        let c = try #require(file.searches.first { $0.label == label })
        let (db, customs) = try PickerGolden.freshDatabase(file)
        let found = try db.searchExercises(c.search)
        #expect(found.map(\.name) == c.results.map(\.name), "\(label)")
        #expect(found.map { customs.golden($0.id) } == c.results.map(\.id), "\(label)")
    }

    @Test("Search: a result carries the catalog's photos, muscles and equipment; custom ones are marked mine")
    func resultFields() throws {
        let file = try PickerGolden.load()
        let (db, customs) = try PickerGolden.freshDatabase(file)
        let catalog = Dictionary(uniqueKeysWithValues: try ExerciseCatalog.bundled().exercises.map { ($0.id, $0) })
        let seed = try Repo.json("prisma/seeds/exercise-definitions.json") as! [[String: Any]]
        let primary = Dictionary(uniqueKeysWithValues: seed.map { ($0["id"] as! String, $0["primaryFAUs"] as! [String]) })

        // Text and both filters together: photos still show.
        let found = try db.searchExercises(ExerciseSearch(query: "press", muscle: "chest", equipment: "barbell"))
        #expect(!found.isEmpty)
        #expect(found.contains { !$0.images.isEmpty }, "the photos still show")
        for e in found {
            let built = try #require(catalog[e.id])
            #expect(!e.isCustom)
            #expect(e.images == built.images, "\(e.name)")
            #expect(e.equipment == built.equipment, "\(e.name)")
            #expect(e.aliases == built.aliases, "\(e.name)")
            #expect(e.primaryMuscles == primary[e.id], "\(e.name)")
        }

        let sled = try #require(try db.searchExercises(ExerciseSearch(query: "sled push")).first)
        #expect(sled.id == customs.local("custom:Sled Push"))
        #expect(sled.isCustom)
        #expect(sled.images.isEmpty)
        #expect(sled.equipment == ["sled"])
        #expect(sled.primaryMuscles == ["quads"])
        #expect(sled.secondaryMuscles == ["glutes", "calves"])
    }

    @Test("Search: clearing the filters gives the unfiltered results back")
    func clearFilters() throws {
        let file = try PickerGolden.load()
        let (db, _) = try PickerGolden.freshDatabase(file)
        let filtered = try db.searchExercises(ExerciseSearch(query: "curl", muscle: "biceps", equipment: "cable"))
        let cleared = try db.searchExercises(ExerciseSearch(query: "curl"))
        let golden = try #require(file.searches.first { $0.label == "text: curl" })
        #expect(filtered.count < cleared.count)
        #expect(cleared.map(\.name) == golden.results.map(\.name))
    }

    @Test("Choices: the editor's equipment and muscle lists, and what Other stands for, match the web")
    func choices() throws {
        let file = try PickerGolden.load()
        #expect(try ExerciseChoices.equipment() == file.choices.equipment.map { Choice(key: $0.key, label: $0.label) })
        #expect(try ExerciseChoices.muscles() == file.choices.muscles.map { Choice(key: $0.key, label: $0.label) })
        #expect(try ExerciseChoices.other() == file.choices.other)
        #expect(try ExerciseChoices.muscles().map(\.label) == (try ExerciseChoices.muscles()).map { ExerciseInfo.muscleName($0.key) })
    }
}
