// App state over RipitCore's AppDatabase. Every change is written straight to SQLite, so a
// workout in progress survives the app being closed; the views just re-read after each write.

import Foundation
import Observation
import RipitCore

@MainActor
@Observable
final class WorkoutStore {
    static var databaseURL: URL {
        URL.applicationSupportDirectory.appendingPathComponent("ripit.sqlite")
    }

    private let db: AppDatabase?
    let catalog: ExerciseCatalog
    private(set) var history: [HistoryEntry] = []
    private(set) var current: WorkoutDetail?
    private(set) var openError: String?
    /// The last error from a write, shown as an alert.
    var lastError: String?
    var showingWorkout = false

    init(databaseURL: URL) {
        do {
            let opened = try AppDatabase.open(path: databaseURL.path)
            (db, catalog) = (opened, try ExerciseCatalog.bundled())
        } catch {
            (db, catalog) = (nil, ExerciseCatalog(exercises: []))
            openError = "\(error)"
        }
        reload()
    }

    func reload() {
        guard let db else { return }
        attempt {
            history = try db.history()
            current = try db.inProgressWorkout()
        }
    }

    func detail(_ id: String) -> WorkoutDetail? {
        guard let db else { return nil }
        return try? db.workout(id)
    }

    func exercise(_ id: String) -> CatalogExercise? {
        catalog.exercises.first { $0.id == id }
    }

    // MARK: - Writes

    func startWorkout() {
        if current == nil { write { _ = try $0.startWorkout(at: Date()) } }
        showingWorkout = current != nil
    }

    func resumeWorkout() {
        showingWorkout = current != nil
    }

    func addExercise(_ definitionId: String) {
        guard let w = current?.id else { return }
        write { _ = try $0.addExercise(definitionId: definitionId, to: w) }
    }

    func logSet(exerciseId: String, reps: Int, weight: Double, unit: String) {
        write { _ = try $0.logSet(exerciseId: exerciseId, reps: reps, weight: weight, unit: unit) }
    }

    func deleteSet(_ setId: String) {
        write { try $0.deleteSet(setId) }
    }

    func groupAsSuperset(_ exerciseIds: [String]) {
        write { try $0.groupAsSuperset(exerciseIds) }
    }

    func finishWorkout() {
        guard let w = current?.id else { return }
        write { try $0.finishWorkout(w, at: Date()) }
        showingWorkout = false
    }

    func discardWorkout() {
        guard let w = current?.id else { return }
        write { try $0.discardWorkout(w) }
        showingWorkout = false
    }

    private func write(_ change: (AppDatabase) throws -> Void) {
        guard let db else { return }
        attempt { try change(db) }
        reload()
    }

    private func attempt(_ body: () throws -> Void) {
        do { try body() } catch { lastError = "\(error)" }
    }
}
