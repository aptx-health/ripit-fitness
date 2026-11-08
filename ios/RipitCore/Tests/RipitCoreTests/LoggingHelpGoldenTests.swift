// Scenarios: "Last time line", "Logging effort" (the presets), "Exercise history while logging",
// "Warm-up sets" (kept apart in history, skipped by e1RM and the last-time fill).
// Each test imports Tests/Fixtures/logging-help/history.json's ripit-export file and compares the
// phone's answer with the web's (scripts/ios/logging-help-goldens.ts), field by field.
//
// The golden covers, per lift:
// - bench:    5 workouts, the oldest the heaviest (only 4 shown, PR among them); a heavier warm-up;
//             a nameless workout ("Open Workout"); latest "202.5 lbs × 5 × 3 @ RPE 8"
// - squat:    kg; a 15-rep set that wins on e1RM (no rep cap here); mixed units in one workout
// - row:      the latest workout is archived and still counts; "@ RIR 2"
// - pullup:   bodyweight ("BW × 12,10"); 3 workouts but only 1 with an e1RM, so no PR
// - deadlift: latest workout warm-ups only (no summary, no tap); two older workouts tie, newer is PR
// - press:    one workout: an e1RM but no PR; RIR and RPE both set, RIR shown
//
// API used:
// - IntensityPresets.presets(_:), lastTime(definitionId:includeIntensity:), exerciseHistory(definitionId:)
// - slice 2: importExport(data:)

import Foundation
import Testing
@testable import RipitCore

enum HelpGolden {
    static let url = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("Fixtures/logging-help/history.json")

    static func json() throws -> [String: Any] {
        guard let top = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any] else {
            throw Missing(description: "history.json is not an object")
        }
        return top
    }

    static func lifts() throws -> [String: [String: Any]] {
        guard let l = try json()["lifts"] as? [String: [String: Any]] else { throw Missing(description: "history.json has no lifts") }
        return l
    }

    /// A fresh database holding the golden's history.
    static func database() throws -> AppDatabase {
        guard let file = try json()["file"] else { throw Missing(description: "history.json has no file") }
        let db = try TempDB().open()
        try db.importExport(data: try JSONSerialization.data(withJSONObject: file))
        return db
    }

    /// Lift names in the golden, as test arguments.
    static let liftIds: [String] = ((try? lifts().keys.sorted()) ?? [])
}

@Suite("Logging help: the web's answers for the same history")
struct LoggingHelpGoldenTests {
    @Test("The golden loads and holds every lift")
    func goldenPresent() throws {
        #expect(HelpGolden.liftIds.count == 6)
    }

    @Test("Effort: the presets match the web's lists", arguments: [EffortKind.rpe, .rir])
    func presets(_ kind: EffortKind) throws {
        let expected = try (HelpGolden.json()["presets"] as? [String: Any])?[kind.rawValue] ?? NSNull()
        let actual = try jsonTree(try IntensityPresets.presets(kind))
        let diffs = differences(expected: expected, actual: actual)
        #expect(diffs.isEmpty, "\(kind):\n\(diffs.joined(separator: "\n"))")
    }

    @Test("Last time: the line, its date and what a tap fills match the web", arguments: HelpGolden.liftIds)
    func lastTime(_ id: String) throws {
        let lift = try HelpGolden.lifts()[id] ?? [:]
        let expected = lift["lastTime"] as? [String: Any] ?? [:]
        let actual = try HelpGolden.database().lastTime(definitionId: id, includeIntensity: true)
        let tree = try jsonTree(actual) as? [String: Any] ?? [:]
        let diffs = ["completedAt", "workoutName", "summary", "fill"].flatMap {
            differences(expected: expected[$0] ?? NSNull(), actual: tree[$0] ?? NSNull(), path: $0)
        }
        #expect(diffs.isEmpty, "\(lift["name"] ?? id):\n\(diffs.joined(separator: "\n"))")
    }

    @Test("Last time: with effort tracking off, a tap fills no RPE or RIR", arguments: HelpGolden.liftIds)
    func lastTimeWithoutEffort(_ id: String) throws {
        let lift = try HelpGolden.lifts()[id] ?? [:]
        let expected = (lift["lastTime"] as? [String: Any])?["fillWithoutEffort"] ?? NSNull()
        let actual = try HelpGolden.database().lastTime(definitionId: id, includeIntensity: false)
        let diffs = differences(expected: expected, actual: try jsonTree(actual?.fill))
        #expect(diffs.isEmpty, "\(lift["name"] ?? id):\n\(diffs.joined(separator: "\n"))")
    }

    @Test("History: newest first, best-set e1RM, PR and warm-ups match the web", arguments: HelpGolden.liftIds)
    func history(_ id: String) throws {
        let lift = try HelpGolden.lifts()[id] ?? [:]
        let actual = try jsonTree(try HelpGolden.database().exerciseHistory(definitionId: id))
        let diffs = differences(expected: lift["history"] ?? NSNull(), actual: actual)
        #expect(diffs.isEmpty, "\(lift["name"] ?? id):\n\(diffs.joined(separator: "\n"))")
    }
}
