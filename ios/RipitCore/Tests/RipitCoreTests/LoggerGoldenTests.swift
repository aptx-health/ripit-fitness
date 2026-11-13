// Scenarios "Enter numbers with the web's keypads", "Swipe between exercises", "The bottom bar" (Log set's
// second line), "Log a set" (the form after a log) and "Reorder" (the move), of
// features/ios-app/one-exercise-logger.feature (work item 203).
// Each case is the web's own answer from Tests/Fixtures/logger/logger.json (scripts/ios/logger.goldens.ts):
// - keypad: NumberKeypad.tsx rendered, keys clicked, the value after each key
// - stepper: RepsStepper.tsx rendered, − / + clicked, the value and whether − is on after each
// - swipe: useSwipeNavigation.ts with a touch start and end, keypad closed and open
// - pendingSetDetail: LoggerBottomBar.tsx; afterLog: plan-summary.ts planFormValues through withPlan
// - move: @dnd-kit/sortable arrayMove, which the plan list's drag uses
//
// API used: NumberKeypad, KeypadKey, RepsStepper, LoggerRules.swipe/pendingSetDetail/formAfterLog,
// LoggerNav.move, SetForm, ProgramSetDetail

import Foundation
import Testing
@testable import RipitCore

enum LoggerGolden {
    struct File: Decodable {
        let keypad: [Keypad]
        let stepper: [Stepper]
        let swipe: [Swipe]
        let pendingSetDetail: [Detail]
        let afterLog: [AfterLog]
        let plans: [String: [Planned]]
        let move: [Move]
    }

    struct Keypad: Decodable, CustomTestStringConvertible {
        let label: String, start: String, keys: [String], values: [String]
        var testDescription: String { label }
    }

    struct Stepper: Decodable, CustomTestStringConvertible {
        struct Step: Decodable { let value: String, canDecrement: Bool }
        let label: String, start: String, presses: [String], startCanDecrement: Bool, steps: [Step]
        var testDescription: String { label }
    }

    struct Swipe: Decodable, CustomTestStringConvertible {
        let dx: Double, dy: Double, keypadOpen: Bool, result: String
        var testDescription: String { "dx \(dx) dy \(dy)\(keypadOpen ? " keypad open" : "")" }
    }

    struct Detail: Decodable, CustomTestStringConvertible {
        let reps: String, weight: String, weightUnit: String, detail: String?
        var testDescription: String { "reps '\(reps)' weight '\(weight)' \(weightUnit)" }
    }

    struct Form: Decodable {
        let reps: String, weight: String, weightUnit: String, rpe: String, rir: String
        var setForm: SetForm { SetForm(reps: reps, weight: weight, unit: weightUnit, rpe: rpe, rir: rir) }
    }

    struct AfterLog: Decodable, CustomTestStringConvertible {
        let label: String, plan: String, loggedWorking: Int, form: Form, expected: Form
        var testDescription: String { label }
    }

    struct Planned: Decodable {
        let setNumber: Int, reps: String, rpe: Int?, rir: Int?, isWarmup: Bool
    }

    struct Move: Decodable, CustomTestStringConvertible {
        let ids: [String], from: Int, to: Int, result: [String]
        var testDescription: String { "\(from) to \(to)" }
    }

    static let url = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("Fixtures/logger/logger.json")

    static let file: File? = try? JSONDecoder().decode(File.self, from: Data(contentsOf: url))

    static func plan(_ name: String) throws -> [ProgramSetDetail] {
        guard let sets = file?.plans[name] else { throw Missing(description: "no plan \(name)") }
        return sets.map {
            ProgramSetDetail(id: "p\($0.setNumber)", setNumber: $0.setNumber, reps: $0.reps, weight: nil,
                             rpe: $0.rpe, rir: $0.rir, isWarmup: $0.isWarmup)
        }
    }

    static func key(_ k: String) throws -> KeypadKey {
        switch k {
        case "CLR": return .clear
        case "DEL": return .delete
        default:
            guard let d = Int(k) else { throw Missing(description: "key \(k)") }
            return .digit(d)
        }
    }
}

@Suite("Logger: the web's answers")
struct LoggerGoldenTests {
    @Test("The golden loads with every section")
    func goldenPresent() throws {
        let f = try #require(LoggerGolden.file)
        #expect(f.keypad.count == 15)
        #expect(f.stepper.count == 6)
        #expect(f.swipe.count == 36)
        #expect(f.pendingSetDetail.count == 7)
        #expect(f.afterLog.count == 8)
        #expect(f.move.count == 6)
    }

    @Test("Keypad: the value after each key", arguments: LoggerGolden.file?.keypad ?? [])
    func keypad(_ c: LoggerGolden.Keypad) throws {
        var pad = NumberKeypad(opening: c.start)
        #expect(pad.value == c.start)
        var values: [String] = []
        for k in c.keys {
            try pad.press(try LoggerGolden.key(k))
            values.append(pad.value)
        }
        #expect(values == c.values)
        #expect(try pad.done() == c.values.last)
        #expect(try pad.cancel() == c.start)
    }

    @Test("Reps stepper: − and + from a value", arguments: LoggerGolden.file?.stepper ?? [])
    func stepper(_ c: LoggerGolden.Stepper) throws {
        var value = c.start
        #expect(try RepsStepper.canDecrement(value) == c.startCanDecrement)
        for (press, step) in zip(c.presses, c.steps) {
            // The web's − is a disabled button when off: a tap does nothing.
            if press == "+" {
                value = try RepsStepper.increment(value)
            } else if try RepsStepper.canDecrement(value) {
                value = try RepsStepper.decrement(value)
            }
            #expect(value == step.value)
            #expect(try RepsStepper.canDecrement(value) == step.canDecrement)
        }
    }

    @Test("Reps stepper: − on an empty value changes nothing, even if called")
    func decrementEmpty() throws {
        #expect(try RepsStepper.decrement("") == "")
    }

    @Test("Swipe: next, previous or nothing", arguments: LoggerGolden.file?.swipe ?? [])
    func swipe(_ c: LoggerGolden.Swipe) throws {
        #expect(try LoggerRules.swipe(dx: c.dx, dy: c.dy, keypadOpen: c.keypadOpen).rawValue == c.result)
    }

    @Test("Log set's second line", arguments: LoggerGolden.file?.pendingSetDetail ?? [])
    func detail(_ c: LoggerGolden.Detail) throws {
        #expect(try LoggerRules.pendingSetDetail(reps: c.reps, weight: c.weight, unit: c.weightUnit) == c.detail)
    }

    @Test("The form after a set is logged", arguments: LoggerGolden.file?.afterLog ?? [])
    func afterLog(_ c: LoggerGolden.AfterLog) throws {
        let next = try LoggerRules.formAfterLog(c.form.setForm, planned: LoggerGolden.plan(c.plan), loggedWorkingSets: c.loggedWorking)
        #expect(next == c.expected.setForm)
    }

    @Test("Reorder: the list after a drag", arguments: LoggerGolden.file?.move ?? [])
    func move(_ c: LoggerGolden.Move) throws {
        #expect(try LoggerNav.move(c.ids, from: c.from, to: c.to) == c.result)
    }
}
