// Scenarios "The bottom bar", "After the planned sets", "Freestyle workout with no exercises", "The plan list",
// "Reorder, swap, delete and add" (where the logger lands) and "Supersets go in order" of
// features/ios-app/one-exercise-logger.feature (work item 203). Rules the web keeps inline in JSX, so the
// expected values are cited by line instead of a golden:
// - next / previous: hooks/useProgressiveExercises.ts:311-326
// - the bar and the header's Finish: components/ExerciseLoggingModal.tsx:647-660, 809-851;
//   components/adhoc/AdHocLoggerView.tsx:912-928 (freestyle). Warm-ups don't count (the feature file).
// - Log set on: ExerciseLoggingModal.tsx:647 (reps and weight), AdHocLoggerView.tsx:920 (reps)
// - after a delete: ExerciseLoggingModal.tsx:618-627; after an add: the first new one (item 196, observed)
// - the plan row: WorkoutPlanEditorRow.tsx:36-45, useWorkoutPlanSheet.ts:69-80, lib/format/pluralize.ts
// - the badge: ExerciseDisplayTabs.tsx:100
//
// API used: LoggerNav, LoggerRules.bar/headerShowsFinish/canLog/supersetBadge/planRow, LoggerBarInput

import Foundation
import Testing
@testable import RipitCore

private func program(_ index: Int, of count: Int = 3, planned: Int = 3, logged: Int = 0, extra: Bool = false,
                     keypad: Bool = false, canLog: Bool = true) -> LoggerBarInput {
    LoggerBarInput(isProgram: true, exerciseCount: count, index: index, plannedWorkingSets: planned,
                   loggedWorkingSets: logged, extraSets: extra, keypadOpen: keypad, canLog: canLog)
}

private func freestyle(_ index: Int, of count: Int = 3, planned: Int = 0, logged: Int = 0, keypad: Bool = false,
                       canLog: Bool = true) -> LoggerBarInput {
    LoggerBarInput(isProgram: false, exerciseCount: count, index: index, plannedWorkingSets: planned,
                   loggedWorkingSets: logged, keypadOpen: keypad, canLog: canLog)
}

@Suite("Logger: next and previous")
struct LoggerNavTests {
    @Test("› goes to the next exercise, nothing on the last", arguments: [
        (0, 3, 1), (1, 3, 2), (2, 3, nil), (0, 1, nil),
    ] as [(Int, Int, Int?)])
    func next(_ index: Int, _ count: Int, _ expected: Int?) throws {
        #expect(try LoggerNav.next(from: index, count: count) == expected)
    }

    @Test("‹ goes to the previous exercise, nothing on the first", arguments: [
        (2, 3, 1), (1, 3, 0), (0, 3, nil), (0, 1, nil),
    ] as [(Int, Int, Int?)])
    func previous(_ index: Int, _ count: Int, _ expected: Int?) throws {
        #expect(try LoggerNav.previous(from: index, count: count) == expected)
    }

    @Test("A superset goes in list order: through the group and on, never back to its first")
    func supersetInOrder() throws {
        // Bench, Row A, Curl A, Squat: from Curl (the group's last) next is Squat, not Row.
        var path = [0]
        while let n = try LoggerNav.next(from: path.last!, count: 4) { path.append(n) }
        #expect(path == [0, 1, 2, 3])
    }

    @Test("Each exercise in a superset shows its badge", arguments: [
        ("A", "Superset A"), ("B", "Superset B"), ("A2", "Superset A2"),
    ])
    func badge(_ group: String, _ text: String) throws {
        #expect(try LoggerRules.supersetBadge(group) == text)
    }

    @Test("No badge outside a superset")
    func noBadge() throws {
        #expect(try LoggerRules.supersetBadge(nil) == nil)
    }
}

@Suite("Logger: where it lands after a delete or an add")
struct LoggerLandingTests {
    static let ids = ["a", "b", "c", "d"]

    @Test("Deleting the current exercise lands on the one before it", arguments: [
        ("c", 1), ("d", 2), ("b", 0),
    ])
    func deleteCurrent(_ id: String, _ index: Int) throws {
        #expect(try LoggerNav.indexAfterDelete(Self.ids, deleting: id, current: id) == index)
    }

    @Test("Deleting the first exercise while on it stays first")
    func deleteFirst() throws {
        #expect(try LoggerNav.indexAfterDelete(Self.ids, deleting: "a", current: "a") == 0)
    }

