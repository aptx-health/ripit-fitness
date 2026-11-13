// Progress reads and pins (slice 4, work item 168). Reports are computed on demand from SQLite in
// the device's time zone; pins are written straight away.

import Foundation
import RipitCore

extension WorkoutStore {
    /// This week's Monday in the device's time zone.
    var thisWeekStart: String {
        (try? ProgressCalendar.weekStart(for: Date(), timeZone: .current)) ?? ""
    }

    /// A Monday plus `n` weeks.
    func addWeeks(_ weekStart: String, _ n: Int) -> String {
        let p = weekStart.split(separator: "-").compactMap { Int($0) }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = .current
        guard p.count == 3, let day = cal.date(from: DateComponents(year: p[0], month: p[1], day: p[2], hour: 12)),
              let moved = cal.date(byAdding: .day, value: 7 * n, to: day) else { return weekStart }
        return (try? ProgressCalendar.weekStart(for: moved, timeZone: .current)) ?? weekStart
    }

    func weeklyReport(weekStart: String, unit: WeightUnit, target: Int) -> WeeklyReport? {
        guard let db else { return nil }
        var report: WeeklyReport?
        attempt { report = try db.weeklyReport(weekStart: weekStart, timeZone: .current, now: Date(), unit: unit, target: target) }
        return report
    }

    func liftHistory(_ id: String, unit: WeightUnit) -> LiftHistory? {
        try? db?.liftHistory(id, timeZone: .current, now: Date(), unit: unit)
    }

    func liftChart(_ id: String, range: ChartRange, unit: WeightUnit) -> ChartSeries? {
        try? db?.liftChart(id, range: range, timeZone: .current, now: Date(), unit: unit)
    }

    func isPinned(_ id: String) -> Bool { (try? db?.pinnedLifts().contains(id)) ?? false }

    func pinLift(_ id: String) {
        guard let db else { return }
        attempt { try db.pinLift(id) }
    }

    func unpinLift(_ id: String) {
        guard let db else { return }
        attempt { try db.unpinLift(id) }
    }
}
