// The Progress maths, ported from the web (work item 168). Pure functions over logged sets; the
// database reads are in Progress.swift. Each section names its web source:
// - lib/insights/progress.ts          weeks, summarizeWeeks, computeNormal, computeStreak
// - lib/insights/progress-records.ts  computeWeekRecords, computeWeekLifts, computeTrendNote
// - lib/insights/lift-history.ts      computeLiftSessions, computeRepRecords, chartSeries, weeklySets
// - lib/insights/pinned-lifts.ts      lastSets (the latest session's best set)
// Keep them in step with the web: the goldens in Tests/Fixtures/progress come from that code.

import Foundation

let lbsPerKg = 2.20462
/// Records (e1RM and rep PRs) are kept for sets of 1 to 12 reps.
let maxPrReps = 12
private let normalWeeks = 8
private let minTrendWeeks = 3
private let minRisingWeeks = 3

/// A logged set of a completed, un-archived workout.
struct ProgressSet {
    let completionId: String
    let completedAt: Date
    let exerciseDefinitionId: String
    let name: String
    let reps: Int
    let weight: Double
    let weightUnit: String
    let isWarmup: Bool
    let rpe: Int?
    let rir: Int?
}

/// A completed, un-archived workout with its sets.
struct ProgressWorkout {
    let completedAt: Date
    let startedAt: Date?
    let durationSeconds: Int?
    let sets: [ProgressSet]
}

// MARK: - Units and effort

func toLbs(_ weight: Double, _ unit: String) -> Double { unit == "kg" ? weight * lbsPerKg : weight }
private func fromLbs(_ lbs: Double, _ unit: WeightUnit) -> Double { unit == .kg ? lbs / lbsPerKg : lbs }
func epley(_ lbs: Double, _ reps: Int) -> Double { reps == 1 ? lbs : lbs * (1 + Double(reps) / 30) }

/// The set's weight in the display unit, untouched when it was logged in that unit.
private func inUnit(_ s: ProgressSet, _ unit: WeightUnit) -> Double {
    s.weightUnit == unit.rawValue || (unit == .lbs && s.weightUnit != "kg") ? s.weight : fromLbs(toLbs(s.weight, s.weightUnit), unit)
}

/// RPE, else 10 - RIR (lib/aggregates/compute.ts setEffort).
private func setEffort(rpe: Int?, rir: Int?) -> Double? {
    if let rpe { return Double(rpe) }
    if let rir { return Double(10 - rir) }
    return nil
}

/// The first item with the largest score; nil when none scores.
private func best<T>(_ items: [T], _ score: (T) -> Double?) -> T? {
    var top: T?
    var topScore = -Double.infinity
    for item in items {
        if let value = score(item), value > topScore {
            top = item
            topScore = value
        }
    }
    return top
}

/// JavaScript's `localeCompare` for names.
private func nameOrder(_ a: String, _ b: String) -> Bool { a.localizedCompare(b) == .orderedAscending }

// MARK: - Calendar (progress.ts)

enum Civil {
    private static let utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    static func calendar(_ timeZone: TimeZone) -> Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = timeZone
        return c
    }

    static func format(_ c: DateComponents) -> String {
        String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    static func components(_ day: String) -> DateComponents {
        let p = day.split(separator: "-").compactMap { Int($0) }
        return DateComponents(year: p[0], month: p[1], day: p[2])
    }

    /// The local Monday of the instant's week.
    static func weekStart(for instant: Date, timeZone: TimeZone) -> String {
        let local = calendar(timeZone).dateComponents([.year, .month, .day], from: instant)
        let day = utc.date(from: local)!
        let sinceMonday = (utc.component(.weekday, from: day) + 5) % 7
        return format(utc.dateComponents([.year, .month, .day], from: utc.date(byAdding: .day, value: -sinceMonday, to: day)!))
    }

    static func addWeeks(_ weekStart: String, _ n: Int) -> String {
        let day = utc.date(from: components(weekStart))!
        return format(utc.dateComponents([.year, .month, .day], from: utc.date(byAdding: .day, value: 7 * n, to: day)!))
    }

    /// Local 00:00 of a civil date.
    static func localMidnight(_ day: String, _ timeZone: TimeZone) -> Date {
        calendar(timeZone).date(from: components(day))!
    }

    /// Local Monday 00:00 to the next local Monday 00:00 (exclusive).
    static func weekBounds(_ weekStart: String, _ timeZone: TimeZone) -> (start: Date, end: Date) {
        (localMidnight(weekStart, timeZone), localMidnight(addWeeks(weekStart, 1), timeZone))
    }
}

