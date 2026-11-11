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
//   -demoRemove YES     open the logger's plan list (slice 9b: remove is in its row menus)
//   -demoFocusWeight YES  open the weight keypad on the first exercise (slice 9b)
//   -demoDetail YES     open the newest finished workout (Training › History)
//   -demoDiscard YES    show Exit's Discard / Keep as draft choice over the workout
// Slice 3 (work item 161):
//   -demoProgram YES    add an active 2-week sample program (synthetic), plus a second inactive one
//   -demoDone <n>       finish the first n workouts of the sample program
//   -demoSession YES    start Up Next and log one set, and open it
//   -demoProgressTab YES  open on the Progress tab
//   -demoLiftPage YES   with it, open the first lift of the week
//   -demoScreen <s>     open programs | program | edit (Library › Programs) | builder (Training)
//   -demoEditExercise YES  on the edit screen, open the first exercise's sheet
//   -demoHistoryTab YES start on the history list (Training › Recent › See all; slice 9a)
// Work item 170:
//   -demoStayHome YES   with -demoSession too, stay on Training (shows the resume card)
//   -demoArchiveActive YES  archive the sample program after starting its session
//   -demoStartOther YES ask to start another program workout while the session is open
//   -demoEditFlow YES   with -demoScreen edit (work item 171): open the first exercise, remove its
//                       first set and save; reopen it (shows the saved plan), change a rep and save
//   -demoCancelBuilder YES  with -demoScreen builder, tap Cancel (shows the discard prompt)
// Slice 5 (work item 175):
//   -demoEffort YES     with -demoHistory: a finished bench workout 12 hours ago with a warm-up and
//                       3 sets @ RPE 8; with -demoWorkout: the open workout's bench sets get a warm-up and RPE
//   -demoHelp <tab>     open the workout in progress on the logger's info | notes | history tab (slice 9b);
//                       "none" just opens the workout (e.g. after a relaunch, no reseeding)
//   -demoUseLastTime YES  tap the first exercise's "Last time" line
// Slice 6 (work item 180):
//   -demoSummary YES    open the summary of the newest finished workout (as after Finish)
//   -demoSave YES       with it, open Save
//   -demoSaveNow YES    with both, tap Save with the suggested name (shows "Saved to your workouts")
//   -demoFinishNow YES  finish the open workout without the confirmation (the summary follows)
//   -demoSaved YES      with -demoHistory: save the newest workout, pin it, and save and archive the oldest
//   -demoLibraryTab YES start on Library › Workouts
//   -demoLibrary <s>    there, open older | archived | both | detail (the first row's plan) |
//                       delete (the first Older row's prompt, else the first row's; 182);
//                       rename (the first row's Rename, cleared); renameError (a blank rename sent anyway);
//                       pinned (scrolls to the Pinned group);
//                       "bottom" opens both folds and scrolls to the end
//   -demoStartPinned YES  tap Start on Training's first pinned workout
//   -demoRepeat YES     tap Repeat on Training's first recent workout
// Slice 7 (work item 185):
//   -demoSettingsTab YES  start on Settings; -demoThemePicker YES also opens the theme list
//   -demoTab <s>        open a folder tab: recent | program (Training), lifts (Progress)
//   Settings themselves come from UserDefaults, so launch arguments set them for a run (not saved):
//   -settings.v1.stored YES -settings.v1.themeName dracula -settings.v1.themeMode light
//   -settings.v1.einkDisplay YES -settings.v1.intensityEnabled YES -settings.v1.defaultIntensityRating rpe
// Slice 9a (work item 199):
//   -demoQuickActions YES  open the Quick Actions card at launch
//   -demoLibraryPrograms YES  with -demoLibraryTab, open Library › Programs

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

    /// A String launch argument, always nil in Release.
    static func string(_ key: String) -> String? {
        #if DEBUG
        return UserDefaults.standard.string(forKey: key)
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
        if d.string(forKey: "demoHelp") != nil { store.resumeWorkout() }
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
        let effort = d.bool(forKey: "demoEffort")
        if effort && d.bool(forKey: "demoHistory") {
            let start = Date().addingTimeInterval(-day / 2)
            if let w = try? db.startWorkout(at: start), let e = try? db.addExercise(definitionId: bench, to: w) {
                _ = try? db.logSet(exerciseId: e, reps: 8, weight: 95, isWarmup: true, at: start)
                for i in 1...3 { _ = try? db.logSet(exerciseId: e, reps: 5, weight: 160, rpe: 8, at: start.addingTimeInterval(Double(i) * 180)) }
                try? db.finishWorkout(w, at: start.addingTimeInterval(3000))
            }
        }
        if d.bool(forKey: "demoWorkout"), let w = try? db.startWorkout(at: Date().addingTimeInterval(-1200)) {
            let ids = [bench, row, squat].compactMap { try? db.addExercise(definitionId: $0, to: w) }
            if ids.count == 3 {
                _ = try? db.logSet(exerciseId: ids[0], reps: 8, weight: 135, isWarmup: effort, at: Date().addingTimeInterval(-200))
                _ = try? db.logSet(exerciseId: ids[0], reps: 5, weight: 155, rpe: effort ? 8 : nil, at: Date().addingTimeInterval(-95))
                _ = try? db.logSet(exerciseId: ids[1], reps: 10, weight: 62.5, unit: "kg")
                try? db.groupAsSuperset([ids[0], ids[1]])
            }
        }
        if d.bool(forKey: "demoEmptyWorkout"), let w = try? db.startWorkout(at: Date().addingTimeInterval(-300)) {
            _ = try? db.addExercise(definitionId: bench, to: w)
        }
        if d.bool(forKey: "demoSaved") && d.bool(forKey: "demoHistory"), let done = try? db.history(), done.count >= 2 {
            let now = Date()
            if let newest = try? db.saveWorkout(fromCompletion: done[0].id, name: "Bench day", notes: "Pause the first rep", at: now) {
                try? db.pinSavedWorkout(newest, at: now)
            }
            if let oldest = try? db.saveWorkout(fromCompletion: done[done.count - 1].id, name: "Light bench", notes: nil, at: now) {
                try? db.archiveSavedWorkout(oldest, at: now)
            }
        }
        store.reload()
        if d.bool(forKey: "demoEmptyWorkout") { store.resumeWorkout() }
        if d.bool(forKey: "demoWorkout") && !d.bool(forKey: "demoStayHome") { store.resumeWorkout() }
        #endif
    }

    /// Slice 6's launch actions, run once the store has loaded (an import finishes after launch).
    @MainActor
    static func applySavedDemo(store: WorkoutStore) {
        #if DEBUG
        guard !appliedSaved else { return }
        appliedSaved = true
        let d = UserDefaults.standard
        if d.bool(forKey: "demoSummary"), let newest = store.history.first { store.summary = FinishedWorkout(id: newest.id) }
        if d.bool(forKey: "demoStartPinned"), let w = store.pinnedWorkouts.first { store.startSavedWorkout(w.id, name: w.name) }
        if d.bool(forKey: "demoRepeat"), let w = store.recentWorkouts.first(where: \.canRepeat) { store.repeatWorkout(w.id, name: w.name) }
        #endif
    }

    @MainActor private static var appliedSaved = false

    /// -demoLibrary: opens a fold, the first row's plan, or the delete prompt, once.
    @MainActor
    static func openLibrary(store: WorkoutStore, older: inout Bool, archived: inout Bool,
                            detail: inout SavedWorkoutSummary?, deleting: inout String?) {
        #if DEBUG
        guard !openedLibrary, let screen = UserDefaults.standard.string(forKey: "demoLibrary") else { return }
        openedLibrary = true
        let g = store.savedGroups
        let first = (g.new + g.pinned + g.recent + g.older).first
        switch screen {
        case "older": older = true
        case "archived": archived = true
        case "both", "bottom": (older, archived) = (true, true)
        case "detail": detail = first
        case "delete":
            older = true
            deleting = (g.older.first ?? first)?.id
        default: break
        }
        #endif
    }

    @MainActor private static var openedLibrary = false

    /// -demoLibrary rename: the row whose Rename alert opens, cleared. renameError instead sends a
    /// blank rename past the alert, to show the error message (work item 182).
    @MainActor
    static func libraryRename(store: WorkoutStore) -> SavedWorkoutSummary? {
        #if DEBUG
        let screen = UserDefaults.standard.string(forKey: "demoLibrary")
        guard !openedRename, screen == "rename" || screen == "renameError", let first = store.savedGroups.all.first else { return nil }
        openedRename = true
        if screen == "renameError" {
            store.renameSavedWorkout(first.id, to: "  ")
            return nil
        }
        return first
        #else
        return nil
        #endif
    }

    @MainActor private static var openedRename = false

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

    /// The tab and screens to start on.
    @MainActor
    static func shell() -> Shell {
        let shell = Shell(tab: flag("demoProgressTab") ? .progress : flag("demoLibraryTab") ? .library
            : flag("demoSettingsTab") ? .settings : .training)
        if flag("demoThemePicker") { shell.settingsPath = [.theme] }
        if flag("demoHistoryTab") { shell.trainingPath = [.history] }
        if flag("demoLibraryPrograms") { shell.librarySection = .programs }
        if flag("demoQuickActions") { shell.showingQuickActions = true }
        return shell
    }

    /// Opens the screen named by -demoScreen (and -demoDetail) once, from the Training home.
    @MainActor
    static func openDemoScreen(store: WorkoutStore, shell: Shell, building: inout Bool) {
        #if DEBUG
        guard !openedScreen else { return }
        openedScreen = true
        if flag("demoDetail"), let first = store.history.first { shell.trainingPath = [.history, .finished(first.id)] }
        let id = store.activeProgram?.id ?? store.programs.first?.id
        switch UserDefaults.standard.string(forKey: "demoScreen") {
        case "programs": shell.showPrograms()
        case "program": if let id { shell.showPrograms([.program(id)]) }
        case "edit": if let id { shell.showPrograms([.program(id), .edit(id)]) }
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
