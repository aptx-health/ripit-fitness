// Finish summary and saved workouts (slice 6, work item 180). Every write goes straight to SQLite
// and then reloads, like the calls in WorkoutStore.swift.

import Foundation
import RipitCore

extension WorkoutStore {
    func reloadSaved() {
        guard let db else { return }
        attempt {
            savedGroups = try db.savedWorkoutGroups(now: Date())
            pinnedWorkouts = try db.trainingPinned()
            recentWorkouts = try db.trainingRecent()
        }
    }

    func rollup(_ completionId: String) -> WorkoutRollup? {
        try? db?.workoutRollup(completionId, now: Date())
    }

    func savedPlan(_ id: String) -> [SavedExercise] {
        (try? db?.savedWorkoutPlan(id)) ?? []
    }

    // MARK: - Writes

    /// Saves a finished ad-hoc workout; returns the saved workout's id, or nil (the error is in lastError).
    func saveWorkout(fromCompletion completionId: String, name: String, notes: String) -> String? {
        var id: String?
        write { id = try $0.saveWorkout(fromCompletion: completionId, name: name, notes: notes, at: Date()) }
        return id
    }

    func pinSavedWorkout(_ id: String, _ pinned: Bool) {
        write { pinned ? try $0.pinSavedWorkout(id, at: Date()) : try $0.unpinSavedWorkout(id) }
    }

    func renameSavedWorkout(_ id: String, to name: String) { write { try $0.renameSavedWorkout(id, to: name) } }
    func archiveSavedWorkout(_ id: String) { write { try $0.archiveSavedWorkout(id, at: Date()) } }
    func dismissSavedWorkout(_ id: String) { write { try $0.dismissSavedWorkout(id, at: Date()) } }
    func restoreSavedWorkout(_ id: String) { write { try $0.restoreSavedWorkout(id, at: Date()) } }
    func deleteSavedWorkout(_ id: String) { write { try $0.deleteSavedWorkout(id) } }

    /// Starts a saved workout and opens it; with a workout in progress, RootView asks to resume or discard it first.
    func startSavedWorkout(_ id: String, name: String) {
        guard current == nil else {
            pendingStart = PendingStart(kind: .saved(id), name: name)
            return
        }
        write { _ = try $0.startSavedWorkout(id, at: Date()) }
        showingWorkout = current != nil
    }

    /// Starts a new ad-hoc workout with a finished workout's exercises and opens it, asking first like startSavedWorkout.
    func repeatWorkout(_ completionId: String, name: String) {
        guard current == nil else {
            pendingStart = PendingStart(kind: .repeatWorkout(completionId), name: name)
            return
        }
        write { _ = try $0.repeatWorkout(completionId, at: Date()) }
        showingWorkout = current != nil
    }
}
