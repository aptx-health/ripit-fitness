// Scenarios: "Summary after Finish", "Save an ad-hoc workout to repeat", "Library › Workouts groups",
// "Manage a saved workout", "Start a saved workout", "Training shows Pinned and Recent",
// "Repeat a finished workout".
// Each test imports Tests/Fixtures/saved-workouts/saved.json's ripit-export file and compares the
// phone's answer with what the web's own code did with the same rows
// (scripts/ios/saved-workouts.goldens.ts), field by field. "now" is the golden's.
//
// The golden covers:
// - summaries: c-upper (5 lifts logged out of order, a gap in set numbers, kg and lbs mixed, a
//   warm-up-only lift, an unlogged one; "same as last", "-2%", "+63%", "+14 reps", "10.2k",
//   "156.3", "1h 2m"; last time's bench was warm-ups only, so no trend), c-bw (bodyweight day, "5m 03s"),
//   c-old ("1,001", no duration), c-prog (program: no Save, "45s"), c-min and c-empty (minimal),
//   c-edge (exactly 7 days ago counts), c-arch, c-arch-new and c-missing (no summary)
// - saving: trimming, blank notes, the 100 and 2000 limits in UTF-16 units (emoji), saving twice,
//   a program workout refused
// - groups and Training: every group, the 30-day edge, pinned beats New, archived beats pinned,
//   Training's 5 pins and 3 recent (archived left out, "Open Workout", canRepeat)
// - managing: pin twice, unpin, archive a pinned one, restore, dismiss and restore, rename
//   (trimmed, blank, too long), delete, delete again
// - start: a rich plan (warm-up, "3-5", RPE, RIR, notes, superset, an exercise with no sets), an
//   archived workout (restored), a New one (leaves New); repeat: out-of-order logging, a program
//   session, warm-ups only, nothing logged (refused), archived (refused)
//
// API used:
// - workoutRollup(_:now:), WorkoutRollup.text(), SavedWorkoutNaming.suggestedName(at:timeZone:)
// - saveWorkout(fromCompletion:name:notes:at:), savedWorkout(_:), savedWorkoutPlan(_:), savedWorkoutGroups(now:)
// - pin/unpin/rename/archive/dismiss/restore/deleteSavedWorkout, startSavedWorkout(_:at:), repeatWorkout(_:at:)
// - trainingPinned(), trainingRecent(), discardWorkout(_:), workout(_:); slice 2: importExport(data:)

import Foundation
import GRDB
import Testing
@testable import RipitCore

enum SavedGolden {
    static let url = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("Fixtures/saved-workouts/saved.json")

    static func json() throws -> [String: Any] {
        guard let top = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any] else {
            throw Missing(description: "saved.json is not an object")
        }
        return top
    }

    static func value<T>(_ key: String, as: T.Type) throws -> T {
        guard let value = try json()[key] as? T else { throw Missing(description: "saved.json has no \(key)") }
        return value
    }

    static func part(_ key: String) throws -> [String: Any] { try value(key, as: [String: Any].self) }

    static func now() throws -> Date { try isoDate(try value("now", as: String.self)) }

    static func timeZone() throws -> TimeZone {
        guard let tz = TimeZone(identifier: try value("timeZone", as: String.self)) else { throw Missing(description: "bad timeZone") }
        return tz
    }

    /// A fresh database holding the golden's history and saved workouts.
    static func database() throws -> AppDatabase {
        let db = try TempDB().open()
        try db.importExport(data: try JSONSerialization.data(withJSONObject: try part("file")))
        return db
    }

    static let completionIds: [String] = ((try? part("rollups").keys.sorted()) ?? [])
    static let summaryIds: [String] = ((try? part("rollups").filter { ($0.value as? [String: Any])?["view"] != nil }.keys.sorted()) ?? [])
    /// The save cases, in the order the web ran them (upperAgain follows upper).
    static let saveCases = ["upper", "upperAgain", "bodyweight", "minimal", "program", "blankName", "longName",
                            "longNotes", "emojiName", "maxLengths"]
    static let startCases = ["rich", "archived", "newOne"]
    static let repeatCases = ["upper", "program", "minimal", "empty", "archived"]

    /// The web's 400 messages, as the phone's errors.
    static func error(_ message: String?) -> SavedWorkoutError? {
        let m = message ?? ""
        switch m {
        case "name is required", "name cannot be empty": return SavedWorkoutError.nameRequired
        case "name must be 100 characters or fewer": return SavedWorkoutError.nameTooLong
        case "notes must be 2000 characters or fewer": return SavedWorkoutError.notesTooLong
        case "NOTHING_TO_REPEAT": return SavedWorkoutError.nothingToRepeat
        default: return m.hasPrefix("Only freestyle workouts") ? SavedWorkoutError.notAdHoc : nil
        }
    }

    static let dateDecoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let c = try decoder.singleValueContainer()
            let text = try c.decode(String.self)
            guard let date = parseISODate(text) else {
                throw DecodingError.dataCorruptedError(in: c, debugDescription: "not a date: \(text)")
            }
            return date
        }
        return d
    }()
}