    @Test("Deleting another exercise keeps the current one", arguments: [
        ("a", "c", 1), ("d", "c", 2), ("b", "a", 0),
    ])
    func deleteOther(_ deleting: String, _ current: String, _ index: Int) throws {
        #expect(try LoggerNav.indexAfterDelete(Self.ids, deleting: deleting, current: current) == index)
    }

    @Test("Deleting the only exercise leaves none")
    func deleteLast() throws {
        #expect(try LoggerNav.indexAfterDelete(["a"], deleting: "a", current: "a") == nil)
    }

    @Test("Adding opens the first new exercise", arguments: [
        (1, 3, 0, 1), (4, 1, 2, 4), (0, 2, 0, 0),
    ])
    func add(_ before: Int, _ added: Int, _ current: Int, _ index: Int) throws {
        #expect(try LoggerNav.indexAfterAdd(countBefore: before, added: added, current: current) == index)
    }

    @Test("Adding nothing stays put")
    func addNone() throws {
        #expect(try LoggerNav.indexAfterAdd(countBefore: 4, added: 0, current: 2) == 2)
    }

    @Test("Reorder keeps the current exercise by id, at its new number", arguments: [
        (3, 0, "c", 3), (3, 0, "d", 0), (0, 3, "a", 3), (0, 3, "b", 0), (1, 2, "e", 4),
    ])
    func moveKeepsCurrent(_ from: Int, _ to: Int, _ current: String, _ index: Int) throws {
        let moved = try LoggerNav.move(["a", "b", "c", "d", "e"], from: from, to: to)
        #expect(moved.firstIndex(of: current) == index)
    }
}

@Suite("Logger: the bottom bar")
struct LoggerBarTests {
    @Test("Program, logging: ‹ · Log set · ›, ‹ off on the first and › on the last", arguments: [
        (0, LoggerBar(previous: false, main: .logSet(enabled: true), next: .chevron(enabled: true))),
        (1, LoggerBar(previous: true, main: .logSet(enabled: true), next: .chevron(enabled: true))),
        (2, LoggerBar(previous: true, main: .logSet(enabled: true), next: .chevron(enabled: false))),
    ])
    func logging(_ index: Int, _ bar: LoggerBar) throws {
        #expect(try LoggerRules.bar(program(index, logged: 2)) == bar)
    }

    @Test("Log set is off when the form can't log")
    func logOff() throws {
        #expect(try LoggerRules.bar(program(1, canLog: false))?.main == .logSet(enabled: false))
        #expect(try LoggerRules.bar(freestyle(1, canLog: false))?.main == .logSet(enabled: false))
    }

    @Test("Program, all planned sets logged: ‹ · + Extra set · Next exercise", arguments: [3, 4])
    func done(_ logged: Int) throws {
        #expect(try LoggerRules.bar(program(1, logged: logged))
            == LoggerBar(previous: true, extraSet: true, main: .nextExercise, next: nil))
    }

    @Test("Program, all logged on the last exercise: Finish")
    func doneLast() throws {
        #expect(try LoggerRules.bar(program(2, logged: 3))
            == LoggerBar(previous: true, extraSet: true, main: .finish, next: nil))
    }

    @Test("Program, all logged on the only exercise: ‹ off, Finish")
    func doneOnly() throws {
        #expect(try LoggerRules.bar(program(0, of: 1, planned: 2, logged: 2))
            == LoggerBar(previous: false, extraSet: true, main: .finish, next: nil))
    }

    @Test("Program, extra sets: Log set and a labelled Next exercise, or Finish on the last", arguments: [
        (1, LoggerBarNext.nextExercise), (2, .finish),
    ])
    func extra(_ index: Int, _ next: LoggerBarNext) throws {
        #expect(try LoggerRules.bar(program(index, logged: 3, extra: true))
            == LoggerBar(previous: true, main: .logSet(enabled: true), next: next))
    }

    @Test("Program, an exercise with no plan counts as all logged, as on the web")
    func noPlan() throws {
        #expect(try LoggerRules.bar(program(1, planned: 0, logged: 0))
            == LoggerBar(previous: true, extraSet: true, main: .nextExercise, next: nil))
    }

    @Test("Freestyle: ‹ · Log set · › always, never Extra set or Finish", arguments: [
        (freestyle(0, planned: 2, logged: 2), LoggerBar(previous: false, main: .logSet(enabled: true), next: .chevron(enabled: true))),
        (freestyle(2, planned: 2, logged: 5), LoggerBar(previous: true, main: .logSet(enabled: true), next: .chevron(enabled: false))),
        (freestyle(0, of: 1), LoggerBar(previous: false, main: .logSet(enabled: true), next: .chevron(enabled: false))),
    ])
    func freestyleBar(_ input: LoggerBarInput, _ bar: LoggerBar) throws {
        #expect(try LoggerRules.bar(input) == bar)
    }

    @Test("Freestyle with no exercises: only Add exercise")
    func empty() throws {
        #expect(try LoggerRules.bar(freestyle(0, of: 0)) == LoggerBar(previous: nil, main: .addExercise, next: nil))
    }

    @Test("A keypad hides the bar", arguments: [
        program(1, keypad: true), program(2, logged: 3, keypad: true), freestyle(1, keypad: true),
    ])
    func keypadHides(_ input: LoggerBarInput) throws {
        #expect(try LoggerRules.bar(input) == nil)
    }

    @Test("The header's Finish hides while the bar offers one", arguments: [
        (program(2, logged: 3), false),
        (program(2, logged: 3, extra: true), false),
        (program(2, logged: 1), true),
        (program(1, logged: 3), true),
        (program(2, logged: 3, keypad: true), true),
        (freestyle(2, planned: 1, logged: 1), true),
    ])
    func headerFinish(_ input: LoggerBarInput, _ shows: Bool) throws {
        #expect(try LoggerRules.headerShowsFinish(input) == shows)
    }

    @Test("Log set needs reps and a weight in a program, reps in freestyle", arguments: [
        ("8", "135", true, true), ("8", "0", true, true), ("8", "", true, false), ("", "135", true, false),
        ("8", "", false, true), ("", "135", false, false), ("8", "135", false, true),
    ])
    func canLog(_ reps: String, _ weight: String, _ isProgram: Bool, _ ok: Bool) throws {
        #expect(try LoggerRules.canLog(reps: reps, weight: weight, isProgram: isProgram) == ok)
    }
}

