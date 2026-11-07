// Progress (slice 4, work item 168): the web's report card, records, lifts, pinned lifts and the
// last 8 weeks, from RipitCore's weeklyReport. Wording and rounding follow
// components/features/progress (ProgressView, RecordsLifts, rows, format.ts).

import Charts
import RipitCore
import SwiftUI

/// Display settings for Progress until a settings slice exists.
enum ProgressSettings {
    static let unitKey = "progressUnit"
    static let targetKey = "weeklyWorkoutTarget"
}

struct ProgressTabView: View {
    @Environment(WorkoutStore.self) private var store
    @Binding var path: [String]
    @AppStorage(ProgressSettings.unitKey) private var unitRaw = WeightUnit.lbs.rawValue
    @AppStorage(ProgressSettings.targetKey) private var target = 3
    @State private var weekStart: String?
    @State private var report: WeeklyReport?
    @State private var showingSettings = false
    @State private var pinning = false

    private var unit: WeightUnit { WeightUnit(rawValue: unitRaw) ?? .lbs }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(alignment: .firstTextBaseline) {
                    Text("PROGRESS")
                        .font(.system(size: 40, weight: .black))
                        .tracking(2)
                        .foregroundStyle(Theme.foreground)
                    Spacer()
                    Button { showingSettings = true } label: {
                        Image(systemName: "slider.horizontal.3").frame(width: Theme.touch, height: Theme.touch)
                    }
                    .accessibilityLabel("Progress settings")
                }
                if let report {
                    weekSwitcher(report)
                    ReportCard(report: report)
                    recordsBlock(report)
                    pinnedBlock(report)
                    liftsBlock(report)
                    lastEightWeeks(report)
                }
            }
            .padding(16)
        }
        .background(Theme.background)
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: String.self) { LiftPageView(exerciseDefinitionId: $0) }
        .onAppear(perform: load)
        .onChange(of: unitRaw) { load() }
        // Any write (a logged set, an import, a pin) re-reads the report while it is on screen.
        .onChange(of: store.revision) { load() }
        .onChange(of: target) { load() }
        .onChange(of: weekStart) { load() }
        .sheet(isPresented: $showingSettings) { ProgressSettingsSheet().presentationDetents([.medium]) }
        .sheet(isPresented: $pinning, onDismiss: load) {
            NavigationStack {
                ExercisePickerView { id in
                    store.pinLift(id)
                    pinning = false
                }
            }
            .environment(store)
        }
    }

    private func load() {
        let week = weekStart ?? store.thisWeekStart
        report = store.weeklyReport(weekStart: week, unit: unit, target: target)
        if DebugHooks.flag("demoLiftPage"), path.isEmpty, let first = report?.lifts.first {
            path = [first.exerciseDefinitionId]
        }
    }

    // MARK: Week

    private func weekSwitcher(_ report: WeeklyReport) -> some View {
        HStack {
            Button { weekStart = store.addWeeks(report.weekStart, -1) } label: {
                Image(systemName: "chevron.left").frame(width: Theme.touch, height: Theme.touch)
            }
            .accessibilityLabel("Previous week")
            Spacer()
            Text(report.isCurrentWeek ? "This week" : "Week of \(Format.civilDay(report.weekStart))")
                .font(.headline)
                .foregroundStyle(Theme.foreground)
            Spacer()
            Button { weekStart = store.addWeeks(report.weekStart, 1) } label: {
                Image(systemName: "chevron.right").frame(width: Theme.touch, height: Theme.touch)
            }
            .disabled(report.isCurrentWeek)
            .accessibilityLabel("Next week")
        }
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))
    }

    // MARK: Records, pins, lifts

    private func recordsBlock(_ report: WeeklyReport) -> some View {
        FolderBlock(title: "Records", tone: .superset) {
            if report.records.isEmpty {
                EmptyRow("No records this week")
            } else {
                ForEach(Array(report.records.enumerated()), id: \.element.exerciseDefinitionId) { i, r in
                    if i > 0 { RowDivider() }
                    ProgressRow(name: r.name, detail: Words.record(r, report.weightUnit)) {
                        Chip(r.kind == "e1rm" ? "PR" : "Rep PR", fill: Theme.accent, text: Color(hex: 0x1A1108))
                    }
                }
            }
        }
    }

    private func pinnedBlock(_ report: WeeklyReport) -> some View {
        FolderBlock(title: "Pinned lifts", trailing: {
            Button { pinning = true } label: { Label("Pin", systemImage: "pin") }
                .font(.subheadline.weight(.semibold))
                .frame(minHeight: Theme.touch)
        }) {
            if report.pinned.isEmpty {
                EmptyRow("Pin the lifts you want to watch. Open a lift and tap the pin, or use Pin.")
            } else {
                ForEach(Array(report.pinned.enumerated()), id: \.element.exerciseDefinitionId) { i, pin in
                    if i > 0 { RowDivider() }
                    NavigationLink(value: pin.exerciseDefinitionId) {
                        if let lift = pin.lift {
                            LiftRow(lift: lift)
                        } else {
                            ProgressRow(name: pin.name, detail: Words.last(pin.last)) { EmptyView() }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func liftsBlock(_ report: WeeklyReport) -> some View {
        FolderBlock(title: "Lifts") {
            if report.lifts.isEmpty {
                EmptyRow("No lifts this week")
            } else {
                ForEach(Array(report.lifts.enumerated()), id: \.element.exerciseDefinitionId) { i, lift in
                    if i > 0 { RowDivider() }
                    NavigationLink(value: lift.exerciseDefinitionId) { LiftRow(lift: lift) }
                        .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: Last 8 weeks

    private func lastEightWeeks(_ report: WeeklyReport) -> some View {
        FolderBlock(title: "Last 8 weeks") {
            VStack(alignment: .leading, spacing: 12) {
                Chart(report.weeks, id: \.weekStart) { week in
                    BarMark(x: .value("Week", Format.civilDay(week.weekStart, short: true)),
                            y: .value("Working sets", week.workingSets))
                        .foregroundStyle(week.weekStart == report.weekStart ? Theme.primary : Theme.secondary.opacity(0.7))
                }
                .chartYAxis { AxisMarks(position: .leading) }
                .frame(height: 160)
                .accessibilityLabel("Working sets per week")
                if let trend = report.trend {
                    Text(Words.trend(trend))
                        .font(.subheadline)
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
            .padding(16)
        }
    }
}

// MARK: - Report card

private struct ReportCard: View {
    let report: WeeklyReport

    var body: some View {
        let current = report.current, normal = report.normal
        let hasNormal = report.normalWeeks != 0
        FolderBlock(title: "Report card", tone: .active) {
            CardRow(label: "Workouts", value: "\(current.workouts) of \(report.target)") {
                if current.workouts >= report.target { Chip("Done", fill: Theme.primary, text: .white) }
                Muted(hasNormal && normal.workouts > 0 ? "normal \(WebRounding.toFixed(normal.workouts, 1))" : "–")
            }
            RowDivider()
            CardRow(label: "Working sets", value: "\(current.workingSets)") {
                if let change = hasNormal ? Words.percentChange(Double(current.workingSets), normal.workingSets) : nil {
                    Text(Words.signed(Double(change)) { "\(Int($0))%" })
                        .font(.subheadline.bold())
                        .foregroundStyle(change > 0 ? Theme.primary : Theme.foreground)
                    Muted("normal \(WebRounding.round(normal.workingSets))")
                } else {
                    Muted("–")
                }
            }
            RowDivider()
            CardRow(label: "Time trained", value: Words.minutes(Double(current.durationSeconds) / 60)) {
                if hasNormal && normal.durationSeconds > 0 {
                    let change = (Double(current.durationSeconds) - normal.durationSeconds) / 60
                    Text(Words.signed(change, Words.minutes))
                        .font(.subheadline.bold())
                        .foregroundStyle(WebRounding.round(change) > 0 ? Theme.primary : Theme.foreground)
                } else {
                    Muted("–")
                }
            }
            RowDivider()
            CardRow(label: "Effort", value: current.effort.map { "RPE \(Words.rpe($0.avgRpe))" } ?? "–",
                    detail: current.effort.map { "\($0.pctAtOrAbove9)% of sets at 9+ · \(Words.plural($0.setsAt10, "set")) at 10" }
                        ?? (current.workingSets > 0 ? "Effort isn't tracked enough this week" : nil)) {
                if let effort = current.effort {
                    if hasNormal, let n = normal.avgRpe {
                        Text(Words.signed(effort.avgRpe - n) { WebRounding.toFixed($0, 1) })
                            .font(.subheadline.bold())
                            .foregroundStyle(Theme.foreground)
                        Muted("normal \(Words.rpe(n))")
                    } else {
                        Muted("–")
                    }
                }
            }
            RowDivider()
            CardRow(label: "Streak", value: Words.plural(report.streak, "week")) {
                if report.streak > 0 {
                    HStack(spacing: 3) {
                        ForEach(0..<8, id: \.self) { i in
                            Rectangle()
                                .fill(i < min(report.streak, 8) ? Theme.primary : Theme.muted)
                                .frame(width: 10, height: 14)
                                .overlay(Rectangle().stroke(i < min(report.streak, 8) ? Theme.primary : Theme.border))
                        }
                    }
                    .accessibilityHidden(true)
                }
            }
        }
    }
}

private struct CardRow<Aside: View>: View {
    let label: String
    let value: String
    var detail: String?
    @ViewBuilder var aside: () -> Aside
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        // At accessibility sizes the aside goes under the value, so the label keeps the full width.
        let stacked = typeSize.isAccessibilitySize
        let layout = stacked ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6)) : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
        layout {
            VStack(alignment: .leading, spacing: 2) {
                // Whole words only: shrink a long label rather than break it mid-word.
                Text(label.uppercased()).font(.caption.bold()).tracking(1).foregroundStyle(Theme.mutedForeground)
                    .lineLimit(1).minimumScaleFactor(0.5)
                Text(value).font(.title2.bold().monospacedDigit()).foregroundStyle(Theme.foreground)
                if let detail { Text(detail).font(.subheadline).foregroundStyle(Theme.mutedForeground) }
            }
            if !stacked { Spacer(minLength: 8) }
            VStack(alignment: stacked ? .leading : .trailing, spacing: 2, content: aside)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .frame(minHeight: 56)
    }
}

// MARK: - Rows

/// A lift done in the week: its best set and e1RM, the change since the last session, and "Flat".
struct LiftRow: View {
    let lift: WeekLift

    var body: some View {
        let flat = lift.sessionsBelowBest >= 3 && lift.bestE1rm != nil
        let change = lift.e1rm.flatMap { e in lift.previousE1rm.map { e - $0 } }
        ProgressRow(name: lift.name, detail: Words.lift(lift)) {
            HStack(spacing: 8) {
                if flat { Chip("Flat", fill: Theme.muted, text: Theme.mutedForeground) }
                if let change {
                    Text(Words.signed(change) { "\(WebRounding.round($0))" })
                        .font(.subheadline.bold())
                        .foregroundStyle(WebRounding.round(change) > 0 ? Theme.primary : Theme.foreground)
                        .accessibilityLabel("e1RM change since the last session")
                }
            }
        }
    }
}

struct ProgressRow<Aside: View>: View {
    let name: String
    let detail: String
    @ViewBuilder var aside: () -> Aside

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(name).font(.headline).foregroundStyle(Theme.foreground)
                Text(detail).font(.subheadline.monospacedDigit()).foregroundStyle(Theme.mutedForeground)
            }
            Spacer(minLength: 8)
            aside()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .frame(minHeight: 56)
        .contentShape(Rectangle())
    }
}

struct Chip: View {
    let text: String
    let fill: Color
    let textColor: Color

    init(_ text: String, fill: Color, text textColor: Color) {
        self.text = text
        self.fill = fill
        self.textColor = textColor
    }

    var body: some View {
        Text(text.uppercased())
            .font(.caption.bold())
            .tracking(1)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(fill)
            .foregroundStyle(textColor)
    }
}

struct EmptyRow: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text).font(.subheadline).foregroundStyle(Theme.mutedForeground).padding(16)
    }
}

private struct Muted: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View { Text(text).font(.subheadline).foregroundStyle(Theme.mutedForeground) }
}

// MARK: - Settings

private struct ProgressSettingsSheet: View {
    @AppStorage(ProgressSettings.unitKey) private var unitRaw = WeightUnit.lbs.rawValue
    @AppStorage(ProgressSettings.targetKey) private var target = 3
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Show weights in") {
                    Picker("Unit", selection: $unitRaw) {
                        Text("lbs").tag(WeightUnit.lbs.rawValue)
                        Text("kg").tag(WeightUnit.kg.rawValue)
                    }
                    .pickerStyle(.segmented)
                }
                Section {
                    Stepper("\(Words.plural(target, "workout")) a week", value: $target, in: 1...14)
                } header: {
                    Text("Weekly target")
                } footer: {
                    Text("The report card and streak count weeks that reach it.")
                }
            }
            .navigationTitle("Progress settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}

// MARK: - Wording (components/features/progress/format.ts, rows.tsx, RecordsLifts.tsx)

enum Words {
    static let minus = "\u{2212}"

    /// At most one decimal, no trailing ".0": 275, 102.5.
    static func weight(_ w: Double) -> String {
        WebRounding.oneDecimal(w)
    }

    static func unitLabel(_ unit: WeightUnit) -> String { unit == .kg ? "kg" : "lb" }

    static func rpe(_ rpe: Double?) -> String {
        rpe.map { WebRounding.toFixed($0, 1) } ?? "–"
    }

    static func minutes(_ total: Double) -> String {
        let m = WebRounding.round(abs(total))
        return m < 60 ? "\(m)m" : "\(m / 60)h \(m % 60)m"
    }

    static func signed(_ value: Double, _ text: (Double) -> String) -> String {
        let body = text(abs(value))
        if body == text(0) { return body }
        return (value > 0 ? "+" : minus) + body
    }

    static func percentChange(_ value: Double, _ normal: Double?) -> Int? {
        guard let normal, normal != 0 else { return nil }
        return WebRounding.round((value - normal) / normal * 100)
    }

    static func plural(_ n: Int, _ noun: String) -> String { "\(n) \(noun)\(n == 1 ? "" : "s")" }

    static func ordinal(_ n: Int) -> String {
        let teen = (11...13).contains(n % 100)
        let suffix = teen ? "th" : [1: "st", 2: "nd", 3: "rd"][n % 10] ?? "th"
        return "\(n)\(suffix)"
    }

    /// "115×5", or "12 reps" for bodyweight.
    static func set(_ weight: Double, _ reps: Int) -> String {
        weight == 0 ? "\(reps) reps" : "\(Words.weight(weight))×\(reps)"
    }

    static func record(_ r: WeekRecord, _ unit: WeightUnit) -> String {
        if r.weight == 0 { return "\(r.reps) reps (was \(Int(r.previous)))" }
        let set = "\(weight(r.weight))×\(r.reps)"
        if r.kind == "e1rm" {
            return "\(set) · e1RM \(WebRounding.round(r.e1rm ?? 0)) \(unitLabel(unit)) (was \(WebRounding.round(r.previous)))"
        }
        return "\(set) · best \(r.reps)-rep set (was \(weight(r.previous)))"
    }

    static func lift(_ l: WeekLift) -> String {
        let s = set(l.bestSet.weight, l.bestSet.reps)
        var parts = [l.e1rm.map { "\(s) · e1RM \(WebRounding.round($0))" } ?? s]
        if l.sessionsBelowBest >= 3, let best = l.bestE1rm {
            parts.append("\(ordinal(l.sessionsBelowBest)) session below \(WebRounding.round(best))")
        }
        return parts.joined(separator: ", ")
    }

    static func last(_ last: LastSet?) -> String {
        guard let last else { return "Not done yet" }
        let s = set(last.weight, last.reps)
        return "Last \(Format.day(last.completedAt)): " + (last.e1rm.map { "\(s) · e1RM \(WebRounding.round($0))" } ?? s)
    }

    static func trend(_ t: TrendNote) -> String {
        let effort = t.effortRisingWeeks > 0
            ? "Effort has risen \(t.effortRisingWeeks) weeks running (\(rpe(t.effortFrom)) → \(rpe(t.effortTo))). "
            : ""
        let light: String
        switch t.lastLightWeeksAgo {
        case nil: light = t.lightWeeksSearched < 8 ? "No light week since you started." : "No light week in the last 8 weeks."
        case 0: light = "This was a light week."
        case let ago?: light = "Your last light week was \(plural(ago, "week")) ago."
        }
        return effort + light
    }
}

extension Format {
    /// A Monday 'YYYY-MM-DD' as "Nov 2" (or "11/2" short).
    static func civilDay(_ day: String, short: Bool = false) -> String {
        let p = day.split(separator: "-").compactMap { Int($0) }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = .current
        guard p.count == 3, let date = cal.date(from: DateComponents(year: p[0], month: p[1], day: p[2])) else { return day }
        return short ? date.formatted(.dateTime.month(.defaultDigits).day()) : date.formatted(.dateTime.month(.abbreviated).day())
    }
}