/// The parts of a saved workout the web's routes return, as a tree like the golden's.
func savedState(_ s: SavedWorkoutSummary?) throws -> Any {
    guard let s else { return NSNull() }
    return try jsonTree(s)
}

/// A started or repeated workout as the golden's draft: read from the tables, ids left out.
func draftTree(_ db: AppDatabase, _ id: String) throws -> [String: Any] {
    try db.read { db in
        guard let c = try Row.fetchOne(db, sql: """
            SELECT name, status, isAdHoc, workoutId, startedAt, savedWorkoutId FROM workoutCompletion WHERE id = ?
            """, arguments: [id]) else { throw Missing(description: "no workout \(id)") }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        func value(_ v: (any DatabaseValueConvertible)?) -> Any { v.map { $0 as Any } ?? NSNull() }
        let exercises = try Row.fetchAll(db, sql: """
            SELECT id, name, exerciseDefinitionId, "order", notes, exerciseGroup FROM exercise
            WHERE workoutCompletionId = ? ORDER BY "order"
            """, arguments: [id]).map { e -> [String: Any] in
            let sets = try Row.fetchAll(db, sql: """
                SELECT setNumber, reps, weight, rir, rpe, isWarmup FROM prescribedSet WHERE exerciseId = ? ORDER BY setNumber
                """, arguments: [e["id"] as String]).map { s -> [String: Any] in
                ["setNumber": s["setNumber"] as Int, "reps": s["reps"] as String, "weight": value(s["weight"] as String?),
                 "rir": value(s["rir"] as Int?), "rpe": value(s["rpe"] as Int?), "isWarmup": s["isWarmup"] as Bool]
            }
            return ["name": e["name"] as String, "exerciseDefinitionId": e["exerciseDefinitionId"] as String,
                    "order": e["order"] as Int, "notes": value(e["notes"] as String?),
                    "exerciseGroup": value(e["exerciseGroup"] as String?), "sets": sets]
        }
        let startedAt: Date? = c["startedAt"]
        return ["name": value(c["name"] as String?), "status": c["status"] as String, "isAdHoc": c["isAdHoc"] as Bool,
                "workoutId": value(c["workoutId"] as String?), "startedAt": startedAt.map { iso.string(from: $0) } ?? NSNull(),
                "savedWorkoutId": value(c["savedWorkoutId"] as String?), "exercises": exercises]
    }
}

/// Fails unless `body` throws `RipitCoreError.notFound`.
func expectNotFound(_ label: String, sourceLocation: SourceLocation = #_sourceLocation, _ body: () throws -> Void) {
    do {
        try body()
        Issue.record("\(label): expected notFound, nothing thrown", sourceLocation: sourceLocation)
    } catch RipitCoreError.notFound {
    } catch {
        Issue.record("\(label): expected notFound, got \(error)", sourceLocation: sourceLocation)
    }
}

