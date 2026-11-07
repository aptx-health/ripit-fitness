// Program state and writes (slice 3, work item 161). Every write goes straight to SQLite and then
// reloads, like the ad-hoc calls in WorkoutStore.swift.

import Foundation
import RipitCore

extension WorkoutStore {
    func reloadPrograms() {
        guard let db else { return }
        attempt {
            programs = try db.programs()
            upNext = try db.upNext()
            currentWeek = try db.currentWeek()
            if let active = programs.first(where: \.isActive) {
                activeProgram = try db.program(active.id)
                activeProgress = try db.programProgress(active.id)
                activeDone = try db.doneWorkoutIds(active.id)
            } else {
                (activeProgram, activeProgress, activeDone) = (nil, nil, [])
            }
            // An ad-hoc workout has no program session.
            session = current.flatMap { c in try? db.programSession(c.id) }
        }
    }

    func program(_ id: String) -> ProgramDetail? { try? db?.program(id) }
    func progress(_ id: String) -> ProgramProgress? { try? db?.programProgress(id) }
    func doneWorkouts(_ id: String) -> Set<String> { (try? db?.doneWorkoutIds(id)) ?? [] }

    /// Form values for the next set of a program exercise in the open session.
    func prefill(exerciseId: String, setNumber: Int) -> Prefill? {
        try? db?.prefill(exerciseId: exerciseId, setNumber: setNumber)
    }

    // MARK: - Writes

    /// Starts (or resumes) a program workout and opens it. An unfinished workout of another kind is
    /// opened instead, so there is only ever one in progress.
    func startProgramWorkout(_ workoutId: String) {
        if current == nil || session?.workoutId == workoutId {
            write { _ = try $0.startProgramWorkout(workoutId, at: Date()) }
        }
        showingWorkout = current != nil
    }

    @discardableResult
    func createProgram(_ plan: ProgramPlan, activate: Bool) -> String? {
        var id: String?
        write { db in
            id = try db.createProgram(plan)
            if activate, let id { try db.activateProgram(id) }
        }
        return id
    }

    func activateProgram(_ id: String) { write { try $0.activateProgram(id) } }
    func archiveProgram(_ id: String) { write { try $0.archiveProgram(id) } }
    func restartProgram(_ id: String) { write { try $0.restartProgram(id) } }
    func renameProgram(_ id: String, to name: String) { write { try $0.renameProgram(id, to: name) } }
    func addProgramWeek(_ programId: String) { write { try $0.addProgramWeek(programId) } }
    func addProgramWorkout(weekId: String, name: String) { write { try $0.addProgramWorkout(weekId: weekId, name: name) } }
    func renameProgramWorkout(_ id: String, to name: String) { write { try $0.renameProgramWorkout(id, to: name) } }
    func renameProgramExercise(_ id: String, to name: String) { write { try $0.renameProgramExercise(id, to: name) } }
    func setPrescribedSets(_ id: String, _ sets: [PlannedSet]) { write { try $0.setPrescribedSets(id, sets) } }
    func setProgramExerciseGroup(_ id: String, _ group: String?) { write { try $0.setProgramExerciseGroup(id, group) } }

    func addProgramExercise(workoutId: String, definitionId: String) {
        write { try $0.addProgramExercise(workoutId: workoutId, definitionId: definitionId, sets: PlanDraft.defaultSets) }
    }

    func removeProgramExercise(_ id: String) {
        write { db in
            if try !db.removeProgramExercise(id) {
                lastError = "Sets were logged against this exercise, so it stays. Rename it or change its sets instead."
            }
        }
    }

    func updateSet(_ setId: String, reps: Int, weight: Double, unit: String) {
        write { try $0.updateSet(setId, reps: reps, weight: weight, unit: unit) }
    }
}
