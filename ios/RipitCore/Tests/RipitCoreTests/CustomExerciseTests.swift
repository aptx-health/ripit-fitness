// Scenarios: "Pick several at once", "Create a custom exercise" (saved, found, added right away,
// marked as mine), "Edit a custom exercise" (shows in search, logger and history; built-in
// refused), "Custom exercises everywhere" (logger, Last time, History, Progress, saved workouts,
// programs, relaunch, re-import).
// Expected values follow the spec; the web's validation and duplicate rules are in
// CustomExerciseGoldenTests. All data is synthetic.
//
// API used:
// - createCustomExercise(_:), updateCustomExercise(_:_:), customExercise(_:), searchExercises(_:)
// - PickList, addExercises(definitionIds:to:)
// - earlier slices: startWorkout, addExercise, logSet, finishWorkout, workout, history, lastTime,
//   exerciseHistory, exerciseInfo, liftHistory, saveWorkout, savedWorkoutPlan, startSavedWorkout,
//   createProgram, program, importExport(data:)

import Foundation
import GRDB
import Testing
@testable import RipitCore

@Suite("Custom exercises and multi-pick")
struct CustomExerciseTests {
    static let garage = CustomExerciseDraft(name: "Garage Press", equipment: ["dumbbell"], primaryMuscles: ["front-delts"],
                                            secondaryMuscles: ["triceps"], instructions: "Press from the shoulder.")
    static let squatId = "cmiz7vjpo0001vr0msv9of7ib"   // Barbell Back Squat
    static let rowId = "cmiz7vk1i0003vr0mqucd1f52"     // Barbell Row

    // ---- Create

    @Test("Create: saved, found by search, and marked as mine")
    func createdIsFound() throws {
        let db = try AppDatabase.inMemory()
        let id = try db.createCustomExercise(Self.garage)
        let found = try db.searchExercises(ExerciseSearch(query: "garage"))
        #expect(found.map(\.id) == [id])
        #expect(found.first?.isCustom == true)
        #expect(found.first?.name == "Garage Press")
        #expect(try db.searchExercises(ExerciseSearch(muscle: "front-delts", equipment: "dumbbell", limit: 100)).contains { $0.id == id })
        #expect(try db.customExercise(id) == Self.garage)
        #expect(try db.searchExercises(ExerciseSearch(query: "barbell bench press")).allSatisfy { !$0.isCustom })
    }

    @Test("Create: empty instructions are stored as none")
    func emptyInstructions() throws {
        let db = try AppDatabase.inMemory()
        var draft = Self.garage
        draft.instructions = ""
        let id = try db.createCustomExercise(draft)
        #expect(try db.customExercise(id)?.instructions == nil)
        #expect(try db.exerciseInfo(definitionId: id)?.instructions == nil)
    }

    @Test("Create: survives a relaunch")
    func survivesRelaunch() throws {
        let tmp = try TempDB()
        let id = try tmp.open().createCustomExercise(Self.garage)
        let reopened = try tmp.open()
        #expect(try reopened.customExercise(id) == Self.garage)
        #expect(try reopened.searchExercises(ExerciseSearch(query: "garage press")).map(\.id) == [id])
        #expect(try reopened.customIds() == [id], "reopening must not duplicate it")
        #expect(try reopened.systemExerciseIds().count == 312)
    }

