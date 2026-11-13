// The one-exercise logger's edits (slice 9b, features/ios-app/one-exercise-logger.feature): the plan list's
// reorder, swap, delete and superset changes, and Exit. All change today's workout only.

import Foundation
import RipitCore

extension WorkoutStore {
    func moveExercise(_ exerciseId: String, to index: Int) {
        guard let w = current?.id else { return }
        write { try $0.moveExercise(exerciseId, to: index, inWorkout: w) }
    }

    /// Returns the id of the exercise now in that place.
    func swapExercise(_ exerciseId: String, to definitionId: String) -> String? {
        guard let w = current?.id else { return nil }
        var id: String?
        write { id = try $0.swapExercise(exerciseId, to: definitionId, inWorkout: w) }
        return id
    }

    func deleteExercise(_ exerciseId: String) {
        guard let w = current?.id else { return }
        write { try $0.deleteExercise(exerciseId, fromWorkout: w) }
    }

    func removeFromSuperset(_ exerciseId: String) {
        write { try $0.removeFromSuperset(exerciseId) }
    }

    /// Exit: an empty workout is deleted and the logger closes (true); otherwise nothing changes (false)
    /// and the person picks Discard or keep.
    func exitWorkout() -> Bool {
        guard let w = current?.id else { return true }
        var left = false
        write { left = try $0.exitWorkout(w) }
        if left { showingWorkout = false }
        return left
    }

    /// Keep as a draft: the logger closes and Quick Actions offers Resume.
    func keepAsDraft() {
        showingWorkout = false
    }

    /// The plan for an exercise of the open workout: a program exercise's, else the workout's own (slice 6).
    func plannedSets(_ exercise: ExerciseDetail) -> [ProgramSetDetail] {
        session?.exercises.first { $0.id == exercise.id }?.planned ?? exercise.planned
    }
}
