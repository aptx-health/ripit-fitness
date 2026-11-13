// Shared helpers for the slice 4 Progress tests (work item 166, features/ios-app/progress.feature).
//
// The oracle is the web's own code: scripts/ios/progress-goldens.ts runs lib/insights/progress.ts,
// progress-records.ts and lift-history.ts on synthetic histories and writes
// Tests/Fixtures/progress/<name>.json, each holding:
// - file:      the history as a ripit-export v1 file, which the test imports into a fresh database
// - timeZone, now, unit, target: the inputs
// - weekStarts: instants and the local Monday the web gives each
// - reports:   { weekStart: WeeklyReport } as the web computes it
// - lifts:     { exerciseDefinitionId: { history: LiftHistory, charts: { range: ChartSeries } } }
// Regenerate with `npx tsx scripts/ios/progress-goldens.ts` from the repo root.

import Foundation
@testable import RipitCore

struct Golden: CustomStringConvertible, Sendable {
    let name: String
    var description: String { name }

    static let all = ["basic", "mixed-units", "gap-week"].map(Golden.init)

    static let dir = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("Fixtures/progress")

    func json() throws -> [String: Any] {
        let data = try Data(contentsOf: Self.dir.appendingPathComponent("\(name).json"))
        guard let top = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw Missing(description: "\(name).json is not an object") }
        return top
    }

    func field<T>(_ key: String) throws -> T {
        guard let v = try json()[key] as? T else { throw Missing(description: "\(name).json has no \(key)") }
        return v
    }

    var timeZone: TimeZone { get throws { TimeZone(identifier: try field("timeZone"))! } }
    var now: Date { get throws { try isoDate(try field("now")) } }
    var unit: WeightUnit { get throws { WeightUnit(rawValue: try field("unit"))! } }
    var target: Int { get throws { try field("target") } }
    var reports: [String: Any] { get throws { try field("reports") } }
    var lifts: [String: Any] { get throws { try field("lifts") } }

    /// A fresh database holding the golden's history, imported from its ripit-export file.
    func database() throws -> AppDatabase {
        let file: [String: Any] = try field("file")
        let db = try TempDB().open()
        try db.importExport(data: try JSONSerialization.data(withJSONObject: file))
        return db
    }
}

func isoDate(_ text: String) throws -> Date {
    guard let d = parseISODate(text) else { throw Missing(description: "not a date: \(text)") }
    return d
}

/// A Swift value as the same kind of JSON tree the goldens hold (dates as ISO strings with ms).
func jsonTree<T: Encodable>(_ value: T) throws -> Any {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .custom { date, enc in
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var c = enc.singleValueContainer()
        try c.encode(f.string(from: date))
    }
    return try JSONSerialization.jsonObject(with: encoder.encode(value), options: .fragmentsAllowed)
}

/// Differences between a golden tree and an actual tree, as "path: expected X, got Y".
/// A missing key equals null (Swift's encoder leaves nil out). Numbers match within 1e-9
/// (relative), dates within a millisecond, everything else exactly.
func differences(expected: Any, actual: Any, path: String = "$") -> [String] {
    func isNull(_ v: Any) -> Bool { v is NSNull }
    switch (expected, actual) {
    case let (e as [String: Any], a as [String: Any]):
        return Set(e.keys).union(a.keys).sorted().flatMap { k in
            differences(expected: e[k] ?? NSNull(), actual: a[k] ?? NSNull(), path: "\(path).\(k)")
        }
    case let (e as [Any], a as [Any]):
        guard e.count == a.count else { return ["\(path): expected \(e.count) items, got \(a.count)"] }
        return zip(e, a).enumerated().flatMap { i, pair in differences(expected: pair.0, actual: pair.1, path: "\(path)[\(i)]") }
    case let (e as NSNumber, a as NSNumber):
        let eBool = CFGetTypeID(e) == CFBooleanGetTypeID(), aBool = CFGetTypeID(a) == CFBooleanGetTypeID()
        if eBool || aBool { return eBool == aBool && e.boolValue == a.boolValue ? [] : ["\(path): expected \(e), got \(a)"] }
        let x = e.doubleValue, y = a.doubleValue
        return abs(x - y) <= 1e-9 * max(1, abs(x)) ? [] : ["\(path): expected \(x), got \(y)"]
    case let (e as String, a as String):
        if e == a { return [] }
        if let de = parseISODate(e), let da = parseISODate(a), abs(de.timeIntervalSince(da)) < 0.001 { return [] }
        return ["\(path): expected \"\(e)\", got \"\(a)\""]
    default:
        if isNull(expected) && isNull(actual) { return [] }
        return ["\(path): expected \(expected), got \(actual)"]
    }
}

/// The golden subtree at `keys`, e.g. ("reports", "2026-11-02", "records").
func goldenPart(_ golden: Golden, _ keys: String...) throws -> Any {
    var node: Any = try golden.json()
    for k in keys {
        guard let d = node as? [String: Any], let next = d[k] else { throw Missing(description: "\(golden.name): no \(keys.joined(separator: "."))") }
        node = next
    }
    return node
}
