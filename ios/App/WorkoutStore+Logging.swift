// Logging help (slice 5, features/ios-app/logging-help.feature): rest timer, last time, effort,
// warm-ups, and an exercise's Info / Notes / History while logging. Reads touch `revision` so a
// view re-reads after every write.

import Foundation
import RipitCore

extension WorkoutStore {
    func restTimer(exerciseId: String) -> RestTimer? {
        _ = revision
        guard let w = current?.id else { return nil }
        return try? db?.restTimer(exerciseId: exerciseId, workoutId: w)
    }

    func lastTime(definitionId: String) -> LastTime? {
        _ = revision
        return try? db?.lastTime(definitionId: definitionId, includeIntensity: true)
    }

    func exerciseHistory(definitionId: String) -> [HistorySession] {
        _ = revision
        return (try? db?.exerciseHistory(definitionId: definitionId)) ?? []
    }

    func exerciseInfo(definitionId: String) -> ExerciseInfo? {
        try? db?.exerciseInfo(definitionId: definitionId)
    }

    func exerciseNotes(exerciseId: String) -> String? {
        _ = revision
        return try? db?.exerciseNotes(exerciseId: exerciseId)
    }

    func setWarmup(_ setId: String, _ isWarmup: Bool) {
        write { try $0.setWarmup(setId, isWarmup) }
    }
}
