// Scenario "Enter numbers with the web's keypads" of features/ios-app/one-exercise-logger.feature, the weight
// keypad (work item 203, follow-up 1: Dustin 2026-11-11). It departs from the web's pad on purpose:
// - a "." key, one at most, and at most two digits after it (the phone shows weights to two places,
//   Theme.swift `fractionLength(0...2)`); "." first or on an empty value gives "0.";
// - capped at 2000 (`LoggedWeight.max`) instead of 999;
// - Done drops a trailing ".".
// Every other rule is the web's, so the golden's keypad cases run through it too. Only one departs:
// "1000 is refused" (the weight keypad takes 1000). The reps keypad stays the web's and ignores ".".
//
// API used: NumberKeypad(opening:decimal:), KeypadKey.point, NumberKeypad.weightMax/decimalPlaces

import Foundation
import Testing
@testable import RipitCore

private func keys(_ text: String) -> [KeypadKey] {
    text.split(separator: " ").map { k in
        switch k {
        case "CLR": return .clear
        case "DEL": return .delete
        case ".": return .point
        default: return .digit(Int(k)!)
        }
    }
}

struct WeightPadCase: CustomTestStringConvertible, Sendable {
    let label: String, start: String, keys: String, values: [String], done: String
    var testDescription: String { label }
}

@Suite("Logger: the weight keypad")
struct LoggerWeightKeypadTests {
    @Test("Its limits are the phone's")
    func limits() {
        #expect(NumberKeypad.weightMax == 2000)
        #expect(NumberKeypad.decimalPlaces == 2)
        #expect(NumberKeypad(opening: "135", decimal: true).decimal)
        #expect(!NumberKeypad(opening: "8").decimal)
    }

    @Test("The web's keypad cases, through the weight keypad", arguments: LoggerGolden.file?.keypad ?? [])
    func webCases(_ c: LoggerGolden.Keypad) throws {
        // The one departure: 2000 is the cap, so 1000 is taken.
        let expected = c.label == "1000 is refused" ? ["1", "10", "100", "1000"] : c.values
        var pad = NumberKeypad(opening: c.start, decimal: true)
        var values: [String] = []
        for k in c.keys {
            try pad.press(try LoggerGolden.key(k))
            values.append(pad.value)
        }
        #expect(values == expected)
        #expect(try pad.cancel() == c.start)
    }

    @Test("The golden still has the case that departs")
    func departingCasePresent() throws {
        let f = try #require(LoggerGolden.file)
        #expect(f.keypad.contains { $0.label == "1000 is refused" && $0.values == ["1", "10", "100", "100"] })
    }

    static let cases: [WeightPadCase] = [
        .init(label: "2000 is taken", start: "", keys: "2 0 0 0", values: ["2", "20", "200", "2000"], done: "2000"),
        .init(label: "2001 is refused", start: "", keys: "2 0 0 1", values: ["2", "20", "200", "200"], done: "200"),
        .init(label: "a fifth digit is refused", start: "", keys: "1 5 0 0 0", values: ["1", "15", "150", "1500", "1500"], done: "1500"),
        .init(label: "a half after digits", start: "", keys: "1 3 2 . 5", values: ["1", "13", "132", "132.", "132.5"], done: "132.5"),
        .init(label: "two places are taken", start: "", keys: "1 . 2 5", values: ["1", "1.", "1.2", "1.25"], done: "1.25"),
        .init(label: "a third place is refused", start: "", keys: "1 . 2 5 7", values: ["1", "1.", "1.2", "1.25", "1.25"], done: "1.25"),
        .init(label: "a second point is refused", start: "", keys: "2 . 5 .", values: ["2", "2.", "2.5", "2.5"], done: "2.5"),
        .init(label: "point first replaces a prefilled value with 0.", start: "135", keys: ". 5", values: ["0.", "0.5"], done: "0.5"),
        .init(label: "point on an empty value gives 0.", start: "", keys: "CLR .", values: ["", "0."], done: "0"),
        .init(label: "0 then point keeps the 0", start: "", keys: "0 . 5", values: ["0", "0.", "0.5"], done: "0.5"),
        .init(label: "zeros after the point are taken", start: "", keys: ". 0 5", values: ["0.", "0.0", "0.05"], done: "0.05"),
        .init(label: "DEL removes the point", start: "", keys: "7 . DEL 5", values: ["7", "7.", "7", "75"], done: "75"),
        .init(label: "DEL after a decimal digit", start: "", keys: "6 2 . 5 DEL", values: ["6", "62", "62.", "62.5", "62."], done: "62"),
        .init(label: "2000.5 is refused", start: "", keys: "2 0 0 0 . 5", values: ["2", "20", "200", "2000", "2000.", "2000."], done: "2000"),
        .init(label: "1999.75 is taken", start: "", keys: "1 9 9 9 . 7 5", values: ["1", "19", "199", "1999", "1999.", "1999.7", "1999.75"], done: "1999.75"),
        .init(label: "Done drops a trailing point", start: "", keys: "4 5 .", values: ["4", "45", "45."], done: "45"),
        .init(label: "a prefilled decimal is replaced by the first digit", start: "132.5", keys: "1 4 0", values: ["1", "14", "140"], done: "140"),
    ]

    @Test("Decimals and the 2000 cap", arguments: cases)
    func decimals(_ c: WeightPadCase) throws {
        var pad = NumberKeypad(opening: c.start, decimal: true)
        var values: [String] = []
        for k in keys(c.keys) {
            try pad.press(k)
            values.append(pad.value)
        }
        #expect(values == c.values)
        #expect(try pad.done() == c.done)
        #expect(try pad.cancel() == c.start)
    }

    @Test("The reps keypad ignores the point")
    func repsIgnoresPoint() throws {
        var pad = NumberKeypad(opening: "8")
        for k in keys("1 . 2 .") { try pad.press(k) }
        #expect(pad.value == "12")
        #expect(try pad.done() == "12")

        var fresh = NumberKeypad(opening: "8")
        try fresh.press(.point)
        try fresh.press(.digit(5))
        #expect(fresh.value == "5")
    }
}
