// Debug-build-only launch arguments for simulator screenshots (work item 154).
// None of this is compiled into a Release build.
//   -resetState YES     delete the database before opening it (a fresh install)
//   -demoHistory YES    add three finished sample workouts (synthetic data)
//   -demoWorkout YES    add an unfinished workout with sets and a superset, and open it
//   -demoStayHome YES   with -demoWorkout, stay on history (shows the resume card)
//   -demoPicker <query> open the exercise picker over the workout, searching <query>
//   -demoImport <path>  import that file at launch (it must be inside the app's container)
//   -demoImportPicker YES  open the Files picker for import
//   -demoEmptyWorkout YES  open a workout with one exercise and no sets
//   -demoFinish YES     tap Finish on the open workout
//   -demoRemove YES     show the remove confirmation for the first exercise
//   -demoFocusWeight YES  focus the first exercise's weight field (shows select-all)
//   -demoDetail YES     open the newest finished workout
//   -demoDiscard YES    show the discard confirmation over the workout
// Slice 3 (work item 161):
//   -demoProgram YES    add an active 2-week sample program (synthetic), plus a second inactive one
//   -demoDone <n>       finish the first n workouts of the sample program
//   -demoSession YES    start Up Next and log one set, and open it
//   -demoProgressTab YES  open on the Progress tab
//   -demoLiftPage YES   with it, open the first lift of the week
//   -demoScreen <s>     open programs | program | edit | builder from Training
//   -demoEditExercise YES  on the edit screen, open the first exercise's sheet
//   -demoHistoryTab YES start on the History tab
// Work item 170:
//   -demoStayHome YES   with -demoSession too, stay on Training (shows the resume card)
//   -demoArchiveActive YES  archive the sample program after starting its session
//   -demoStartOther YES ask to start another program workout while the session is open
//   -demoEditFlow YES   with -demoScreen edit (work item 171): open the first exercise, remove its
//                       first set and save; reopen it (shows the saved plan), change a rep and save
//   -demoCancelBuilder YES  with -demoScreen builder, tap Cancel (shows the discard prompt)

import Foundation
import RipitCore

enum DebugHooks {
    /// The picker query to open with, from -demoPicker.
    static var pickerQuery: String? {
        #if DEBUG
        return UserDefaults.standard.string(forKey: "demoPicker")
        #else
        return nil
        #endif
    }

    /// A Bool launch argument, always false in Release.
    static func flag(_ key: String) -> Bool {
        #if DEBUG
        return UserDefaults.standard.bool(forKey: key)
        #else
        return false
        #endif
    }

    static func applyBeforeOpen(databaseURL: URL) {
        #if DEBUG
        if UserDefaults.standard.bool(forKey: "resetState") {
            for suffix in ["", "-wal", "-shm"] {
                try? FileManager.default.removeItem(atPath: databaseURL.path + suffix)
            }
        }
        #endif
    }