// MARK: - Weekly maths (progress.ts)

private func workoutSeconds(_ w: ProgressWorkout) -> Int {
    if let d = w.durationSeconds { return d }
    guard let started = w.startedAt else { return 0 }
    return max(0, Int((w.completedAt.timeIntervalSince(started)).rounded()))
}

private func weekEffort(_ efforts: [Double], _ workingSets: Int) -> WeekEffort? {
    if efforts.isEmpty || efforts.count * 2 < workingSets { return nil }
    let atOrAbove9 = Double(efforts.filter { $0 >= 9 }.count) / Double(efforts.count) * 100
    return WeekEffort(avgRpe: efforts.reduce(0, +) / Double(efforts.count),
                      pctAtOrAbove9: Int((atOrAbove9).rounded(.toNearestOrAwayFromZero)),
                      setsAt10: efforts.filter { $0 >= 10 }.count, ratedSets: efforts.count)
}

/// One entry per week start, in the order given; workouts outside every week are ignored.
func summarizeWeeks(_ workouts: [ProgressWorkout], weekStarts: [String], timeZone: TimeZone) -> [WeekStats] {
    var acc: [String: (workouts: Int, sets: Int, seconds: Int, efforts: [Double])] = [:]
    for w in weekStarts { acc[w] = (0, 0, 0, []) }
    for w in workouts {
        let key = Civil.weekStart(for: w.completedAt, timeZone: timeZone)
        guard var week = acc[key] else { continue }
        week.workouts += 1
        week.seconds += workoutSeconds(w)
        for s in w.sets where !s.isWarmup {
            week.sets += 1
            if let e = setEffort(rpe: s.rpe, rir: s.rir) { week.efforts.append(e) }
        }
        acc[key] = week
    }
    return weekStarts.map { w in
        let a = acc[w]!
        return WeekStats(weekStart: w, workouts: a.workouts, workingSets: a.sets, durationSeconds: a.seconds,
                         cardioMinutes: 0, effort: weekEffort(a.efforts, a.sets))
    }
}

func computeNormal(_ weeks: [WeekStats]) -> WeekNormal {
    func mean(_ pick: (WeekStats) -> Int) -> Double {
        weeks.isEmpty ? 0 : Double(weeks.reduce(0) { $0 + pick($1) }) / Double(weeks.count)
    }
    let rated = weeks.compactMap { $0.effort?.avgRpe }
    return WeekNormal(workouts: mean(\.workouts), workingSets: mean(\.workingSets), durationSeconds: mean(\.durationSeconds),
                      cardioMinutes: mean(\.cardioMinutes), avgRpe: rated.isEmpty ? nil : rated.reduce(0, +) / Double(rated.count))
}

/// Weeks in a row, ending at the newest, with at least `target` workouts (oldest to newest). An open
/// newest week adds to the streak when it hits the target and never breaks it when it doesn't.
func computeStreak(_ weekly: [Int], target: Int, openWeek: Bool) -> Int {
    var i = weekly.count - 1
    var streak = 0
    if openWeek && i >= 0 {
        if weekly[i] >= target { streak += 1 }
        i -= 1
    }
    while i >= 0 && weekly[i] >= target {
        streak += 1
        i -= 1
    }
    return streak
}

// MARK: - Records, lifts and trend (progress-records.ts)

private struct Lb {
    let completionId: String
    let completedAt: Date
    let lbs: Double
    let reps: Int
    let e1rm: Double?

