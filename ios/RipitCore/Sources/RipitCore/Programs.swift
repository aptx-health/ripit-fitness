// Public API surface for slice 3, programs (work item 157). Every body is a stub that throws
// `RipitCoreError.notImplemented`; the slice 3 implementer replaces them. The tests in
// Tests/RipitCoreTests/Program*Tests.swift are the contract: change the bodies, not the shapes.
//
// Rules follow the web app unless features/ios-app/programs.feature says otherwise:
// - Done means a non-archived completion with status 'completed' (or 'skipped').
// - Current week: the first week with an unfinished workout, else the last week (lib/db/current-week.ts).
// - Up Next: the first unfinished workout, by week then day (lib/training/home.ts).
// - Prefill: last set this session, else the last working set of the most recent completed
//   workout with that exercise, else the plan (lib/workout/prefill.ts).
// - Restart archives the current completions (isArchived = 1, lib/db/program-restart.ts) and
//   also raises the cycle number, which the web does not. Archived completions never count as done.
// - Archiving the active program also deactivates it.
// - Like the web, a session logs against the program's own rows: workoutCompletion.workoutId is
//   the program workout and loggedSet.exerciseId the program exercise. So renaming a program
//   exercise renames it in that workout's history; changing prescribed sets never touches logged sets.
//
// A program workout is logged with slice 1's `logSet`, `finishWorkout` and `discardWorkout`,
// using the session's exercise ids, and shows in slice 1's `history()` and `workout(_:)`.

import Foundation

// MARK: - Building a program

/// One prescribed set. Reps and weight are free text, like the web app ("8-12", "65%", "RPE 8").
public struct PlannedSet: Sendable, Equatable {
    public let reps: String
    public let weight: String?
    public let rpe: Int?
    public let rir: Int?
    public let isWarmup: Bool

    public init(reps: String, weight: String? = nil, rpe: Int? = nil, rir: Int? = nil, isWarmup: Bool = false) {
        self.reps = reps
        self.weight = weight
        self.rpe = rpe
        self.rir = rir
        self.isWarmup = isWarmup
    }
}

public struct PlannedExercise: Sendable, Equatable {
    public let definitionId: String
    /// Superset label; exercises in one workout sharing a non-nil value are one superset.
    public let group: String?
    public let sets: [PlannedSet]

    public init(_ definitionId: String, group: String? = nil, sets: [PlannedSet]) {
        self.definitionId = definitionId
        self.group = group
        self.sets = sets
    }
}

public struct PlannedWorkout: Sendable, Equatable {
    public let name: String
    public let exercises: [PlannedExercise]

    public init(_ name: String, _ exercises: [PlannedExercise]) {
        self.name = name
        self.exercises = exercises
    }
}

/// `weeks[i][j]` becomes week `i + 1`, day `j + 1`.
public struct ProgramPlan: Sendable, Equatable {
    public let name: String
    public let weeks: [[PlannedWorkout]]

    public init(name: String, weeks: [[PlannedWorkout]]) {
        self.name = name
        self.weeks = weeks
    }
}

// MARK: - Reading a program

public struct ProgramSetDetail: Sendable, Equatable, Identifiable {
    public let id: String
    public let setNumber: Int
    public let reps: String
    public let weight: String?
    public let rpe: Int?
    public let rir: Int?
    public let isWarmup: Bool

    public init(id: String, setNumber: Int, reps: String, weight: String?, rpe: Int?, rir: Int?, isWarmup: Bool) {
        self.id = id
        self.setNumber = setNumber
        self.reps = reps
        self.weight = weight
        self.rpe = rpe
        self.rir = rir
        self.isWarmup = isWarmup
    }
}

public struct ProgramExercise: Sendable, Equatable, Identifiable {
    public let id: String
    public let definitionId: String
    public let name: String
    public let group: String?
    /// The plan, by set number.
    public let sets: [ProgramSetDetail]

    public init(id: String, definitionId: String, name: String, group: String?, sets: [ProgramSetDetail]) {
        self.id = id
        self.definitionId = definitionId
        self.name = name
        self.group = group
        self.sets = sets
    }
}

public struct ProgramWorkout: Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let dayNumber: Int
    /// In plan order.
    public let exercises: [ProgramExercise]

    public init(id: String, name: String, dayNumber: Int, exercises: [ProgramExercise]) {
        self.id = id
        self.name = name
        self.dayNumber = dayNumber
        self.exercises = exercises
    }
}

public struct ProgramWeek: Sendable, Equatable, Identifiable {
    public let id: String
    public let weekNumber: Int
    /// By day number.
    public let workouts: [ProgramWorkout]

    public init(id: String, weekNumber: Int, workouts: [ProgramWorkout]) {
        self.id = id
        self.weekNumber = weekNumber
        self.workouts = workouts
    }
}

public struct ProgramDetail: Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let isActive: Bool
    public let isArchived: Bool
    /// By week number.
    public let weeks: [ProgramWeek]

    public init(id: String, name: String, isActive: Bool, isArchived: Bool, weeks: [ProgramWeek]) {
        self.id = id
        self.name = name
        self.isActive = isActive
        self.isArchived = isArchived
        self.weeks = weeks
    }
}

public struct ProgramSummary: Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let isActive: Bool

    public init(id: String, name: String, isActive: Bool) {
        self.id = id
        self.name = name
        self.isActive = isActive
    }
}