    @MainActor
    static func applyAfterOpen(store: WorkoutStore) {
        #if DEBUG
        let d = UserDefaults.standard
        if let path = d.string(forKey: "demoImport") {
            Task { await store.importFile(at: URL(fileURLWithPath: path)) }
        }
        applyProgramDemo(store: store)
        guard d.bool(forKey: "demoHistory") || d.bool(forKey: "demoWorkout") || d.bool(forKey: "demoEmptyWorkout"),
              let db = try? AppDatabase.open(path: WorkoutStore.databaseURL.path) else { return }
        let bench = "cmiz7vjju0000vr0m4b1o6bec", row = "cmiz7vk1i0003vr0mqucd1f52", squat = "cmiz7vjpo0001vr0msv9of7ib"
        let day: TimeInterval = 86_400
        if d.bool(forKey: "demoHistory") {
            for (ago, sets) in [(3.0, [(8, 135.0), (5, 155.0)]), (2.0, [(5, 185.0), (5, 185.0), (5, 185.0)]), (1.0, [(8, 140.0)])] {
                let start = Date().addingTimeInterval(-ago * day)
                if let w = try? db.startWorkout(at: start), let e = try? db.addExercise(definitionId: ago == 2 ? squat : bench, to: w) {
                    for (reps, weight) in sets { _ = try? db.logSet(exerciseId: e, reps: reps, weight: weight) }
                    try? db.finishWorkout(w, at: start.addingTimeInterval(3000))
                }
            }
        }
        if d.bool(forKey: "demoWorkout"), let w = try? db.startWorkout(at: Date().addingTimeInterval(-1200)) {
            let ids = [bench, row, squat].compactMap { try? db.addExercise(definitionId: $0, to: w) }
            if ids.count == 3 {
                _ = try? db.logSet(exerciseId: ids[0], reps: 8, weight: 135)
                _ = try? db.logSet(exerciseId: ids[0], reps: 5, weight: 155)
                _ = try? db.logSet(exerciseId: ids[1], reps: 10, weight: 62.5, unit: "kg")
                try? db.groupAsSuperset([ids[0], ids[1]])
            }
        }
        if d.bool(forKey: "demoEmptyWorkout"), let w = try? db.startWorkout(at: Date().addingTimeInterval(-300)) {
            _ = try? db.addExercise(definitionId: bench, to: w)
        }
        store.reload()
        if d.bool(forKey: "demoEmptyWorkout") { store.resumeWorkout() }
        if d.bool(forKey: "demoWorkout") && !d.bool(forKey: "demoStayHome") { store.resumeWorkout() }
        #endif
    }

    @MainActor
    private static func applyProgramDemo(store: WorkoutStore) {
        #if DEBUG
        let d = UserDefaults.standard
        guard d.bool(forKey: "demoProgram"), let db = try? AppDatabase.open(path: WorkoutStore.databaseURL.path) else { return }
        let bench = "cmiz7vjju0000vr0m4b1o6bec", row = "cmiz7vk1i0003vr0mqucd1f52", squat = "cmiz7vjpo0001vr0msv9of7ib"
        let day1 = PlannedWorkout("Upper A", [
            PlannedExercise(bench, sets: Array(repeating: PlannedSet(reps: "5", weight: "75%"), count: 3)),
            PlannedExercise(row, sets: Array(repeating: PlannedSet(reps: "8-12", weight: "RPE 8"), count: 3)),
        ])
        let day2 = PlannedWorkout("Lower A", [PlannedExercise(squat, sets: Array(repeating: PlannedSet(reps: "5", weight: "225"), count: 3))])
        let day3 = PlannedWorkout("Full Body", [
            PlannedExercise(bench, group: "A", sets: Array(repeating: PlannedSet(reps: "10"), count: 2)),
            PlannedExercise(row, group: "A", sets: Array(repeating: PlannedSet(reps: "10"), count: 2)),
            PlannedExercise(squat, sets: [PlannedSet(reps: "AMRAP", weight: "185")]),
        ])
        guard let id = try? db.createProgram(ProgramPlan(name: "Strength Base", weeks: [[day1, day2, day3], [day1, day2, day3]])),
              let program = try? db.program(id) else { return }
        _ = try? db.createProgram(ProgramPlan(name: "Summer Hypertrophy", weeks: [[day1, day3]]))
        try? db.activateProgram(id)
        let workouts = program.weeks.flatMap(\.workouts)
        let start = Date().addingTimeInterval(-Double(workouts.count + 1) * 86_400)
        for (i, w) in workouts.prefix(d.integer(forKey: "demoDone")).enumerated() {
            let at = start.addingTimeInterval(Double(i) * 86_400)
            guard let s = try? db.startProgramWorkout(w.id, at: at), let ex = try? db.programSession(s).exercises else { continue }
            for e in ex { for _ in e.planned { _ = try? db.logSet(exerciseId: e.id, reps: 5, weight: e.definitionId == squat ? 225 : 135) } }
            try? db.finishWorkout(s, at: at.addingTimeInterval(3600))
        }
        if d.bool(forKey: "demoSession"), let next = try? db.upNext(),
           let s = try? db.startProgramWorkout(next.workoutId, at: Date().addingTimeInterval(-900)),
           let first = try? db.programSession(s).exercises.first {
            _ = try? db.logSet(exerciseId: first.id, reps: 5, weight: first.definitionId == squat ? 225 : 135)
        }
        if d.bool(forKey: "demoArchiveActive") { try? db.archiveProgram(id) }
        store.reload()
        if d.bool(forKey: "demoSession") && !d.bool(forKey: "demoStayHome") { store.resumeWorkout() }
        if d.bool(forKey: "demoStartOther"), let other = workouts.last(where: { $0.id != store.session?.workoutId }) {
            store.startProgramWorkout(other.id)
        }
        #endif
    }

