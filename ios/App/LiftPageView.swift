// One lift's page (slice 4): a chart for 3M / 6M / 1Y / All, the change over the range, all-time
// bests, rep records and sessions, like the web's /progress/lift/[id] (LiftView, LiftChart).

import Charts
import RipitCore
import SwiftUI

struct LiftPageView: View {
    @Environment(WorkoutStore.self) private var store
    let exerciseDefinitionId: String
    @AppStorage(ProgressSettings.unitKey) private var unitRaw = WeightUnit.lbs.rawValue
    @State private var range: ChartRange = .threeMonths
    @State private var history: LiftHistory?
    @State private var chart: ChartSeries?
    @State private var pinned = false
    @State private var loaded = false

    private var unit: WeightUnit { WeightUnit(rawValue: unitRaw) ?? .lbs }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if let history {
                    Text(history.name.uppercased())
                        .font(.system(size: 28, weight: .black))
                        .foregroundStyle(Theme.foreground)
                    if history.sessions.isEmpty {
                        EmptyRow("No sessions yet")
                    } else {
                        chartBlock(history)
                        recordsBlock(history)
                        sessionsBlock(history)
                    }
                } else if loaded {
                    EmptyRow("Lift not found")
                }
            }
            .padding(16)
        }
        .background(Theme.background)
        .navigationTitle("Lift")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    pinned ? store.unpinLift(exerciseDefinitionId) : store.pinLift(exerciseDefinitionId)
                    pinned = store.isPinned(exerciseDefinitionId)
                } label: {
                    Image(systemName: pinned ? "pin.fill" : "pin")
                        .frame(minWidth: Theme.touch, minHeight: Theme.touch)
                }
                .accessibilityLabel(pinned ? "Unpin from Progress" : "Pin to Progress")
            }
        }
        .onAppear(perform: load)
        .onChange(of: range) { chart = store.liftChart(exerciseDefinitionId, range: range, unit: unit) }
    }

    private func load() {
        history = store.liftHistory(exerciseDefinitionId, unit: unit)
        chart = store.liftChart(exerciseDefinitionId, range: range, unit: unit)
        pinned = store.isPinned(exerciseDefinitionId)
        loaded = true
    }

    // MARK: Chart

    private func chartBlock(_ history: LiftHistory) -> some View {
        FolderBlock(title: history.isBodyweight ? "Reps" : "e1RM", tone: .active) {
            VStack(alignment: .leading, spacing: 12) {
                Picker("Range", selection: $range) {
                    ForEach(ChartRange.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)

                if let chart, !chart.points.isEmpty {
                    let value: (ChartPoint) -> Double = { history.isBodyweight ? Double($0.reps) : ($0.e1rm ?? $0.topSet.weight) }
                    Chart(Array(chart.points.enumerated()), id: \.offset) { _, point in
                        LineMark(x: .value("Date", point.date), y: .value("Value", value(point)))
                            .foregroundStyle(Theme.primary)
                            .interpolationMethod(.monotone)
                        PointMark(x: .value("Date", point.date), y: .value("Value", value(point)))
                            .foregroundStyle(point.isPr ? Theme.accent : Theme.primary)
                            .symbolSize(point.isPr ? 120 : 40)
                    }
                    .chartYScale(domain: .automatic(includesZero: false))
                    .frame(height: 200)
                    .accessibilityLabel(history.isBodyweight ? "Most reps per session" : "Estimated one-rep max over time")

                    Text(summary(chart, history))
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(Theme.mutedForeground)
                } else {
                    Text("No sessions in this range").font(.subheadline).foregroundStyle(Theme.mutedForeground)
                }
            }
            .padding(16)
        }
    }

    /// The range's change and the all-time best, e.g. "+12 lb (+5.1%) since Aug 3 · 9 sessions. Best e1RM 262."
    private func summary(_ chart: ChartSeries, _ history: LiftHistory) -> String {
        var parts: [String] = []
        let change = history.isBodyweight ? chart.change.reps : chart.change.e1rm
        if let change {
            let amount = Words.signed(change.last - change.first) { Words.weight($0) }
            let pct = Words.signed(change.percent) { $0.formatted(.number.precision(.fractionLength(1))) + "%" }
            parts.append("\(amount)\(history.isBodyweight ? " reps" : " \(Words.unitLabel(unit))") (\(pct))")
        }
        if let since = chart.since { parts.append("since \(Format.day(since)) · \(Words.plural(chart.sessions, "session"))") }
        var text = parts.joined(separator: " ")
        if history.isBodyweight, let most = chart.mostReps {
            text += (text.isEmpty ? "" : ". ") + "Most reps \(most.reps)."
        } else if let best = chart.best {
            text += (text.isEmpty ? "" : ". ") + "Best e1RM \(Int(best.e1rm.rounded())) on \(Format.day(best.date))."
        }
        return text
    }

    // MARK: Records and sessions

    private func recordsBlock(_ history: LiftHistory) -> some View {
        FolderBlock(title: "Records", tone: .superset) {
            ForEach(Array(history.records.enumerated()), id: \.offset) { i, r in
                if i > 0 { RowDivider() }
                ProgressRow(name: history.isBodyweight ? "Most reps" : "\(Words.plural(r.reps, "rep"))",
                            detail: "\(Words.set(r.weight, r.reps)) · \(Format.day(r.date))") {
                    if r.isNew { Chip("New", fill: Theme.accent, text: Color(hex: 0x1A1108)) }
                }
            }
        }
    }

    private func sessionsBlock(_ history: LiftHistory) -> some View {
        FolderBlock(title: "Sessions") {
            ForEach(Array(history.sessions.prefix(20).enumerated()), id: \.element.completionId) { i, s in
                if i > 0 { RowDivider() }
                ProgressRow(name: Format.day(s.date),
                            detail: s.sets.map { Words.set($0.weight, $0.reps) }.joined(separator: ", ")) {
                    VStack(alignment: .trailing, spacing: 2) {
                        if let e = s.e1rm { Text("e1RM \(Int(e.rounded()))").font(.subheadline.bold()).foregroundStyle(Theme.foreground) }
                        if let rpe = s.avgRpe { Text("RPE \(Words.rpe(rpe))").font(.caption).foregroundStyle(Theme.mutedForeground) }
                    }
                }
            }
        }
    }
}
