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

    /// Internal so WorkoutStore+Programs.swift can reach it.
    let db: AppDatabase?
    let catalog: ExerciseCatalog
    private(set) var history: [HistoryEntry] = []
    private(set) var current: WorkoutDetail?
    private(set) var openError: String?
    /// The last error from a write, shown as an alert.
    var lastError: String?
    var showingWorkout = false
    // Programs (slice 3); loaded by reloadPrograms() in WorkoutStore+Programs.swift.
    var programs: [ProgramSummary] = []
    var upNext: UpNext?
    var activeProgram: ProgramDetail?
    var activeProgress: ProgramProgress?
    var activeDone: Set<String> = []
    var currentWeek: Int?
    /// The in-progress workout's plan when it is a program session.
    var session: ProgramSession?
    /// A program workout the person asked to start while another one is in progress (work item 170).
    var pendingStart: PendingStart?
    /// Goes up after every write, so screens that read the database directly re-read (work item 171).
    private(set) var revision = 0
    var importing = false
    @ObservationIgnored private var lastLog: (exerciseId: String, at: Date)?
    /// The outcome of the last import, shown as an alert.
    var importResult: ImportResult?
    // Saved workouts (slice 6); loaded by reloadSaved() in WorkoutStore+Saved.swift.
    var savedGroups = SavedWorkoutGroups(new: [], pinned: [], recent: [], older: [], archived: [])
    var pinnedWorkouts: [PinnedWorkout] = []
    var recentWorkouts: [RecentWorkout] = []
    /// The workout just finished; its summary opens once the workout screen has closed.
    var justFinished: String?
    /// The finished workout whose summary is showing.
    var summary: FinishedWorkout?

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
        reloadPrograms()
        reloadSaved()
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

    func logSet(exerciseId: String, reps: Int, weight: Double, unit: String,
                rpe: Int? = nil, rir: Int? = nil, isWarmup: Bool = false) {
        // Fast repeated taps on Log make one set, not several.
        let now = Date()
        if let last = lastLog, last.exerciseId == exerciseId, now.timeIntervalSince(last.at) < 0.6 { return }
        lastLog = (exerciseId, now)
        write { _ = try $0.logSet(exerciseId: exerciseId, reps: reps, weight: weight, unit: unit,
                                  rpe: rpe, rir: rir, isWarmup: isWarmup, at: now) }
    }

    func deleteSet(_ setId: String) {
        write { try $0.deleteSet(setId) }
    }

    func removeExercise(_ exerciseId: String) {
        write { try $0.removeExercise(exerciseId) }
    }

    func groupAsSuperset(_ exerciseIds: [String]) {
        write { try $0.groupAsSuperset(exerciseIds) }
    }

    func finishWorkout() {
        guard let w = current?.id else { return }
        write { try $0.finishWorkout(w, at: Date()) }
        if current?.id != w { justFinished = w }
        showingWorkout = false
    }

    func discardWorkout() {
        guard let w = current?.id else { return }
        write { try $0.discardWorkout(w) }
        showingWorkout = false
    }

    // MARK: - Import

    /// Imports a ripit-export file picked in the Files app. The work runs off the main thread.
    func importFile(at url: URL) async {
        guard let db else { return }
        importing = true
        defer { importing = false }
        let result: ImportResult = await Task.detached {
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            do {
                let summary = try db.importReport(data: Data(contentsOf: url))
                return .imported(summary)
            } catch let refused as ImportError {
                return .refused(refused.reason)
            } catch {
                return .refused("The file couldn't be read. Try downloading it again.")
            }
        }.value
        importResult = result
        revision += 1
        reload()
    }

    func write(_ change: (AppDatabase) throws -> Void) {
        guard let db else { return }
        attempt { try change(db) }
        revision += 1
        reload()
    }

    func attempt(_ body: () throws -> Void) {
        do { try body() } catch { lastError = "\(error)" }
    }
}

/// A finished workout whose summary is showing (slice 6).
struct FinishedWorkout: Identifiable, Equatable {
    let id: String
}