    /// -demoEditFlow: 0 = first open, 1 = saved once, 2 = reopened.
    @MainActor private static var editFlow = 0

    /// Runs the reviewer's 165 flow inside the exercise sheet, one step per open.
    @MainActor
    static func editFlowStep(removeFirstSet: @escaping () -> Void, changeRep: @escaping () -> Void, save: @escaping () -> Void) {
        #if DEBUG
        guard flag("demoEditFlow") else { return }
        switch editFlow {
        case 0:
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                removeFirstSet()
                editFlow = 1
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: save)
            }
        case 2:
            // Leave the reopened sheet on screen for the screenshot, then save again.
            DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
                changeRep()
                editFlow = 3
                save()
            }
        default: break
        }
        #endif
    }

    @MainActor
    static func editFlowDismissed(reopen: @escaping (String) -> Void) {
        #if DEBUG
        guard flag("demoEditFlow"), editFlow == 1, let id = editFlowExerciseId else { return }
        editFlow = 2
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { reopen(id) }
        #endif
    }

    @MainActor static var editFlowExerciseId: String?

    /// Opens the screen named by -demoScreen once, from the Training home.
    @MainActor
    static func openTrainingRoute(store: WorkoutStore, path: inout [TrainingRoute], building: inout Bool) {
        #if DEBUG
        guard path.isEmpty, !openedScreen, let screen = UserDefaults.standard.string(forKey: "demoScreen") else { return }
        openedScreen = true
        let id = store.activeProgram?.id ?? store.programs.first?.id
        switch screen {
        case "programs": path = [.programs]
        case "program": if let id { path = [.programs, .program(id)] }
        case "edit": if let id { path = [.programs, .program(id), .edit(id)] }
        case "builder": building = true
        default: break
        }
        #endif
    }

    @MainActor private static var openedScreen = false

    /// A filled-in draft for the builder screenshot (-demoScreen builder).
    @MainActor
    static func demoDraft(_ store: WorkoutStore) -> PlanDraft? {
        #if DEBUG
        guard UserDefaults.standard.string(forKey: "demoScreen") == "builder" else { return nil }
        var draft = PlanDraft()
        draft.name = "5/3/1 Lite"
        let bench = "cmiz7vjju0000vr0m4b1o6bec", row = "cmiz7vk1i0003vr0mqucd1f52"
        draft.weeks = [[PlanDraft.Workout(name: "Press Day", exercises: [
            .init(definitionId: bench, name: store.exercise(bench)?.name ?? "Bench", group: "A",
                  sets: [EditableSet(reps: "5", weight: "65%"), EditableSet(reps: "5", weight: "75%"), EditableSet(reps: "5+", weight: "85%")]),
            .init(definitionId: row, name: store.exercise(row)?.name ?? "Row", group: "A",
                  sets: [EditableSet(reps: "10", weight: "RPE 8"), EditableSet(reps: "10", weight: "RPE 8")]),
        ])]]
        return draft
        #else
        return nil
        #endif
    }
}
