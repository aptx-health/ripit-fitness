// One exercise in the logger (slice 9b; web ExerciseDisplayTabs.tsx, SetLoggingForm.tsx, SetList.tsx):
// Log / Info / Notes / History paper tabs over a box whose panel scrolls on its own. The Log panel holds
// Last time and the sets with the rest stopwatch at the top, and the reps stepper, weight and effort and the
// warm-up toggle at the bottom, by the thumb and the bar (Dustin 2026-11-11; the web keeps them at the top).
// An open keypad takes the place of the inputs and sets, also at the bottom. After the planned sets the
// inputs give way to "All planned sets logged" until + Extra set. Logging itself is the bottom bar's (WorkoutView).

import RipitCore
import SwiftUI

/// The values for the next set of one exercise, or for the logged set being changed.
struct EntryForm: Equatable {
    var reps = ""
    var weight = ""
    /// nil: the set before it in this exercise, else Settings' default.
    var unit: String?
    /// On the current scale (Settings).
    var effort: Int?
    var warmup = false
    /// A logged set being changed in place.
    var editingSet: String?
}

enum LoggerTab: String, Hashable {
    case log = "Log", info = "Info", notes = "Notes", history = "History"

    var icon: String {
        switch self {
        case .log: "checklist"
        case .info: "info.circle"
        case .notes: "note.text"
        case .history: "clock.arrow.circlepath"
        }
    }
}