public struct UpNext: Sendable, Equatable {
    public let programId: String
    public let workoutId: String
    public let workoutName: String
    public let weekNumber: Int
    public let dayNumber: Int
    /// An unfinished session of this workout exists.
    public let hasDraft: Bool

    public init(programId: String, workoutId: String, workoutName: String, weekNumber: Int, dayNumber: Int, hasDraft: Bool) {
        self.programId = programId
        self.workoutId = workoutId
        self.workoutName = workoutName
        self.weekNumber = weekNumber
        self.dayNumber = dayNumber
        self.hasDraft = hasDraft
    }
}

public struct ProgramProgress: Sendable, Equatable {
    /// Every workout done and the program has at least one.
    public let isComplete: Bool
    public let totalWorkouts: Int
    public let doneWorkouts: Int
    /// 1 until the first restart, then 2, and so on.
    public let cycleNumber: Int

    public init(isComplete: Bool, totalWorkouts: Int, doneWorkouts: Int, cycleNumber: Int) {
        self.isComplete = isComplete
        self.totalWorkouts = totalWorkouts
        self.doneWorkouts = doneWorkouts
        self.cycleNumber = cycleNumber
    }
}

// MARK: - Logging a program workout

public struct SessionExercise: Sendable, Equatable, Identifiable {
    /// The program exercise id. Pass it to `logSet(exerciseId:...)` and `prefill(exerciseId:setNumber:)`.
    public let id: String
    public let definitionId: String
    public let name: String
    public let group: String?
    /// The program exercise's prescribed sets.
    public let planned: [ProgramSetDetail]
    public let logged: [SetDetail]

    public init(id: String, definitionId: String, name: String, group: String?, planned: [ProgramSetDetail], logged: [SetDetail]) {
        self.id = id
        self.definitionId = definitionId
        self.name = name
        self.group = group
        self.planned = planned
        self.logged = logged
    }
}

public struct ProgramSession: Sendable, Equatable, Identifiable {
    /// The workoutCompletion id; pass it to `finishWorkout`, `discardWorkout` and `workout(_:)`.
    public let id: String
    public let programId: String
    public let workoutId: String
    public let cycleNumber: Int
    /// In plan order.
    public let exercises: [SessionExercise]

    public init(id: String, programId: String, workoutId: String, cycleNumber: Int, exercises: [SessionExercise]) {
        self.id = id
        self.programId = programId
        self.workoutId = workoutId
        self.cycleNumber = cycleNumber
        self.exercises = exercises
    }
}

/// Form values for the next set, as strings, exactly as the web app's `computePrefillValues`
/// returns them ("225", "102.5", "0"; "" for no value).
public struct Prefill: Sendable, Equatable {
    public let reps: String
    public let weight: String
    /// nil means "keep the unit currently selected".
    public let weightUnit: String?
    public let rpe: String
    public let rir: String

    public init(reps: String, weight: String, weightUnit: String?, rpe: String, rir: String) {
        self.reps = reps
        self.weight = weight
        self.weightUnit = weightUnit
        self.rpe = rpe
        self.rir = rir
    }
}

// MARK: - Database

extension AppDatabase {
    /// Saves a new, inactive program and returns its id.
    public func createProgram(_ plan: ProgramPlan) throws -> String { throw RipitCoreError.notImplemented }

    public func program(_ id: String) throws -> ProgramDetail { throw RipitCoreError.notImplemented }

    /// Programs that are not archived, oldest first.
    public func programs() throws -> [ProgramSummary] { throw RipitCoreError.notImplemented }

    /// Makes this the only active program.
    public func activateProgram(_ id: String) throws { throw RipitCoreError.notImplemented }

    /// Hides the program from `programs()` and deactivates it. Its logged history stays.
    public func archiveProgram(_ id: String) throws { throw RipitCoreError.notImplemented }

    /// The active program's current week number, or nil with no active program.
    public func currentWeek() throws -> Int? { throw RipitCoreError.notImplemented }

    /// The active program's next workout, or nil when there is none (no active program, or complete).
    public func upNext() throws -> UpNext? { throw RipitCoreError.notImplemented }

    public func programProgress(_ id: String) throws -> ProgramProgress { throw RipitCoreError.notImplemented }

    /// Starts a session of a program workout and returns the session (completion) id.
    public func startProgramWorkout(_ workoutId: String, at date: Date) throws -> String { throw RipitCoreError.notImplemented }

    public func programSession(_ id: String) throws -> ProgramSession { throw RipitCoreError.notImplemented }

    /// Prefill for the given set of a program exercise in its unfinished session.
    public func prefill(exerciseId: String, setNumber: Int) throws -> Prefill { throw RipitCoreError.notImplemented }

    /// Changes a logged set in place.
    public func updateSet(_ setId: String, reps: Int, weight: Double, unit: String) throws { throw RipitCoreError.notImplemented }

    /// Starts the program over: week 1 is current again and the cycle number goes up.
    public func restartProgram(_ id: String) throws { throw RipitCoreError.notImplemented }

    /// Renames a program exercise, in the plan and in that workout's history.
    public func renameProgramExercise(_ exerciseId: String, to name: String) throws { throw RipitCoreError.notImplemented }

    /// Replaces a program exercise's prescribed sets. Logged sets are not touched.
    public func setPrescribedSets(_ exerciseId: String, _ sets: [PlannedSet]) throws { throw RipitCoreError.notImplemented }
}