func groupIds(_ g: SavedWorkoutGroups) -> [String: Any] {
    ["new": g.new.map(\.id), "pinned": g.pinned.map(\.id), "recent": g.recent.map(\.id), "older": g.older.map(\.id),
     "archived": g.archived.map(\.id)]
}

@Suite("Saved workouts: the web's answers for the same rows")
struct SavedWorkoutsGoldenTests {
    @Test("The golden loads and holds every case")
    func goldenPresent() throws {
        #expect(SavedGolden.completionIds.count == 11)
        #expect(SavedGolden.summaryIds.count == 8)
        #expect(Set(try SavedGolden.part("saves").keys) == Set(SavedGolden.saveCases))
        #expect(Set(try SavedGolden.part("starts").keys) == Set(SavedGolden.startCases))
        #expect(Set(try SavedGolden.part("repeats").keys) == Set(SavedGolden.repeatCases))
    }

    // MARK: Summary

    @Test("Summary: the counts, volumes, top sets and vs-last match the web's rollup", arguments: SavedGolden.completionIds)
    func rollup(_ id: String) throws {
        let expected = (try SavedGolden.part("rollups")[id] as? [String: Any])?["rollup"] ?? NSNull()
        let actual = try SavedGolden.database().workoutRollup(id, now: try SavedGolden.now())
        let diffs = differences(expected: expected, actual: try jsonTree(actual))
        #expect(diffs.isEmpty, "\(id):\n\(diffs.joined(separator: "\n"))")
    }