    /// The e1RM when it can count toward a record: 12 reps or fewer.
    var prE1rm: Double? { reps <= maxPrReps ? e1rm : nil }
}

private struct ExerciseSets {
    let name: String
    var before: [Lb] = []
    var week: [Lb] = []
}

/// Working sets before the week end, per exercise (in first-seen order), split at the week start.
private func byExercise(_ history: [ProgressSet], _ start: Date, _ end: Date) -> [(String, ExerciseSets)] {
    var order: [String] = []
    var out: [String: ExerciseSets] = [:]
    for s in history where !s.isWarmup && s.completedAt < end {
        if out[s.exerciseDefinitionId] == nil {
            order.append(s.exerciseDefinitionId)
            out[s.exerciseDefinitionId] = ExerciseSets(name: s.name)
        }
        let lbs = toLbs(s.weight, s.weightUnit)
        let set = Lb(completionId: s.completionId, completedAt: s.completedAt, lbs: lbs, reps: s.reps,
                     e1rm: lbs > 0 ? epley(lbs, s.reps) : nil)
        if s.completedAt < start { out[s.exerciseDefinitionId]!.before.append(set) } else { out[s.exerciseDefinitionId]!.week.append(set) }
    }
    return order.map { ($0, out[$0]!) }
}

private func weighted(_ sets: [Lb]) -> [Lb] { sets.filter { $0.e1rm != nil } }
private func bodyweight(_ sets: [Lb]) -> [Lb] { sets.filter { $0.e1rm == nil } }

/// The heaviest set, more reps on a tie.
private func heaviestSet(_ sets: [Lb]) -> Lb? {
    sets.reduce(nil as Lb?) { top, s in
        guard let top else { return s }
        return s.lbs > top.lbs || (s.lbs == top.lbs && s.reps > top.reps) ? s : top
    }
}

private func recordFor(_ id: String, _ ex: ExerciseSets, _ unit: WeightUnit) -> WeekRecord? {
    if ex.before.isEmpty || ex.week.isEmpty { return nil }
    if let weekBest = best(ex.week, { $0.prE1rm }), let priorBest = best(ex.before, { $0.prE1rm }),
       let w = weekBest.e1rm, let p = priorBest.e1rm, w > p {
        return WeekRecord(exerciseDefinitionId: id, name: ex.name, kind: "e1rm", weight: fromLbs(weekBest.lbs, unit),
                          reps: weekBest.reps, e1rm: fromLbs(w, unit), previous: fromLbs(p, unit))
    }

    // The heaviest earlier weight at each rep count; a rep PR needs one to beat.
    var heaviest: [Int: Double] = [:]
    for s in weighted(ex.before) { heaviest[s.reps] = max(heaviest[s.reps] ?? 0, s.lbs) }
    let candidates = weighted(ex.week).filter { $0.reps <= maxPrReps && $0.lbs > (heaviest[$0.reps] ?? .infinity) }
    if let repPr = best(candidates, { $0.lbs / heaviest[$0.reps]! }), let e = repPr.e1rm {
        return WeekRecord(exerciseDefinitionId: id, name: ex.name, kind: "rep", weight: fromLbs(repPr.lbs, unit),
                          reps: repPr.reps, e1rm: fromLbs(e, unit), previous: fromLbs(heaviest[repPr.reps]!, unit))
    }

    if let weekReps = best(bodyweight(ex.week), { Double($0.reps) }), let priorReps = best(bodyweight(ex.before), { Double($0.reps) }),
       weekReps.reps > priorReps.reps {
        return WeekRecord(exerciseDefinitionId: id, name: ex.name, kind: "rep", weight: 0, reps: weekReps.reps, e1rm: nil,
                          previous: Double(priorReps.reps))
    }
    return nil
}

