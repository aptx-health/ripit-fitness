// The picker's search, multi-add and custom exercises (slice 8, picker-custom.feature).

import Foundation
import RipitCore

extension WorkoutStore {
    /// The picker's results, read off the main thread so typing stays smooth.
    func searchExercises(_ search: ExerciseSearch) async -> [PickerExercise] {
        guard let db else { return [] }
        return await Task.detached(priority: .userInitiated) {
            (try? db.searchExercises(search)) ?? []
        }.value
    }

    /// Adds the picked exercises to the workout in progress, in the order picked.
    func addExercises(_ definitionIds: [String]) {
        guard let w = current?.id, !definitionIds.isEmpty else { return }
        write { _ = try $0.addExercises(definitionIds: definitionIds, to: w) }
    }

    /// An exercise's name, built-in or custom.
    func exerciseName(_ id: String) -> String? {
        exercise(id)?.name ?? (try? db?.customExercise(id))?.name
    }

    func customExercise(_ id: String) -> CustomExerciseDraft? {
        try? db?.customExercise(id)
    }

    /// The id of another exercise with this name once normalized, else nil.
    func duplicateExercise(named name: String, excluding: String?) -> String? {
        try? db?.duplicateExercise(named: name, excluding: excluding)
    }

    /// Saves a new custom exercise; nil (with lastError set) when it was refused.
    func createCustomExercise(_ draft: CustomExerciseDraft) -> String? {
        var id: String?
        write { id = try $0.createCustomExercise(draft) }
        return id
    }

    /// Saves an edit; false (with lastError set) when it was refused.
    func updateCustomExercise(_ id: String, _ draft: CustomExerciseDraft) -> Bool {
        var saved = false
        write { try $0.updateCustomExercise(id, draft); saved = true }
        return saved
    }
}