    @Test("Summary: the tiles, rows, trend words and Save match what the web shows", arguments: SavedGolden.summaryIds)
    func summaryText(_ id: String) throws {
        let golden = try #require(try SavedGolden.part("rollups")[id] as? [String: Any])
        // The text is judged on the web's own rollup, so a rollup bug doesn't show up here too.
        let rollup = try SavedGolden.dateDecoder.decode(
            WorkoutRollup.self, from: JSONSerialization.data(withJSONObject: try #require(golden["rollup"])))
        var expected = try #require(golden["view"] as? [String: Any])
        expected["suggestedName"] = nil
        let diffs = differences(expected: expected, actual: try jsonTree(try rollup.text()))
        #expect(diffs.isEmpty, "\(id):\n\(diffs.joined(separator: "\n"))")
    }

    @Test("Summary: the suggested name is the local date the summary opens", arguments: 0..<3)
    func suggestedName(_ i: Int) throws {
        let cases = try SavedGolden.value("suggestedNames", as: [[String: Any]].self)
        let at = try isoDate(try #require(cases[i]["at"] as? String))
        let name = try SavedWorkoutNaming.suggestedName(at: at, timeZone: try SavedGolden.timeZone())
        #expect(name == cases[i]["name"] as? String, "at \(at)")
    }

    // MARK: Saving

    @Test("Save: each case is kept or refused as the web does, with the web's stored plan")
    func saving() throws {
        let saves = try SavedGolden.part("saves")
        let db = try SavedGolden.database()
        let now = try SavedGolden.now()
        var firstUpper: String?
        for key in SavedGolden.saveCases {
            let golden = try #require(saves[key] as? [String: Any])
            let request = try #require(golden["request"] as? [String: Any])
            let completion = try #require(request["sourceCompletionId"] as? String)
            let name = try #require(request["name"] as? String)
            let notes = request["notes"] as? String
            if golden["status"] as? Int != 200 {
                let error = try #require(SavedGolden.error(golden["error"] as? String), "\(key): unmapped \(golden["error"] ?? "")")
                #expect(throws: error, "\(key)") { try db.saveWorkout(fromCompletion: completion, name: name, notes: notes, at: now) }
                continue
            }
            let id = try db.saveWorkout(fromCompletion: completion, name: name, notes: notes, at: now)
            if key == "upper" { firstUpper = id }
            if key == "upperAgain" { #expect(id == firstUpper, "saving the same workout again returns the first") }
            let summary = try #require(try db.savedWorkout(id))
            let tree = try jsonTree(summary) as? [String: Any] ?? [:]
            var diffs = ["name", "notes", "exerciseCount", "lastUsedAt", "origin", "pinnedAt", "archivedAt", "dismissedAt"].flatMap {
                differences(expected: golden[$0] ?? NSNull(), actual: tree[$0] ?? NSNull(), path: $0)
            }
            diffs += differences(expected: golden["workoutData"] ?? NSNull(), actual: try jsonTree(try db.savedWorkoutPlan(id)), path: "workoutData")
            #expect(diffs.isEmpty, "\(key):\n\(diffs.joined(separator: "\n"))")
        }
        let count = try db.read { try Int.fetchOne($0, sql: "SELECT COUNT(*) FROM savedWorkout WHERE sourceCompletionId = 'c-upper'") }
        #expect(count == 1)
    }

    @Test("Save: the stored workoutData is the web's JSON, every key present, reps as text")
    func storedJSON() throws {
        let golden = try #require(try SavedGolden.part("saves")["upper"] as? [String: Any])
        let expected = try #require(golden["workoutData"] as? [[String: Any]])
        let db = try SavedGolden.database()
        let id = try db.saveWorkout(fromCompletion: "c-upper", name: "Upper Repeat", notes: nil, at: try SavedGolden.now())
        let text = try #require(try db.read { try String.fetchOne($0, sql: "SELECT workoutData FROM savedWorkout WHERE id = ?", arguments: [id]) })
        let stored = try #require(try JSONSerialization.jsonObject(with: Data(text.utf8)) as? [[String: Any]])
        #expect(differences(expected: expected, actual: stored).isEmpty)
        #expect(stored.map { Set($0.keys) } == expected.map { Set($0.keys) }, "the same keys, nulls written out")
        let sets = stored.flatMap { ($0["sets"] as? [[String: Any]]) ?? [] }
        let expectedSets = expected.flatMap { ($0["sets"] as? [[String: Any]]) ?? [] }
        #expect(sets.map { Set($0.keys) } == expectedSets.map { Set($0.keys) })
        #expect(sets.allSatisfy { $0["reps"] is String })
    }

    // MARK: Groups and Training

    @Test("Groups: each saved workout lands in the web's group, in the web's order")
    func groups() throws {
        let actual = try SavedGolden.database().savedWorkoutGroups(now: try SavedGolden.now())
        let diffs = differences(expected: try SavedGolden.part("groups"), actual: groupIds(actual))
        #expect(diffs.isEmpty, "\(diffs.joined(separator: "\n"))")
    }

    @Test("Training: pinned and recent match the web's Training page")
    func training() throws {
        let golden = try SavedGolden.part("training")
        let db = try SavedGolden.database()
        let diffs = differences(expected: golden["pinned"] ?? NSNull(), actual: try jsonTree(try db.trainingPinned()), path: "pinned")
            + differences(expected: golden["recent"] ?? NSNull(), actual: try jsonTree(try db.trainingRecent()), path: "recent")
        #expect(diffs.isEmpty, "\(diffs.joined(separator: "\n"))")
    }

    // MARK: Managing

    @Test("Manage: each step leaves the saved workout as the web's did, and the groups after match")
    func manage() throws {
        let manage = try SavedGolden.part("manage")
        let steps = try #require(manage["steps"] as? [[String: Any]])
        let db = try SavedGolden.database()
        for step in steps {
            let label = step["step"] as? String ?? "?"
            let id = try #require(step["id"] as? String)
            let at = try isoDate(try #require(step["at"] as? String))
            let body = step["body"] as? [String: Any] ?? [:]
            let run: () throws -> Void
            if step["method"] as? String == "DELETE" {
                run = { try db.deleteSavedWorkout(id) }
            } else if let pinned = body["pinned"] as? Bool {
                run = { if pinned { try db.pinSavedWorkout(id, at: at) } else { try db.unpinSavedWorkout(id) } }
            } else if let archived = body["archived"] as? Bool {
                let dismissed = body["dismissed"] as? Bool == true
                run = {
                    if !archived { try db.restoreSavedWorkout(id, at: at) }
                    else if dismissed { try db.dismissSavedWorkout(id, at: at) }
                    else { try db.archiveSavedWorkout(id, at: at) }
                }
            } else if let name = body["name"] as? String {
                run = { try db.renameSavedWorkout(id, to: name) }
            } else {
                Issue.record("\(label): unknown step")
                continue
            }
            switch step["status"] as? Int {
            case 200:
                try run()
            case 404:
                expectNotFound(label) { try run() }
            default:
                let error = try #require(SavedGolden.error(step["error"] as? String), "\(label): unmapped error")
                #expect(throws: error, "\(label)") { try run() }
            }
            let tree = try savedState(try db.savedWorkout(id))
            let expected = step["row"] ?? NSNull()
            let diffs: [String]
            if let e = expected as? [String: Any], let a = tree as? [String: Any] {
                diffs = e.keys.sorted().flatMap { differences(expected: e[$0] ?? NSNull(), actual: a[$0] ?? NSNull(), path: $0) }
            } else {
                diffs = differences(expected: expected, actual: tree)
            }
            #expect(diffs.isEmpty, "\(label):\n\(diffs.joined(separator: "\n"))")
        }
        let after = try isoDate(try #require(manage["groupsAfterAt"] as? String))
        let diffs = differences(expected: manage["groupsAfter"] ?? NSNull(), actual: groupIds(try db.savedWorkoutGroups(now: after)))
        #expect(diffs.isEmpty, "groups after:\n\(diffs.joined(separator: "\n"))")
    }

    // MARK: Start and repeat

    @Test("Start: the new workout has the saved exercises and planned sets, and the saved workout updates", arguments: SavedGolden.startCases)
    func start(_ key: String) throws {
        let golden = try #require(try SavedGolden.part("starts")[key] as? [String: Any])
        let id = try #require(golden["id"] as? String)
        let db = try SavedGolden.database()
        let draft = try db.startSavedWorkout(id, at: try SavedGolden.now())
        var diffs = differences(expected: golden["draft"] ?? NSNull(), actual: try draftTree(db, draft), path: "draft")
        if let e = golden["saved"] as? [String: Any], let a = try savedState(try db.savedWorkout(id)) as? [String: Any] {
            diffs += e.keys.sorted().flatMap { differences(expected: e[$0] ?? NSNull(), actual: a[$0] ?? NSNull(), path: "saved.\($0)") }
        } else {
            diffs.append("saved: missing")
        }
        #expect(diffs.isEmpty, "\(key):\n\(diffs.joined(separator: "\n"))")
        // The logger reads the plan from the workout itself.
        let planned = try db.workout(draft).exercises.map { $0.planned.map(\.reps) }
        let expectedPlanned = ((golden["draft"] as? [String: Any])?["exercises"] as? [[String: Any]] ?? []).map {
            ($0["sets"] as? [[String: Any]] ?? []).compactMap { $0["reps"] as? String }
        }
        #expect(planned == expectedPlanned)
    }

    @Test("Repeat: the new workout copies the exercises and sets, or is refused, as the web does", arguments: SavedGolden.repeatCases)
    func repeatWorkout(_ key: String) throws {
        let golden = try #require(try SavedGolden.part("repeats")[key] as? [String: Any])
        let id = try #require(golden["id"] as? String)
        let db = try SavedGolden.database()
        switch golden["status"] as? Int {
        case 200:
            let draft = try db.repeatWorkout(id, at: try SavedGolden.now())
            let diffs = differences(expected: golden["draft"] ?? NSNull(), actual: try draftTree(db, draft))
            #expect(diffs.isEmpty, "\(key):\n\(diffs.joined(separator: "\n"))")
        case 404:
            let now = try SavedGolden.now()
            expectNotFound(key) { _ = try db.repeatWorkout(id, at: now) }
        default:
            let error = try #require(SavedGolden.error(golden["error"] as? String))
            let now = try SavedGolden.now()
            #expect(throws: error) { try db.repeatWorkout(id, at: now) }
        }
        if golden["status"] as? Int != 200 {
            #expect(try db.inProgressWorkout() == nil, "a refused repeat opens nothing")
        }
    }
}