struct LoggerPanel: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(SettingsModel.self) private var settings
    @Environment(\.dynamicTypeSize) private var typeSize
    let exercise: ExerciseDetail
    let planned: [ProgramSetDetail]
    let unit: String
    @Binding var form: EntryForm
    @Binding var pad: OpenPad?
    @Binding var tab: LoggerTab
    /// "+ Extra set" was tapped: the inputs come back after the planned sets.
    let extraSet: Bool
    /// The rest stopwatch was closed at this many sets; it comes back with the next set.
    @Binding var restClosedAt: Int?

    var body: some View {
        let notes = store.exerciseNotes(exerciseId: exercise.id)
        let historyCount = store.exerciseHistory(definitionId: exercise.definitionId).count
        let tabs: [LoggerTab] = [.log, .info] + (notes == nil ? [] : [.notes]) + [.history]
        VStack(alignment: .leading, spacing: 0) {
            tabRow(tabs, historyCount: historyCount)
            // The Log inputs (or a keypad) are pinned under the part that scrolls, so they stay by the thumb.
            // At the accessibility sizes they would leave no room, so they scroll with the rest, still last.
            let pinned = tab == .log && !typeSize.isAccessibilitySize
            VStack(spacing: 0) {
                GeometryReader { box in
                    ScrollViewReader { reader in
                        ScrollView {
                            VStack(alignment: .leading, spacing: 16) {
                                title
                                switch tab {
                                case .log:
                                    logTop
                                    if !pinned {
                                        Spacer(minLength: 0)
                                        logBottom
                                    }
                                case .info: InfoContent(definitionId: exercise.definitionId)
                                case .notes: Text(notes ?? "").foregroundStyle(Theme.foreground)
                                case .history: HistoryContent(definitionId: exercise.definitionId)
                                }
                            }
                            // At least the panel's height, so unpinned inputs still sit at its bottom.
                            .frame(maxWidth: .infinity, minHeight: max(box.size.height - 32, 0), alignment: .topLeading)
                            .padding(16)
                        }
                        .scrollBounceBehavior(.basedOnSize)
                        // At the accessibility sizes the banner is last; the last Log set leaves it out of view.
                        .onChange(of: allPlannedLogged) {
                            if allPlannedLogged && !pinned { withAnimation { reader.scrollTo(Self.bannerId, anchor: .bottom) } }
                        }
                    }
                }
                if pinned {
                    VStack(alignment: .leading, spacing: 16) { logBottom }
                        .padding([.horizontal, .bottom], 16)
                        .padding(.top, 8)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.card)
            .overlay(Rectangle().strokeBorder(Theme.edge(Theme.secondary), lineWidth: Theme.folderLine))
        }
        .onChange(of: notes == nil) { if notes == nil && tab == .notes { tab = .log } }
    }

    // MARK: Tabs and title

    private func tabRow(_ tabs: [LoggerTab], historyCount: Int) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .bottom, spacing: -10) {
                ForEach(tabs, id: \.self) { t in
                    Button { tab = t } label: {
                        FolderTab(title: t == .history && historyCount > 0 ? "\(t.rawValue) \(historyCount)" : t.rawValue,
                                  icon: t.icon, tone: .exercise, selected: t == tab)
                            .frame(minHeight: 44, alignment: .bottom)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .zIndex(t == tab ? 1 : 0)
                    .accessibilityLabel(t == .history ? "History, \(historyCount) workouts" : t.rawValue)
                    .accessibilityAddTraits(t == tab ? [.isSelected] : [])
                }
            }
        }
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
        // One row at every text size, so the panel keeps its height; a long press shows the label large.
        .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    }

    /// The planned working sets are all logged and no extra set was asked for (ExerciseLoggingModal.tsx).
    private var allPlannedLogged: Bool {
        let working = planned.filter { !$0.isWarmup }.count
        return working > 0 && exercise.sets.filter { !$0.isWarmup }.count >= working && !extraSet && form.editingSet == nil
    }

    /// The name, "SET 2 OF 4" (or "4 OF 4 DONE"), the superset badge and the next planned set.
    private var title: some View {
        let working = planned.filter { !$0.isWarmup }
        let next = exercise.sets.filter { !$0.isWarmup }.count + 1
        let setText = allPlannedLogged ? "\(working.count) OF \(working.count) DONE"
            : working.isEmpty || next > working.count ? "SET \(exercise.sets.count + 1)" : "SET \(next) OF \(working.count)"
        let nextPlanned = planned.first { $0.setNumber > exercise.sets.count }
        return VStack(alignment: .leading, spacing: 6) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline) {
                    name
                    Spacer(minLength: 8)
                    setLabel(setText)
                }
                VStack(alignment: .leading, spacing: 4) {
                    name
                    setLabel(setText)
                }
            }
            if let badge = try? LoggerRules.supersetBadge(exercise.group) {
                Text(badge.uppercased())
                    .font(.ripit(.caption, .bold)).tracking(1)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Theme.accent)
                    .foregroundStyle(Theme.accentForeground)
            }
            if tab == .log, !allPlannedLogged, let nextPlanned {
                Text("Prescribed: \(Text(PlanFormat.label(nextPlanned)).foregroundStyle(Theme.foreground))")
                    .font(.ripit(.subheadline))
                    .foregroundStyle(Theme.mutedForeground)
            }
        }
    }

    private var name: some View {
        Text(exercise.name.uppercased())
            .font(.ripit(.title3, .bold)).display(1.5)
            .foregroundStyle(Theme.foreground)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
    }

    private func setLabel(_ text: String) -> some View {
        Text(text).font(.ripit(.subheadline, .bold)).display(1.2).foregroundStyle(Theme.mutedForeground)
    }

    // MARK: Log

    /// Last time, "All planned sets logged" and the sets; nothing while a keypad is open.
    @ViewBuilder private var logTop: some View {
        if pad == nil {
            if form.editingSet == nil, let last = store.lastTime(definitionId: exercise.definitionId) {
                LastTimeLine(last: last, fill: use)
            }
            if allPlannedLogged && !typeSize.isAccessibilitySize {
                allLoggedBanner
            }
            setList
        }
    }

    /// The inputs, or the open keypad in their place; none after the planned sets. At the accessibility sizes
    /// the banner takes the inputs' place: the panel stays scrolled to its end, so one above would be out of view.
    @ViewBuilder private var logBottom: some View {
        switch pad {
        case .reps(let keypad):
            NumberPadView(pad: Binding(get: { keypad }, set: { pad = .reps($0) }), title: "Reps", unit: nil,
                          cancel: { pad = nil }, done: { form.reps = $0; pad = nil })
        case .weight(let keypad):
            NumberPadView(pad: Binding(get: { keypad }, set: { pad = .weight($0) }), title: "Weight", unit: unit,
                          cancel: { pad = nil }, done: { form.weight = $0; pad = nil })
        case .effort(let kind):
            EffortGrid(kind: kind, value: form.effort, pick: { form.effort = $0; pad = nil }, cancel: { pad = nil })
        case nil:
            if !allPlannedLogged { inputs } else if typeSize.isAccessibilitySize { allLoggedBanner.id(Self.bannerId) }
        }
    }

    private static let bannerId = "all-planned-logged"

    /// "✓ ALL PLANNED SETS LOGGED" in place of the inputs, as the web does.
    private var allLoggedBanner: some View {
        Label("All planned sets logged", systemImage: "checkmark")
            .font(.ripit(.subheadline, .bold)).display(1.2)
            .foregroundStyle(Theme.text(Theme.success))
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: Theme.touch, alignment: .leading)
            .background(Theme.success.opacity(0.12))
            .overlay(alignment: .leading) { Rectangle().fill(Theme.success).frame(width: 4) }
    }

    @ViewBuilder private var inputs: some View {
        VStack(alignment: .leading, spacing: 6) {
            fieldLabel("Reps", icon: "number")
            RepsStepperView(reps: form.reps, set: { form.reps = $0 }, openPad: { pad = .reps(NumberKeypad(opening: form.reps)) })
        }
        let effortKind = form.editingSet == nil ? try? LoggerRules.effortPicker(settings.settings) : nil
        if typeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 6) {
                weightLabel
                weightBox
            }
            if let effortKind {
                VStack(alignment: .leading, spacing: 6) {
                    fieldLabel(effortKind.rawValue, icon: "gauge.with.dots.needle.33percent")
                    effortBox(effortKind)
                }
            }
        } else {
            // One grid, so the labels share a baseline and the boxes a row.
            Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 6) {
                GridRow(alignment: .lastTextBaseline) {
                    weightLabel
                    if let effortKind { fieldLabel(effortKind.rawValue, icon: "gauge.with.dots.needle.33percent") }
                }
                GridRow {
                    weightBox
                    if let effortKind { effortBox(effortKind) }
                }
            }
        }
        WarmupToggle(isOn: $form.warmup)
        if weightOutOfRange {
            Text("Weight must be 0 to \(Int(LoggedWeight.max)).")
                .font(.ripit(.footnote))
                .foregroundStyle(Theme.text(Theme.error))
        }
    }

    private var weightLabel: some View {
        HStack(alignment: .lastTextBaseline, spacing: 6) {
            fieldLabel("Weight", icon: "scalemass")
            Button { form.unit = unit == "lbs" ? "kg" : "lbs" } label: {
                Text("(\(unit.uppercased()))").font(.ripit(.subheadline, .bold)).underline()
                    .contentShape(Rectangle().inset(by: -12))
            }
            .buttonStyle(.plain)
            .foregroundStyle(Theme.text(Theme.primary))
            .accessibilityLabel("Unit \(unit), tap to switch")
        }
    }

    private var weightBox: some View {
        readout(form.weight, unit: unit, label: "Weight") {
            pad = .weight(NumberKeypad(opening: form.weight, decimal: true))
        }
    }

    private func effortBox(_ kind: EffortKind) -> some View {
        readout(form.effort.map { EffortSetting.label(kind, $0) } ?? "", unit: nil, label: kind.rawValue.uppercased()) {
            pad = .effort(kind)
        }
    }

    private var weightOutOfRange: Bool {
        guard !form.weight.isEmpty else { return false }
        return !(Double(form.weight).map(LoggedWeight.isValid) ?? false)
    }

    private func fieldLabel(_ text: String, icon: String?) -> some View {
        HStack(alignment: .lastTextBaseline, spacing: 6) {
            if let icon { Image(systemName: icon).font(.ripit(.footnote, .bold)) }
            Text(text.uppercased()).font(.ripit(.subheadline, .bold)).display(1.2)
        }
        .foregroundStyle(Theme.mutedForeground)
    }

    /// A big value that opens its keypad.
    private func readout(_ value: String, unit: String?, label: String, open: @escaping () -> Void) -> some View {
        Button(action: open) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(value.isEmpty ? "--" : value).font(.ripit(.title, .bold).monospacedDigit())
                if let unit, !value.isEmpty { Text(unit).font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground) }
            }
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(maxWidth: .infinity, minHeight: 64)
            .background(Theme.muted)
            .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: 2))
            .foregroundStyle(Theme.foreground)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(label) \(value.isEmpty ? "empty" : value) \(unit ?? "")")
        .accessibilityHint("Opens the keypad")
    }

    // MARK: Sets

    /// Logged sets (tap to change, ✕ to delete), the rest stopwatch after the latest, then the plan still to do.
    @ViewBuilder private var setList: some View {
        let timer = store.restTimer(exerciseId: exercise.id)
        let todo = planned.filter { $0.setNumber > exercise.sets.count }
        if !exercise.sets.isEmpty || !todo.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                fieldLabel("Sets", icon: "checklist")
                VStack(spacing: 0) {
                    ForEach(exercise.sets) { set in
                        if set.id != exercise.sets.first?.id { RowDivider() }
                        loggedRow(set)
                    }
                    if let timer, restClosedAt != exercise.sets.count {
                        RowDivider()
                        RestRow(timer: timer) { restClosedAt = exercise.sets.count }
                    }
                    ForEach(todo) { s in
                        if s.id != todo.first?.id || !exercise.sets.isEmpty { RowDivider() }
                        HStack(spacing: 12) {
                            Text("\(s.setNumber)").font(.ripit(.subheadline, .bold)).foregroundStyle(Theme.mutedForeground)
                                .frame(minWidth: 24, alignment: .leading)
                            Text(PlanFormat.label(s)).font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 12)
                        .frame(minHeight: Theme.touch)
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel("Set \(s.setNumber) planned: \(PlanFormat.label(s))")
                    }
                }
                .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: Theme.line))
            }
        }
    }

    private func loggedRow(_ set: SetDetail) -> some View {
        HStack(spacing: 0) {
            Button { edit(set) } label: {
                SetRow(set: set)
                    .padding(.horizontal, 12)
                    .frame(minHeight: Theme.touch)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .background(form.editingSet == set.id ? Theme.accentMuted : .clear)
            .accessibilityLabel(setAccessibilityLabel(set))
            Button { store.deleteSet(set.id) } label: {
                Image(systemName: "xmark").font(.ripit(.footnote))
                    .frame(width: Theme.touch, height: Theme.touch)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(Theme.mutedForeground)
            .accessibilityLabel("Delete set \(set.setNumber)")
        }
    }

    /// Tapping a logged set changes it with the bar's Save set; tapping it again stops.
    private func edit(_ set: SetDetail) {
        if form.editingSet == set.id {
            form.editingSet = nil
            return
        }
        form = EntryForm(reps: "\(set.reps)",
                         weight: set.weight == 0 ? "" : set.weight.formatted(.number.precision(.fractionLength(0...2)).grouping(.never)),
                         unit: set.weightUnit, effort: form.effort, warmup: set.isWarmup, editingSet: set.id)
    }

    /// "Set 2, 160 lbs times 5, RPE 9, warm-up. Tap to change".
    private func setAccessibilityLabel(_ set: SetDetail) -> String {
        var parts = ["Set \(set.setNumber)", "\(Format.weight(set.weight, set.weightUnit)) times \(set.reps)"]
        if let rir = set.rir {
            parts.append("RIR \(EffortSetting.label(.rir, rir))")
        } else if let rpe = set.rpe {
            parts.append("RPE \(rpe)")
        }
        if set.isWarmup { parts.append("warm-up") }
        return parts.joined(separator: ", ") + ". Tap to change"
    }

    /// Tapping "Last time": its weight, reps and unit, and its effort on the current scale.
    private func use(_ p: Prefill) {
        form.editingSet = nil
        form.weight = p.weight == "0" ? "" : p.weight
        form.reps = p.reps
        if let u = p.weightUnit { form.unit = u }
        form.effort = Int(settings.settings.defaultIntensityRating == .rpe ? p.rpe : p.rir)
    }
}

/// RESTING m:ss, counting up from the latest set with no target, inline in the set list; ✕ hides it.
private struct RestRow: View {
    let timer: RestTimer
    let close: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            RestTimerChip(timer: timer)
            Text("RESTING").font(.ripit(.caption, .bold)).tracking(1).foregroundStyle(Theme.mutedForeground)
            Spacer(minLength: 0)
            Button(action: close) {
                Image(systemName: "xmark").font(.ripit(.footnote))
                    .frame(width: Theme.touch, height: Theme.touch)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(Theme.mutedForeground)
            .accessibilityLabel("Hide rest timer")
        }
        .padding(.leading, 12)
        .background(Theme.primary.opacity(0.06))
    }
}
