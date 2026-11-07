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
}