/// The records set in [start, end), at most one per exercise; e1RM PRs first, then by name.
func computeWeekRecords(_ history: [ProgressSet], start: Date, end: Date, unit: WeightUnit) -> [WeekRecord] {
    byExercise(history, start, end).compactMap { recordFor($0.0, $0.1, unit) }
        .sorted { a, b in a.kind == b.kind ? nameOrder(a.name, b.name) : a.kind == "e1rm" }
}

/// Each session's best e1RM from sets of 12 reps or fewer, oldest first.
private func sessionE1rms(_ sets: [Lb]) -> [(completedAt: Date, e1rm: Double)] {
    var order: [String] = []
    var sessions: [String: (completedAt: Date, e1rm: Double)] = [:]
    for s in sets {
        guard let e = s.prE1rm else { continue }
        if let session = sessions[s.completionId] {
            sessions[s.completionId] = (session.completedAt, max(session.e1rm, e))
        } else {
            order.append(s.completionId)
            sessions[s.completionId] = (s.completedAt, e)
        }
    }
    // A stable sort, like the web's.
    return order.map { sessions[$0]! }.enumerated()
        .sorted { $0.element.completedAt == $1.element.completedAt ? $0.offset < $1.offset : $0.element.completedAt < $1.element.completedAt }
        .map(\.element)
}

/// Every exercise with working sets in [start, end), most working sets first, then by name.
func computeWeekLifts(_ history: [ProgressSet], start: Date, end: Date, unit: WeightUnit) -> [WeekLift] {
    var lifts: [WeekLift] = []
    for (id, ex) in byExercise(history, start, end) where !ex.week.isEmpty {
        let top = best(ex.week, { $0.prE1rm }) ?? heaviestSet(weighted(ex.week)) ?? best(ex.week, { Double($0.reps) })!
        let sessions = sessionE1rms(ex.before + ex.week)
        let previous = sessions.last { $0.completedAt < start }
        let bestE1rm = sessions.map(\.e1rm).max()
        let lastBest = bestE1rm.flatMap { b in sessions.lastIndex { $0.e1rm >= b } }
        lifts.append(WeekLift(
            exerciseDefinitionId: id, name: ex.name, workingSets: ex.week.count,
            bestSet: WeightReps(weight: fromLbs(top.lbs, unit), reps: top.reps),
            e1rm: top.prE1rm.map { fromLbs($0, unit) },
            previousE1rm: previous.map { fromLbs($0.e1rm, unit) },
            bestE1rm: bestE1rm.map { fromLbs($0, unit) },
            sessionsBelowBest: lastBest.map { sessions.count - 1 - $0 } ?? 0))
    }
    return lifts.sorted { a, b in a.workingSets == b.workingSets ? nameOrder(a.name, b.name) : a.workingSets > b.workingSets }
}

/// The note under the 8-week chart; nil with fewer than 3 normal weeks.
func computeTrendNote(_ weeks: [WeekStats], normal: [WeekStats], openWeek: Bool) -> TrendNote? {
    if normal.count < minTrendWeeks || weeks.isEmpty { return nil }
    func rpe(_ i: Int) -> Double? { i >= 0 && i < weeks.count ? weeks[i].effort?.avgRpe : nil }
    let last = weeks.count - 1
    var from = last
    while from > 0, let a = rpe(from - 1), let b = rpe(from), a < b { from -= 1 }
    let rising = rpe(last) == nil ? 0 : last - from + 1

    let normalSets = normal.reduce(0) { $0 + $1.workingSets }
    let firstWeek = normal[0].weekStart
    let searched = weeks.filter { $0.weekStart >= firstWeek }.count
    var lightAgo: Int?
    var i = openWeek ? last - 1 : last
    while i >= 0 && weeks[i].weekStart >= firstWeek {
        if weeks[i].workingSets * 5 * normal.count <= normalSets * 3 {
            lightAgo = last - i
            break
        }
        i -= 1
    }
    let isRising = rising >= minRisingWeeks
    return TrendNote(effortRisingWeeks: isRising ? rising : 0, effortFrom: isRising ? rpe(from) : nil,
                     effortTo: isRising ? rpe(last) : nil, lastLightWeeksAgo: lightAgo, lightWeeksSearched: searched)
}