@Suite("Logger: the plan list")
struct LoggerPlanRowTests {
    @Test("Sets done of planned, the last weight, and the tick", arguments: [
        (2, 4, 135.0, "lbs", false, PlanRow(status: .upcoming, subLine: "2 of 4 sets · 135 lbs")),
        (4, 4, 135.0, "lbs", false, PlanRow(status: .done, subLine: "4 of 4 sets · 135 lbs")),
        (5, 4, 60.0, "kg", false, PlanRow(status: .done, subLine: "5 of 4 sets · 60 kg")),
        (1, 1, 132.5, "kg", false, PlanRow(status: .done, subLine: "1 of 1 set · 132.5 kg")),
        (0, 3, nil, "lbs", false, PlanRow(status: .upcoming, subLine: "0 of 3 sets")),
        (3, 3, 0.0, "lbs", false, PlanRow(status: .done, subLine: "3 of 3 sets")),
    ] as [(Int, Int?, Double?, String, Bool, PlanRow)])
    func row(_ done: Int, _ planned: Int?, _ weight: Double?, _ unit: String, _ current: Bool, _ row: PlanRow) throws {
        #expect(try LoggerRules.planRow(doneWorkingSets: done, plannedWorkingSets: planned, lastWeight: weight,
                                        unit: unit, isCurrent: current) == row)
    }

    @Test("No plan: a set count and never a tick", arguments: [
        (0, nil, PlanRow(status: .upcoming, subLine: "0 sets")),
        (1, 95.0, PlanRow(status: .upcoming, subLine: "1 set · 95 lbs")),
        (3, 95.0, PlanRow(status: .upcoming, subLine: "3 sets · 95 lbs")),
    ] as [(Int, Double?, PlanRow)])
    func noPlan(_ done: Int, _ weight: Double?, _ row: PlanRow) throws {
        #expect(try LoggerRules.planRow(doneWorkingSets: done, plannedWorkingSets: nil, lastWeight: weight,
                                        unit: "lbs", isCurrent: false) == row)
    }

    @Test("A plan of 0 sets never ticks")
    func emptyPlan() throws {
        #expect(try LoggerRules.planRow(doneWorkingSets: 0, plannedWorkingSets: 0, lastWeight: nil, unit: "lbs",
                                        isCurrent: false) == PlanRow(status: .upcoming, subLine: "0 of 0 sets"))
    }

    @Test("The current row is NOW, done or not", arguments: [(1, 3), (3, 3)])
    func now(_ done: Int, _ planned: Int) throws {
        #expect(try LoggerRules.planRow(doneWorkingSets: done, plannedWorkingSets: planned, lastWeight: 100,
                                        unit: "lbs", isCurrent: true).status == .now)
    }
}
