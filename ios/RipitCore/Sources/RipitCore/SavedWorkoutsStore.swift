// The database side of slice 6 (work item 180): the finish summary, saved workouts, start and
// repeat, and Training's Pinned and Recent. The rules are listed in SavedWorkouts.swift's header.

import Foundation
import GRDB

extension AppDatabase {
    /// The summary of a finished, non-archived workout; nil for any other id.
    public func workoutRollup(_ completionId: String, now: Date) throws -> WorkoutRollup? {
        try dbQueue.read { try Self.rollup($0, completionId, now: now) }
    }

    /// Saves a finished ad-hoc workout to repeat and returns the saved workout's id.
    public func saveWorkout(fromCompletion completionId: String, name: String, notes: String?, at date: Date) throws -> String {
        let name = try Self.validName(name)
        let notes = (notes ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard notes.utf16.count <= 2000 else { throw SavedWorkoutError.notesTooLong }
        return try dbQueue.write { db in
            if let existing = try String.fetchOne(db, sql: "SELECT id FROM savedWorkout WHERE sourceCompletionId = ?",
                                                  arguments: [completionId]) {
                return existing
            }
            guard let c = try Row.fetchOne(db, sql: "SELECT status, isAdHoc, completedAt FROM workoutCompletion WHERE id = ?",
                                           arguments: [completionId]) else {
                throw RipitCoreError.notFound("workout \(completionId)")
            }
            guard c["status"] as String == "completed" else { throw SavedWorkoutError.notFinished }
            guard c["isAdHoc"] as Bool else { throw SavedWorkoutError.notAdHoc }

            let sets = try Row.fetchAll(db, sql: """
                SELECT s.exerciseId, s.setNumber, s.reps, s.rir, s.rpe, s.isWarmup FROM loggedSet s
                JOIN exercise e ON e.id = s.exerciseId
                WHERE e.workoutCompletionId = ? ORDER BY s.setNumber
                """, arguments: [completionId])
            let setsByExercise = Dictionary(grouping: sets) { $0["exerciseId"] as String }
            let plan = try Row.fetchAll(db, sql: """
                SELECT id, name, exerciseDefinitionId, "order", notes, exerciseGroup FROM exercise
                WHERE workoutCompletionId = ? ORDER BY "order"
                """, arguments: [completionId]).map { e in
                SavedExercise(
                    name: e["name"], exerciseDefinitionId: e["exerciseDefinitionId"], order: e["order"],
                    notes: e["notes"], exerciseGroup: e["exerciseGroup"],
                    sets: (setsByExercise[e["id"] as String] ?? []).map {
                        SavedSet(setNumber: $0["setNumber"], reps: String($0["reps"] as Int), rir: $0["rir"],
                                 rpe: $0["rpe"], isWarmup: $0["isWarmup"])
                    })
            }
            let id = Self.newId()
            try db.execute(sql: """
                INSERT INTO savedWorkout (id, name, notes, sourceCompletionId, workoutData, exerciseCount, createdAt,
                                          updatedAt, lastUsedAt, origin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'session')
                """, arguments: [id, name, notes.isEmpty ? nil : notes, completionId, try Self.workoutDataText(plan),
                                 plan.count, date, date, c["completedAt"] as Date?])
            return id
        }
    }

    /// nil once deleted.
    public func savedWorkout(_ id: String) throws -> SavedWorkoutSummary? {
        try dbQueue.read { db in
            try Row.fetchOne(db, sql: "SELECT * FROM savedWorkout WHERE id = ?", arguments: [id]).map(Self.summary)
        }
    }

    /// The saved workout's exercises and planned sets (its workoutData).
    public func savedWorkoutPlan(_ id: String) throws -> [SavedExercise] {
        try dbQueue.read { try Self.plan($0, id) }
    }

    public func savedWorkoutGroups(now: Date) throws -> SavedWorkoutGroups {
        // The web's list order, which its stable sorts keep for ties.
        let items = try dbQueue.read { db in
            try Row.fetchAll(db, sql: """
                SELECT * FROM savedWorkout ORDER BY lastUsedAt IS NULL, lastUsedAt DESC, createdAt DESC
                """).map(Self.summary)
        }
        let cutoff = now.addingTimeInterval(-30 * 86_400)
        func activity(_ s: SavedWorkoutSummary) -> Date { s.lastUsedAt ?? s.createdAt }
        func isNew(_ s: SavedWorkoutSummary) -> Bool {
            (s.origin == "agent" || s.origin == "coach") && s.lastUsedAt == nil && s.dismissedAt == nil
        }
        var new: [SavedWorkoutSummary] = [], pinned: [SavedWorkoutSummary] = [], recent: [SavedWorkoutSummary] = []
        var older: [SavedWorkoutSummary] = [], archived: [SavedWorkoutSummary] = []
        for s in items {
            if s.archivedAt != nil { archived.append(s) }
            else if s.pinnedAt != nil { pinned.append(s) }
            else if isNew(s) { new.append(s) }
            else if activity(s) >= cutoff { recent.append(s) }
            else { older.append(s) }
        }
        func newestFirst(_ list: [SavedWorkoutSummary], by key: (SavedWorkoutSummary) -> Date) -> [SavedWorkoutSummary] {
            list.enumerated().sorted { a, b in
                let ka = key(a.element), kb = key(b.element)
                return ka != kb ? ka > kb : a.offset < b.offset
            }.map(\.element)
        }
        return SavedWorkoutGroups(
            new: newestFirst(new, by: activity), pinned: newestFirst(pinned) { $0.pinnedAt! },
            recent: newestFirst(recent, by: activity), older: newestFirst(older, by: activity),
            archived: newestFirst(archived) { $0.archivedAt! })
    }

    public func pinSavedWorkout(_ id: String, at date: Date) throws {
        try updateSaved(id, "pinnedAt = COALESCE(pinnedAt, ?)", [date])
    }

    public func unpinSavedWorkout(_ id: String) throws {
        try updateSaved(id, "pinnedAt = NULL", [])
    }

    /// Trimmed; refused like saving (`nameRequired`, `nameTooLong`).
    public func renameSavedWorkout(_ id: String, to name: String) throws {
        try updateSaved(id, "name = ?, updatedAt = ?", [try Self.validName(name), Date()])
    }

    public func archiveSavedWorkout(_ id: String, at date: Date) throws {
        try updateSaved(id, "archivedAt = ?, pinnedAt = NULL", [date])
    }

    /// Dismiss, from New: archive and mark dismissed.
    public func dismissSavedWorkout(_ id: String, at date: Date) throws {
        try updateSaved(id, "archivedAt = ?, pinnedAt = NULL, dismissedAt = ?", [date, date])
    }

    public func restoreSavedWorkout(_ id: String, at date: Date) throws {
        try updateSaved(id, "archivedAt = NULL, dismissedAt = COALESCE(dismissedAt, ?)", [date])
    }

    /// Past workouts started from it are kept.
    public func deleteSavedWorkout(_ id: String) throws {
        try dbQueue.write { db in
            try db.execute(sql: "DELETE FROM savedWorkout WHERE id = ?", arguments: [id])
            if db.changesCount == 0 { throw RipitCoreError.notFound("saved workout \(id)") }
        }
    }

    /// Starts an ad-hoc workout from a saved workout and returns the new workout's id.
    public func startSavedWorkout(_ id: String, at date: Date) throws -> String {
        try dbQueue.write { db in
            guard let name = try String.fetchOne(db, sql: "SELECT name FROM savedWorkout WHERE id = ?", arguments: [id]) else {
                throw RipitCoreError.notFound("saved workout \(id)")
            }
            try Self.refuseIfOpen(db)
            let workout = try Self.insertDraft(db, name: name, plan: try Self.plan(db, id), savedWorkoutId: id, at: date)
            // Starting an archived workout restores it, as Restore does.
            try db.execute(sql: """
                UPDATE savedWorkout SET lastUsedAt = ?,
                    dismissedAt = CASE WHEN archivedAt IS NULL THEN dismissedAt ELSE COALESCE(dismissedAt, ?) END,
                    archivedAt = NULL
                WHERE id = ?
                """, arguments: [date, date, id])
            return workout
        }
    }

    /// Starts an ad-hoc workout with a finished workout's exercises and returns the new workout's id.
    public func repeatWorkout(_ completionId: String, at date: Date) throws -> String {
        try dbQueue.write { db in
            guard let name = try String.fetchOne(db, sql: """
                SELECT COALESCE(w.name, c.name, 'Open Workout') FROM workoutCompletion c
                LEFT JOIN workout w ON w.id = c.workoutId
                WHERE c.id = ? AND c.status = 'completed' AND c.isArchived = 0
                """, arguments: [completionId]) else {
                throw RipitCoreError.notFound("finished workout \(completionId)")
            }
            let sets = try Row.fetchAll(db, sql: """
                SELECT s.setNumber, s.reps, s.rir, s.rpe, s.isWarmup, s.createdAt, e.id AS exerciseId, e.name,
                       e.exerciseDefinitionId, e."order", e.notes, e.exerciseGroup
                FROM loggedSet s JOIN exercise e ON e.id = s.exerciseId
                WHERE s.completionId = ?
                """, arguments: [completionId])
            guard !sets.isEmpty else { throw SavedWorkoutError.nothingToRepeat }
            try Self.refuseIfOpen(db)

            // Exercises in the order first logged, each with its sets renumbered 1…n.
            let byExercise = Dictionary(grouping: sets) { $0["exerciseId"] as String }
            let ordered = byExercise.values.sorted { a, b in
                let fa = a.map { $0["createdAt"] as Date }.min()!, fb = b.map { $0["createdAt"] as Date }.min()!
                return fa != fb ? fa < fb : (a[0]["order"] as Int) < (b[0]["order"] as Int)
            }
            let plan = ordered.enumerated().map { i, rows in
                let e = rows[0]
                return SavedExercise(
                    name: e["name"], exerciseDefinitionId: e["exerciseDefinitionId"], order: i + 1, notes: e["notes"],
                    exerciseGroup: e["exerciseGroup"],
                    sets: rows.sorted { ($0["setNumber"] as Int) < ($1["setNumber"] as Int) }.enumerated().map { j, s in
                        SavedSet(setNumber: j + 1, reps: String(s["reps"] as Int), rir: s["rir"], rpe: s["rpe"],
                                 isWarmup: s["isWarmup"])
                    })
            }
            return try Self.insertDraft(db, name: name, plan: plan, savedWorkoutId: nil, at: date)
        }
    }

    public func trainingPinned() throws -> [PinnedWorkout] {
        try dbQueue.read { db in
            try Row.fetchAll(db, sql: """
                SELECT id, name, exerciseCount, pinnedAt FROM savedWorkout
                WHERE pinnedAt IS NOT NULL AND archivedAt IS NULL ORDER BY pinnedAt DESC LIMIT 5
                """).map { PinnedWorkout(id: $0["id"], name: $0["name"], exerciseCount: $0["exerciseCount"], pinnedAt: $0["pinnedAt"]) }
        }
    }

    public func trainingRecent() throws -> [RecentWorkout] {
        try dbQueue.read { db in
            try Row.fetchAll(db, sql: """
                SELECT c.id, COALESCE(w.name, c.name, 'Open Workout') AS name, c.completedAt, c.startedAt, c.durationSeconds,
                       EXISTS (SELECT 1 FROM loggedSet s WHERE s.completionId = c.id) AS canRepeat
                FROM workoutCompletion c LEFT JOIN workout w ON w.id = c.workoutId
                WHERE c.status = 'completed' AND c.isArchived = 0
                ORDER BY c.completedAt DESC LIMIT 3
                """).map { r in
                let completedAt: Date = r["completedAt"]
                // lib/workout-history.ts resolveDurationSeconds: only a duration above 0.
                var duration: Int? = (r["durationSeconds"] as Int?).flatMap { $0 > 0 ? $0 : nil }
                if duration == nil, let started = r["startedAt"] as Date? {
                    let diff = Int(completedAt.timeIntervalSince(started).rounded())
                    duration = diff > 0 ? diff : nil
                }
                return RecentWorkout(id: r["id"], name: r["name"], completedAt: completedAt, durationSeconds: duration,
                                     canRepeat: r["canRepeat"])
            }
        }
    }

    // MARK: - Helpers

    private func updateSaved(_ id: String, _ assignments: String, _ arguments: [(any DatabaseValueConvertible)?]) throws {
        try dbQueue.write { db in
            try db.execute(sql: "UPDATE savedWorkout SET \(assignments) WHERE id = ?",
                           arguments: StatementArguments(arguments + [id]))
            if db.changesCount == 0 { throw RipitCoreError.notFound("saved workout \(id)") }
        }
    }

    static func validName(_ name: String) throws -> String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw SavedWorkoutError.nameRequired }
        // JavaScript's length counts UTF-16 units.
        guard trimmed.utf16.count <= 100 else { throw SavedWorkoutError.nameTooLong }
        return trimmed
    }

    static func summary(_ r: Row) -> SavedWorkoutSummary {
        SavedWorkoutSummary(id: r["id"], name: r["name"], notes: r["notes"], exerciseCount: r["exerciseCount"],
                            createdAt: r["createdAt"], lastUsedAt: r["lastUsedAt"], pinnedAt: r["pinnedAt"],
                            origin: r["origin"], archivedAt: r["archivedAt"], dismissedAt: r["dismissedAt"])
    }

    static func plan(_ db: Database, _ id: String) throws -> [SavedExercise] {
        guard let text = try String.fetchOne(db, sql: "SELECT workoutData FROM savedWorkout WHERE id = ?", arguments: [id]) else {
            throw RipitCoreError.notFound("saved workout \(id)")
        }
        return try JSONDecoder().decode([SavedExercise].self, from: Data(text.utf8))
    }

    /// The web's workoutData JSON: every key present, nulls written out.
    static func workoutDataText(_ plan: [SavedExercise]) throws -> String {
        func orNull(_ v: Any?) -> Any { v ?? NSNull() }
        let tree: [[String: Any]] = plan.map { e in
            ["name": e.name, "exerciseDefinitionId": e.exerciseDefinitionId, "order": e.order, "notes": orNull(e.notes),
             "exerciseGroup": orNull(e.exerciseGroup),
             "sets": e.sets.map { s -> [String: Any] in
                 ["setNumber": s.setNumber, "reps": s.reps, "rir": orNull(s.rir), "rpe": orNull(s.rpe), "isWarmup": s.isWarmup]
             }]
        }
        let data = try JSONSerialization.data(withJSONObject: tree, options: [.sortedKeys, .withoutEscapingSlashes])
        return String(decoding: data, as: UTF8.self)
    }

    /// Only one open workout at a time, as the web's DRAFT_EXISTS.
    static func refuseIfOpen(_ db: Database) throws {
        if let open = try String.fetchOne(db, sql: """
            SELECT id FROM workoutCompletion WHERE status = 'draft' AND isArchived = 0 ORDER BY startedAt DESC LIMIT 1
            """) {
            throw SavedWorkoutError.workoutOpen(open)
        }
    }

    /// lib/workouts/start-draft.ts: a draft ad-hoc workout with one-off exercises and their prescribed sets.
    static func insertDraft(_ db: Database, name: String, plan: [SavedExercise], savedWorkoutId: String?, at date: Date) throws -> String {
        let id = newId()
        try db.execute(sql: """
            INSERT INTO workoutCompletion (id, savedWorkoutId, startedAt, status, isAdHoc, name)
            VALUES (?, ?, ?, 'draft', 1, ?)
            """, arguments: [id, savedWorkoutId, date, name])
        for ex in plan {
            let exerciseId = newId()
            try db.execute(sql: """
                INSERT INTO exercise (id, name, exerciseDefinitionId, "order", exerciseGroup, notes, isOneOff, workoutCompletionId)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                """, arguments: [exerciseId, ex.name, ex.exerciseDefinitionId, ex.order, ex.exerciseGroup, ex.notes, id])
            for s in ex.sets {
                try db.execute(sql: """
                    INSERT INTO prescribedSet (id, setNumber, reps, rpe, rir, isWarmup, exerciseId) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, arguments: [newId(), s.setNumber, s.reps, s.rpe, s.rir, s.isWarmup, exerciseId])
            }
        }
        return id
    }

    // MARK: - Summary

    static func rollup(_ db: Database, _ completionId: String, now: Date) throws -> WorkoutRollup? {
        guard let c = try Row.fetchOne(db, sql: """
            SELECT c.completedAt, c.startedAt, c.durationSeconds, c.isAdHoc, COALESCE(w.name, c.name) AS workoutName
            FROM workoutCompletion c LEFT JOIN workout w ON w.id = c.workoutId
            WHERE c.id = ? AND c.status = 'completed' AND c.isArchived = 0
            """, arguments: [completionId]) else { return nil }
        let completedAt: Date = c["completedAt"]
        let lifetime = try Int.fetchOne(db, sql: """
            SELECT COUNT(*) FROM workoutCompletion WHERE status = 'completed' AND isArchived = 0
            """) ?? 0
        let last7 = try Int.fetchOne(db, sql: """
            SELECT COUNT(*) FROM workoutCompletion WHERE status = 'completed' AND isArchived = 0 AND completedAt >= ?
            """, arguments: [now.addingTimeInterval(-7 * 86_400)]) ?? 0
        var duration: Int? = c["durationSeconds"]
        if duration == nil, let started = c["startedAt"] as Date? {
            duration = max(0, RollupFormat.jsRound(completedAt.timeIntervalSince(started)))
        }

        let working = try Row.fetchAll(db, sql: """
            SELECT s.reps, s.weight, e.name, e.exerciseDefinitionId FROM loggedSet s JOIN exercise e ON e.id = s.exerciseId
            WHERE s.completionId = ? AND s.isWarmup = 0 ORDER BY s.createdAt, s.rowid
            """, arguments: [completionId])

        struct Agg {
            let definitionId: String, name: String
            var sets = 0, reps = 0, volume = 0.0, maxWeight = -1.0
            var top: RollupTopSet?
        }
        var aggs: [Agg] = []
        var index: [String: Int] = [:]
        for s in working {
            let def: String = s["exerciseDefinitionId"], reps: Int = s["reps"], weight: Double = s["weight"]
            let i = index[def] ?? { aggs.append(Agg(definitionId: def, name: s["name"])); index[def] = aggs.count - 1; return aggs.count - 1 }()
            aggs[i].sets += 1
            aggs[i].reps += reps
            aggs[i].volume += weight * Double(reps)
            if weight > aggs[i].maxWeight {
                aggs[i].maxWeight = weight
                aggs[i].top = RollupTopSet(weight: weight, reps: reps)
            }
        }

        let previous = try previousSets(db, aggs.map(\.definitionId), before: completedAt)
        var exercises: [RollupExercise] = []
        var totalReps = 0, totalVolume = 0.0, hasBodyweight = false
        for a in aggs {
            let bodyweight = a.maxWeight <= 0
            if bodyweight { hasBodyweight = true }
            let vs = previous[a.definitionId].map { p -> RollupVsLast in
                let prevWorking = p.sets.filter { !$0.isWarmup }
                var top: RollupTopSet?
                for s in prevWorking where top == nil || s.weight > top!.weight { top = RollupTopSet(weight: s.weight, reps: s.reps) }
                return RollupVsLast(previousCompletedAt: p.completedAt,
                                    previousVolumeLbs: prevWorking.reduce(0) { $0 + $1.weight * Double($1.reps) },
                                    previousTopSet: top)
            }
            exercises.append(RollupExercise(
                exerciseDefinitionId: a.definitionId, name: a.name, workingSets: a.sets, reps: a.reps,
                volumeLbs: bodyweight ? 0 : a.volume, isBodyweight: bodyweight, topSet: a.top, vsLastTime: vs))
            totalReps += a.reps
            if !bodyweight { totalVolume += a.volume }
        }
        return WorkoutRollup(
            completionId: completionId, isMinimal: working.isEmpty, durationSeconds: duration,
            exerciseCount: exercises.count, workingSetCount: working.count, totalReps: totalReps,
            totalVolumeLbs: totalVolume, hasBodyweightOnlyExercises: hasBodyweight, lifetimeWorkoutCount: lifetime,
            workoutsLast7Days: last7, exercises: exercises, workoutName: c["workoutName"], isAdHoc: c["isAdHoc"])
    }

    private struct PreviousSet { let weight: Double, reps: Int, isWarmup: Bool }

    /// For each definition, its sets in the most recent finished, non-archived workout before `before`.
    /// Like the web, only the 50 most recent such workouts are looked at.
    private static func previousSets(_ db: Database, _ definitionIds: [String], before: Date)
        throws -> [String: (completedAt: Date, sets: [PreviousSet])] {
        guard !definitionIds.isEmpty else { return [:] }
        let marks = databaseQuestionMarks(count: definitionIds.count)
        let completions = try Row.fetchAll(db, sql: """
            SELECT c.id, c.completedAt FROM workoutCompletion c
            WHERE c.status = 'completed' AND c.isArchived = 0 AND c.completedAt < ?
              AND EXISTS (SELECT 1 FROM loggedSet s JOIN exercise e ON e.id = s.exerciseId
                          WHERE s.completionId = c.id AND e.exerciseDefinitionId IN (\(marks)))
            ORDER BY c.completedAt DESC LIMIT 50
            """, arguments: [before] + StatementArguments(definitionIds))
        var result: [String: (completedAt: Date, sets: [PreviousSet])] = [:]
        for c in completions {
            let sets = try Row.fetchAll(db, sql: """
                SELECT s.weight, s.reps, s.isWarmup, e.exerciseDefinitionId FROM loggedSet s JOIN exercise e ON e.id = s.exerciseId
                WHERE s.completionId = ? AND e.exerciseDefinitionId IN (\(marks))
                """, arguments: [c["id"] as String] + StatementArguments(definitionIds))
            for (def, rows) in Dictionary(grouping: sets, by: { $0["exerciseDefinitionId"] as String }) where result[def] == nil {
                result[def] = (c["completedAt"], rows.map { PreviousSet(weight: $0["weight"], reps: $0["reps"], isWarmup: $0["isWarmup"]) })
            }
            if result.count == definitionIds.count { break }
        }
        return result
    }
}