// MARK: - Pins (pinned-lifts.ts lastSets)

/// The best working set of the lift's latest completed session before `before`.
func lastSet(_ history: [ProgressSet], _ id: String, before: Date, unit: WeightUnit) -> LastSet? {
    let sets = history.filter { $0.exerciseDefinitionId == id && !$0.isWarmup && $0.completedAt < before }
    guard let latest = sets.max(by: { a, b in
        a.completedAt == b.completedAt ? a.completionId > b.completionId : a.completedAt < b.completedAt
    }) else { return nil }
    let rows = sets.filter { $0.completionId == latest.completionId }.map { s -> (lbs: Double, reps: Int, e1rm: Double?) in
        let lbs = toLbs(s.weight, s.weightUnit)
        return (lbs, s.reps, lbs <= 0 || s.reps > maxPrReps ? nil : epley(lbs, s.reps))
    }
    let r = rows.enumerated().sorted { x, y in
        let a = x.element, b = y.element
        let ae = a.e1rm ?? -.infinity, be = b.e1rm ?? -.infinity
        if ae != be { return ae > be }
        if a.lbs != b.lbs { return a.lbs > b.lbs }
        if a.reps != b.reps { return a.reps > b.reps }
        return x.offset < y.offset
    }[0].element
    return LastSet(weight: fromLbs(r.lbs, unit), reps: r.reps, e1rm: r.e1rm.map { fromLbs($0, unit) }, completedAt: latest.completedAt)
}

// MARK: - The weekly report (getWeeklyReport, as scripts/ios/progress-goldens.ts composes it)

func buildWeeklyReport(weekStart: String, workouts: [ProgressWorkout], history: [ProgressSet],
                       pins: [(id: String, name: String)], timeZone: TimeZone, now: Date, unit: WeightUnit,
                       target: Int) -> WeeklyReport {
    let weekStarts = (0...normalWeeks).map { Civil.addWeeks(weekStart, $0 - normalWeeks) }
    let (shownStart, rangeEnd) = Civil.weekBounds(weekStart, timeZone)
    let summary = summarizeWeeks(workouts, weekStarts: weekStarts, timeZone: timeZone)
    let prior = Array(summary.prefix(normalWeeks))
    let current = summary[normalWeeks]
    let firstWeek = workouts.map(\.completedAt).min().map { Civil.weekStart(for: $0, timeZone: timeZone) }
    let sinceFirst = firstWeek.map { f in prior.filter { $0.weekStart >= f } } ?? []

    // The streak runs over every week from the first workout's week.
    var allWeeks: [String] = []
    if let f = firstWeek {
        var w = f
        while w <= weekStart {
            allWeeks.append(w)
            w = Civil.addWeeks(w, 1)
        }
    }
    let counts = summarizeWeeks(workouts, weekStarts: allWeeks, timeZone: timeZone).map(\.workouts)
    let openWeek = now < rangeEnd

    let lifts = computeWeekLifts(history, start: shownStart, end: rangeEnd, unit: unit)
    let weeks = Array(summary.dropFirst())
    let doneIds = Set(history.filter { !$0.isWarmup && $0.completedAt >= shownStart && $0.completedAt < rangeEnd }
        .map(\.exerciseDefinitionId))
    let pinned = pins.map { pin -> PinnedLift in
        let lift = lifts.first { $0.exerciseDefinitionId == pin.id }
        let last = lift != nil || doneIds.contains(pin.id) ? nil : lastSet(history, pin.id, before: rangeEnd, unit: unit)
        return PinnedLift(exerciseDefinitionId: pin.id, name: pin.name, lift: lift, last: last)
    }
    return WeeklyReport(
        weekStart: weekStart, isCurrentWeek: Civil.weekStart(for: now, timeZone: timeZone) == weekStart, target: target,
        current: current, normal: computeNormal(sinceFirst), normalWeeks: sinceFirst.count,
        streak: computeStreak(counts, target: target, openWeek: openWeek), weeks: weeks, weightUnit: unit,
        records: computeWeekRecords(history, start: shownStart, end: rangeEnd, unit: unit), lifts: lifts,
        trend: computeTrendNote(weeks, normal: sinceFirst, openWeek: openWeek), pinned: pinned)
}

