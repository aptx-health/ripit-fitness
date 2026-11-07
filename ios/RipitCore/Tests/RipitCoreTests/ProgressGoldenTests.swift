// Scenarios: "This week's report", "Records this week", "Trend note", "Per-lift page", "Mixed units".
// Each test imports a golden history (Tests/Fixtures/progress) and compares the phone's answer with
// the web's, field by field. See ProgressSupport.swift for the golden format.
//
// The goldens cover:
// - basic:       ten weeks over the DST change, then an open week with e1RM PRs (bench, squat, row) and
//                a rep PR (press, 10 reps); a warm-up set; a Sunday-evening workout that is Monday in UTC;
//                a paused workout and one with no stored duration; lbs
// - mixed-units: bench in kg and lbs over 14 months, shown in kg; bodyweight pull-ups with a rep PR;
//                a week with under half its sets rated; charts that differ by range
// - gap-week:    a gap week, a light week, rising RPE, an archived workout, a 15-rep set past the
//                record cap; a closed week and an open, empty one
//
// API used:
// - weeklyReport(weekStart:timeZone:now:unit:target:), liftHistory(_:timeZone:now:unit:),
//   liftChart(_:range:timeZone:now:unit:), ProgressCalendar.weekStart(for:timeZone:)

import Foundation
import Testing
@testable import RipitCore

/// One golden report week.
struct ReportCase: CustomStringConvertible, Sendable {
    let golden: Golden
    let week: String
    var description: String { "\(golden.name) \(week)" }

    static let all: [ReportCase] = Golden.all.flatMap { g in
        ((try? g.reports.keys.sorted()) ?? []).map { ReportCase(golden: g, week: $0) }
    }

    func report() throws -> WeeklyReport {
        let g = golden
        return try g.database().weeklyReport(weekStart: week, timeZone: g.timeZone, now: g.now, unit: g.unit, target: g.target)
    }

    /// Differences in the named report fields.
    func diff(_ fields: [String]) throws -> [String] {
        let actual = try jsonTree(try report()) as? [String: Any] ?? [:]
        let expected = try goldenPart(golden, "reports", week) as? [String: Any] ?? [:]
        return fields.flatMap { differences(expected: expected[$0] ?? NSNull(), actual: actual[$0] ?? NSNull(), path: $0) }
    }
}

/// One golden lift page.
struct LiftCase: CustomStringConvertible, Sendable {
    let golden: Golden
    let id: String
    var description: String { "\(golden.name) \(id)" }

    static let all: [LiftCase] = Golden.all.flatMap { g in
        ((try? g.lifts.keys.sorted()) ?? []).map { LiftCase(golden: g, id: $0) }
    }
}

@Suite("Progress: the web's numbers for the same history")
struct ProgressGoldenTests {
    @Test("The goldens load and hold every case")
    func goldensPresent() throws {
        #expect(ReportCase.all.count == 6)
        #expect(LiftCase.all.count == 7)
    }

    @Test("Weeks: each instant falls in the same local Monday week as on the web", arguments: Golden.all)
    func weekStarts(_ g: Golden) throws {
        let rows: [[String: Any]] = try g.field("weekStarts")
        try #require(!rows.isEmpty)
        for row in rows {
            let instant = try isoDate(row["instant"] as! String)
            #expect(try ProgressCalendar.weekStart(for: instant, timeZone: g.timeZone) == row["weekStart"] as? String, "\(row["instant"]!)")
        }
    }

    @Test("This week's report: workouts, sets, time, normal, streak and the 8-week chart", arguments: ReportCase.all)
    func weekReport(_ c: ReportCase) throws {
        let d = try c.diff(["weekStart", "isCurrentWeek", "target", "current", "normal", "normalWeeks", "streak", "weeks", "weightUnit"])
        #expect(d.isEmpty, "\(d.prefix(8).joined(separator: "\n"))")
    }

    @Test("Records this week: e1RM and rep PRs up to 12 reps, converted to the display unit", arguments: ReportCase.all)
    func records(_ c: ReportCase) throws {
        let d = try c.diff(["records"])
        #expect(d.isEmpty, "\(d.prefix(8).joined(separator: "\n"))")
    }

    @Test("This week's lifts: best set, e1RM, previous and best e1RM, sessions below best", arguments: ReportCase.all)
    func lifts(_ c: ReportCase) throws {
        let d = try c.diff(["lifts"])
        #expect(d.isEmpty, "\(d.prefix(8).joined(separator: "\n"))")
    }

    @Test("Trend note: rising effort and the last light week", arguments: ReportCase.all)
    func trend(_ c: ReportCase) throws {
        let d = try c.diff(["trend"])
        #expect(d.isEmpty, "\(d.prefix(8).joined(separator: "\n"))")
    }

    @Test("Pinned lifts on Progress: this week's lift, else the latest numbers", arguments: ReportCase.all)
    func pinned(_ c: ReportCase) throws {
        let d = try c.diff(["pinned"])
        #expect(d.isEmpty, "\(d.prefix(8).joined(separator: "\n"))")
    }

    @Test("Per-lift page: sessions, rep records and weekly sets", arguments: LiftCase.all)
    func liftPage(_ c: LiftCase) throws {
        let g = c.golden
        let actual = try #require(try g.database().liftHistory(c.id, timeZone: g.timeZone, now: g.now, unit: g.unit))
        let d = differences(expected: try goldenPart(g, "lifts", c.id, "history"), actual: try jsonTree(actual))
        #expect(d.isEmpty, "\(d.prefix(8).joined(separator: "\n"))")
    }

    @Test("Per-lift chart: 3M, 6M, 1Y and All", arguments: LiftCase.all)
    func liftCharts(_ c: LiftCase) throws {
        let g = c.golden
        let db = try g.database()
        for range in ChartRange.allCases {
            let actual = try db.liftChart(c.id, range: range, timeZone: g.timeZone, now: g.now, unit: g.unit)
            let d = differences(expected: try goldenPart(g, "lifts", c.id, "charts", range.rawValue), actual: try jsonTree(actual), path: range.rawValue)
            #expect(d.isEmpty, "\(d.prefix(8).joined(separator: "\n"))")
        }
    }

    @Test("Per-lift page: an exercise that doesn't exist has no page")
    func unknownLift() throws {
        let g = Golden.all[0]
        #expect(try g.database().liftHistory("no-such-exercise", timeZone: g.timeZone, now: g.now, unit: g.unit) == nil)
    }
}