    @Test("Create: can be added right away and logged; shows in the logger, History, Last time, Info and Progress")
    func usableEverywhere() throws {
        let db = try AppDatabase.inMemory()
        let id = try db.createCustomExercise(Self.garage)
        let start = Clock.at(2026, 11, 2, 18)
        let w = try db.startWorkout(at: start)
        let e = try db.addExercise(definitionId: id, to: w)
        _ = try db.logSet(exerciseId: e, reps: 8, weight: 40)
        _ = try db.logSet(exerciseId: e, reps: 6, weight: 45)
        #expect(try db.workout(w).exercises.map(\.name) == ["Garage Press"])
        #expect(try db.workout(w).exercises.first?.definitionId == id)
        try db.finishWorkout(w, at: start.addingTimeInterval(3600))

        #expect(try db.history().first?.exerciseCount == 1)
        #expect(try db.history().first?.setCount == 2)
        let last = try #require(try db.lastTime(definitionId: id, includeIntensity: false))
        #expect(last.fill?.weight == "45")
        #expect(try db.exerciseHistory(definitionId: id).count == 1)
        let info = try #require(try db.exerciseInfo(definitionId: id))
        #expect(info == ExerciseInfo(instructions: "Press from the shoulder.", primaryMuscles: ["front-delts"],
                                     secondaryMuscles: ["triceps"], equipment: ["dumbbell"]))
        let lift = try #require(try db.liftHistory(id, timeZone: Clock.tz, now: Clock.at(2026, 11, 7, 12), unit: .lbs))
        #expect(lift.name == "Garage Press")
        #expect(lift.sessions.count == 1)
    }

    @Test("Create: works in saved workouts and programs")
    func savedAndPrograms() throws {
        let db = try AppDatabase.inMemory()
        let id = try db.createCustomExercise(Self.garage)
        let start = Clock.at(2026, 11, 2, 18)
        let w = try db.makeWorkout(start: start, finish: start.addingTimeInterval(1800), [(id, [(8, 40)])])
        let saved = try db.saveWorkout(fromCompletion: w, name: "Garage Day", notes: nil, at: start.addingTimeInterval(2000))
        #expect(try db.savedWorkoutPlan(saved).map(\.exerciseDefinitionId) == [id])
        let again = try db.startSavedWorkout(saved, at: start.addingTimeInterval(86_400))
        #expect(try db.workout(again).exercises.map(\.definitionId) == [id])

        let program = try db.createProgram(ProgramPlan(name: "Garage Block", weeks: [[
            PlannedWorkout("Day 1", [PlannedExercise(id, sets: [PlannedSet(reps: "8", weight: "40")])]),
        ]]))
        let ex = try #require(try db.program(program).weeks.first?.workouts.first?.exercises.first)
        #expect(ex.definitionId == id)
        #expect(ex.name == "Garage Press")
    }

    // ---- Edit

    @Test("Edit: the change shows in search, the logger, History and Info")
    func editShowsEverywhere() throws {
        let db = try AppDatabase.inMemory()
        let id = try db.createCustomExercise(Self.garage)
        let start = Clock.at(2026, 11, 2, 18)
        let done = try db.makeWorkout(start: start, finish: start.addingTimeInterval(1800), [(id, [(8, 40)])])
        let open = try db.startWorkout(at: start.addingTimeInterval(86_400))
        _ = try db.addExercise(definitionId: id, to: open)

        let edited = CustomExerciseDraft(name: "Garage Push Press", equipment: ["kettlebell"], primaryMuscles: ["front-delts", "triceps"],
                                         secondaryMuscles: [], instructions: "Dip and drive.")
        try db.updateCustomExercise(id, edited)

        #expect(try db.customExercise(id) == edited)
        #expect(try db.searchExercises(ExerciseSearch(query: "push press")).contains { $0.id == id })
        #expect(try db.searchExercises(ExerciseSearch(query: "garage press")).isEmpty)
        #expect(try db.searchExercises(ExerciseSearch(equipment: "kettlebell", limit: 100)).contains { $0.id == id })
        #expect(try db.workout(open).exercises.map(\.name) == ["Garage Push Press"], "the logger")
        #expect(try db.workout(done).exercises.map(\.name) == ["Garage Push Press"], "history")
        #expect(try db.exerciseInfo(definitionId: id)?.instructions == "Dip and drive.")
        #expect(try db.exerciseInfo(definitionId: id)?.equipment == ["kettlebell"])
        #expect(try db.exerciseHistory(definitionId: id).count == 1, "history stays with the exercise")
    }

    @Test("Edit: built-in exercises can't be edited or opened in the editor")
    func builtInRefused() throws {
        let db = try AppDatabase.inMemory()
        let before = try PickerGolden.stored(db, benchPressId)
        #expect(throws: CustomExerciseError.builtIn) {
            try db.updateCustomExercise(benchPressId, CustomExerciseDraft(name: "My Bench", equipment: ["barbell"], primaryMuscles: ["chest"]))
        }
        #expect(try PickerGolden.stored(db, benchPressId) == before)
        #expect(try db.customExercise(benchPressId) == nil)
        #expect(try db.customExercise("no-such-id") == nil)
    }

    // ---- Import

    static let fileSled = "cmw6s043800hgvrt4dfj6k6d2"   // the export's custom "Sled Push"

    @Test("Import: a custom exercise made on the phone is matched by name, not duplicated, and kept as it was")
    func importMatchesPhoneCustom() throws {
        let db = try AppDatabase.inMemory()
        let phone = try db.createCustomExercise(CustomExerciseDraft(name: "Sled Push", equipment: ["sled"], primaryMuscles: ["quads"]))
        _ = try db.importExport(data: try ExportFixture.withCatalogIds())
        #expect(try db.customIds().filter { try db.customExercise($0)?.name == "Sled Push" } == [phone])
        let sledDef = try db.read { try String.fetchOne($0, sql: "SELECT exerciseDefinitionId FROM exercise WHERE id = ?", arguments: [FileIds.adHocSled]) }
        #expect(sledDef == phone, "the file's sets point at the phone's exercise")
        #expect(try db.customExercise(phone)?.primaryMuscles == ["quads"], "the phone's fields are kept")
        #expect(try db.searchExercises(ExerciseSearch(query: "sled push")).map(\.id) == [phone])

        let customs = try db.customIds()
        _ = try db.importExport(data: try ExportFixture.withCatalogIds())
        #expect(try db.customIds() == customs, "a re-import adds no custom exercise")
    }

    @Test("Import: an imported custom exercise is mine, editable, and a re-import keeps the edit")
    func importedCustomEditable() throws {
        let db = try AppDatabase.inMemory()
        _ = try db.importExport(data: try ExportFixture.withCatalogIds())
        let found = try #require(try db.searchExercises(ExerciseSearch(query: "sled push")).first)
        #expect(found.id == Self.fileSled)
        #expect(found.isCustom)
        let edited = CustomExerciseDraft(name: "Sled Drive", equipment: ["sled"], primaryMuscles: ["quads"], instructions: nil)
        try db.updateCustomExercise(Self.fileSled, edited)
        let customs = try db.customIds()
        _ = try db.importExport(data: try ExportFixture.withCatalogIds())
        #expect(try db.customExercise(Self.fileSled) == edited)
        #expect(try db.customIds() == customs)
    }

    // ---- Multi-pick

    @Test("Pick list: ticks keep their order; unticking removes; ticking again goes last")
    func pickList() throws {
        var list = PickList()
        for id in ["a", "b", "c"] { try list.toggle(id) }
        #expect(list.ids == ["a", "b", "c"])
        try list.toggle("b")
        #expect(list.ids == ["a", "c"])
        #expect(!list.contains("b"))
        try list.toggle("b")
        #expect(list.ids == ["a", "c", "b"])
        #expect(list.contains("b"))
    }

    @Test("Add several: all added, in the order picked, after what the workout has")
    func addSeveral() throws {
        let db = try AppDatabase.inMemory()
        let custom = try db.createCustomExercise(Self.garage)
        let w = try db.startWorkout(at: Clock.at(2026, 11, 2, 18))
        let first = try db.addExercise(definitionId: benchPressId, to: w)
        let added = try db.addExercises(definitionIds: [Self.rowId, custom, Self.squatId], to: w)
        #expect(added.count == 3)
        let exercises = try db.workout(w).exercises
        #expect(exercises.map(\.id) == [first] + added)
        #expect(exercises.map(\.definitionId) == [benchPressId, Self.rowId, custom, Self.squatId])
        #expect(exercises.map(\.name) == ["Barbell Bench Press", "Barbell Row", "Garage Press", "Barbell Back Squat"])
        #expect(try db.addExercises(definitionIds: [], to: w).isEmpty)
    }

    @Test("Add several: an unknown exercise adds none of them")
    func addSeveralUnknown() throws {
        let db = try AppDatabase.inMemory()
        let w = try db.startWorkout(at: Clock.at(2026, 11, 2, 18))
        #expect(throws: RipitCoreError.notFound("exerciseDefinition nope")) {
            try db.addExercises(definitionIds: [Self.rowId, "nope"], to: w)
        }
        #expect(try db.workout(w).exercises.isEmpty)
    }
}