// MARK: - The lift page (lift-history.ts)

private let rangeDays: [ChartRange: Double] = [.threeMonths: 91, .sixMonths: 182, .oneYear: 365]

private func rangeStart(_ range: ChartRange, _ now: Date) -> Date {
    guard let days = rangeDays[range] else { return .distantPast }
    return now.addingTimeInterval(-days * 86_400)
}

private func heavier(_ a: WeightReps, _ b: WeightReps) -> Bool {
    a.weight > b.weight || (a.weight == b.weight && a.reps > b.reps)
}

/// One entry per session, newest first. `history` is one lift's working sets, oldest first.
func computeLiftSessions(_ history: [ProgressSet], unit: WeightUnit) -> [LiftSession] {
    var order: [String] = []
    var groups: [String: [ProgressSet]] = [:]
    for s in history where !s.isWarmup {
        if groups[s.completionId] == nil { order.append(s.completionId) }
        groups[s.completionId, default: []].append(s)
    }
    let sessions = order.map { id -> LiftSession in
        let sets = groups[id]!
        var e1rmLbs: Double?
        var top = sets[0]
        for s in sets {
            let lbs = toLbs(s.weight, s.weightUnit)
            if lbs > 0 && s.reps <= maxPrReps { e1rmLbs = max(e1rmLbs ?? 0, epley(lbs, s.reps)) }
            if heavier(WeightReps(weight: lbs, reps: s.reps), WeightReps(weight: toLbs(top.weight, top.weightUnit), reps: top.reps)) { top = s }
        }
        let efforts = sets.compactMap { setEffort(rpe: $0.rpe, rir: $0.rir) }
        return LiftSession(completionId: id, date: sets[0].completedAt,
                           sets: sets.map { WeightReps(weight: inUnit($0, unit), reps: $0.reps) },
                           e1rm: e1rmLbs.map { fromLbs($0, unit) }, topSet: WeightReps(weight: inUnit(top, unit), reps: top.reps),
                           avgRpe: efforts.isEmpty ? nil : efforts.reduce(0, +) / Double(efforts.count))
    }
    return sessions.enumerated()
        .sorted { $0.element.date == $1.element.date ? $0.offset < $1.offset : $0.element.date > $1.element.date }
        .map(\.element)
}

/// The heaviest working set at each rep count, ascending; the earliest keeps a tie.
/// Bodyweight: one entry, the most reps.
func computeRepRecords(_ history: [ProgressSet], unit: WeightUnit, weekStart: Date) -> [RepRecord] {
    let sets = history.filter { !$0.isWarmup }.enumerated()
        .sorted { $0.element.completedAt == $1.element.completedAt ? $0.offset < $1.offset : $0.element.completedAt < $1.element.completedAt }
        .map(\.element)
    guard !sets.isEmpty else { return [] }
    func record(_ s: ProgressSet) -> RepRecord {
        RepRecord(reps: s.reps, weight: inUnit(s, unit), date: s.completedAt, isNew: s.completedAt >= weekStart)
    }
    if sets.allSatisfy({ $0.weight == 0 }) {
        return [record(sets.reduce(sets[0]) { $1.reps > $0.reps ? $1 : $0 })]
    }
    var heaviest: [Int: ProgressSet] = [:]
    for s in sets where s.weight > 0 {
        if let held = heaviest[s.reps], toLbs(s.weight, s.weightUnit) <= toLbs(held.weight, held.weightUnit) { continue }
        heaviest[s.reps] = s
    }
    return heaviest.values.sorted { $0.reps < $1.reps }.map(record)
}

private func mostReps(_ s: LiftSession) -> Int { s.sets.map(\.reps).max() ?? 0 }

private func change(_ values: [Double]) -> Change? {
    guard values.count >= 2, let first = values.first, let last = values.last, first != 0 else { return nil }
    return Change(first: first, last: last, percent: (last - first) / first * 100)
}

/// The chart for a range: one point per session at 3M and 6M, one per local week at 1Y and All.
func chartSeries(_ sessions: [LiftSession], range: ChartRange, now: Date, timeZone: TimeZone) -> ChartSeries {
    let oldestFirst = sessions.enumerated()
        .sorted { $0.element.date == $1.element.date ? $0.offset < $1.offset : $0.element.date < $1.element.date }
        .map(\.element)
    let from = rangeStart(range, now)
    let inRange = oldestFirst.filter { $0.date >= from }

    var bestIndex: Int?
    var heaviestIndex: Int?
    var most: MostReps?
    for (i, s) in oldestFirst.enumerated() {
        if let e = s.e1rm, bestIndex.flatMap({ oldestFirst[$0].e1rm }).map({ e > $0 }) ?? true { bestIndex = i }
        if heaviestIndex == nil || heavier(s.topSet, oldestFirst[heaviestIndex!].topSet) { heaviestIndex = i }
        let reps = mostReps(s)
        if most == nil || reps > most!.reps { most = MostReps(reps: reps, date: s.date) }
    }
    let bestSession = bestIndex.map { oldestFirst[$0] }

    let groups: [[LiftSession]]
    if range == .threeMonths || range == .sixMonths {
        groups = inRange.map { [$0] }
    } else {
        var order: [String] = []
        var weeks: [String: [LiftSession]] = [:]
        for s in inRange {
            let w = Civil.weekStart(for: s.date, timeZone: timeZone)
            if weeks[w] == nil { order.append(w) }
            weeks[w, default: []].append(s)
        }
        groups = order.map { weeks[$0]! }
    }
    let points = groups.map { group -> ChartPoint in
        let withE1rm = group.filter { $0.e1rm != nil }
        let lead = withE1rm.isEmpty
            ? group.reduce(group[0]) { mostReps($1) > mostReps($0) ? $1 : $0 }
            : withE1rm.reduce(withE1rm[0]) { $1.e1rm! > $0.e1rm! ? $1 : $0 }
        return ChartPoint(date: lead.date, e1rm: withE1rm.isEmpty ? nil : lead.e1rm,
                          topSet: group.map(\.topSet).reduce(group[0].topSet) { heavier($1, $0) ? $1 : $0 },
                          reps: group.map(mostReps).max() ?? 0,
                          isPr: bestSession.map { b in group.contains { $0.completionId == b.completionId } } ?? false)
    }
    return ChartSeries(
        points: points,
        change: ChartChange(e1rm: change(points.compactMap(\.e1rm)),
                            topSet: change(points.map(\.topSet.weight).filter { $0 > 0 }),
                            reps: change(points.map { Double($0.reps) })),
        best: bestSession.map { BestE1rm(e1rm: $0.e1rm!, date: $0.date) },
        heaviest: heaviestIndex.map { let s = oldestFirst[$0]; return HeaviestSet(weight: s.topSet.weight, reps: s.topSet.reps, date: s.date) },
        mostReps: most, sessions: inRange.count, since: inRange.first?.date)
}

/// Working sets per local week, oldest first, empty weeks as 0, from the lift's first week to now's.
func weeklySets(_ history: [ProgressSet], now: Date, timeZone: TimeZone) -> [WeekSets] {
    let sets = history.filter { !$0.isWarmup }
    guard !sets.isEmpty else { return [] }
    var counts: [String: Int] = [:]
    for s in sets { counts[Civil.weekStart(for: s.completedAt, timeZone: timeZone), default: 0] += 1 }
    let last = Civil.weekStart(for: now, timeZone: timeZone)
    var out: [WeekSets] = []
    var week = counts.keys.min()!
    while week <= last {
        out.append(WeekSets(weekStart: week, sets: counts[week] ?? 0))
        week = Civil.addWeeks(week, 1)
    }
    return out
}
