// The workout in progress: add exercises, log sets, group supersets, finish or discard.
// A program workout (slice 3) also shows each exercise's plan and prefills like the web.

import RipitCore
import SwiftUI
import UIKit

struct WorkoutView: View {
    @Environment(WorkoutStore.self) private var store
    @State private var picking = false
    @State private var selecting = false
    @State private var selected: Set<String> = []
    @State private var confirmingDiscard = false
    @State private var finishBlocked = false
    @State private var confirmingFinish = false

    var body: some View {
        @Bindable var store = store
        ScrollView {
            if let w = store.current {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            WorkoutClock(startedAt: w.startedAt)
                            Text([sessionLabel, "Started \(Format.time(w.startedAt))"].compactMap { $0 }.joined(separator: " · "))
                                .font(.ripit(.subheadline))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                        Spacer(minLength: 0)
                    }

                    if w.exercises.isEmpty {
                        Text("Add an exercise to start logging sets.")
                            .foregroundStyle(Theme.mutedForeground)
                    }

                    ForEach(SupersetRun.runs(w.exercises), id: \.id) { run in
                        FolderBlock(title: run.title, tone: run.group == nil ? .exercise : .superset) {
                            ForEach(Array(run.exercises.enumerated()), id: \.element.id) { i, ex in
                                if i > 0 { RowDivider() }
                                let programPlan = store.session?.exercises.first { $0.id == ex.id }?.planned
                                ExerciseLogger(exercise: ex, planned: programPlan ?? (ex.planned.isEmpty ? nil : ex.planned),
                                               isProgram: programPlan != nil,
                                               showName: run.group != nil,
                                               selecting: selecting, selected: selected.contains(ex.id),
                                               isFirst: ex.id == w.exercises.first?.id) {
                                    if selected.contains(ex.id) { selected.remove(ex.id) } else { selected.insert(ex.id) }
                                }
                            }
                        }
                    }

                    if selecting {
                        Button("Group \(selected.count) as superset") {
                            store.groupAsSuperset(Array(selected))
                            selected = []
                            selecting = false
                        }
                        .buttonStyle(FilledButtonStyle(fill: Theme.accent, foreground: Theme.accentForeground, shadow: nil))
                        .disabled(selected.count < 2)
                        .opacity(selected.count < 2 ? 0.5 : 1)
                    } else {
                        Button { picking = true } label: { Label("Add exercise", systemImage: "plus") }
                            .buttonStyle(OutlineButtonStyle())
                    }

                    VStack(spacing: 12) {
                        Button("Finish workout") { finish(w) }
                            .buttonStyle(FilledButtonStyle())
                        Button("Discard") { confirmingDiscard = true }
                            .buttonStyle(OutlineButtonStyle(tint: Theme.error))
                    }
                    .padding(.top, 12)
                }
                .padding(16)
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.background)
        .navigationTitle((sessionName ?? store.current?.name ?? "Workout").uppercased())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { store.showingWorkout = false } label: { Image(systemName: "chevron.down") }
                    .frame(minWidth: Theme.touch, minHeight: Theme.touch)
                    .accessibilityLabel("Minimize workout")
            }
            ToolbarItem(placement: .topBarTrailing) {
                if store.session == nil && (store.current?.exercises.count ?? 0) >= 2 {
                    Button(selecting ? "Cancel" : "Superset") {
                        selecting.toggle()
                        selected = []
                    }
                    .frame(minHeight: Theme.touch)
                }
            }
        }
        .onAppear {
            if DebugHooks.pickerQuery != nil { picking = true }
            if DebugHooks.flag("demoDiscard") { confirmingDiscard = true }
            if DebugHooks.flag("demoFinish"), let w = store.current { finish(w) }
            if DebugHooks.flag("demoFinishNow") { store.finishWorkout() }
        }
        .sheet(isPresented: $picking) {
            NavigationStack {
                ExercisePickerView(query: DebugHooks.pickerQuery ?? "", onAdd: { ids in
                    store.addExercises(ids)
                    picking = false
                })
            }
            .environment(store)
        }
        .confirmationDialog("Discard this workout?", isPresented: $confirmingDiscard, titleVisibility: .visible) {
            Button("Discard workout", role: .destructive) { store.discardWorkout() }
        } message: {
            Text("Its exercises and sets are deleted. History is not changed.")
        }
        .alert("Finish this workout?", isPresented: $confirmingFinish) {
            Button("Cancel", role: .cancel) {}
            Button("Finish") { store.finishWorkout() }
        } message: {
            let sets = store.current?.exercises.reduce(0) { $0 + $1.sets.count } ?? 0
            Text("\(sets) \(sets == 1 ? "set" : "sets") logged. It goes into history.")
        }
        .alert("Log a set first, or discard", isPresented: $finishBlocked) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("A workout needs at least one logged set to go into history.")
        }
        .alert("Something went wrong", isPresented: Binding(get: { store.lastError != nil }, set: { if !$0 { store.lastError = nil } })) {
            Button("OK") { store.lastError = nil }
        } message: {
            Text(store.lastError ?? "")
        }
    }

    /// An empty workout doesn't go into history: log a set first, or discard it. Otherwise ask first.
    private func finish(_ w: WorkoutDetail) {
        if w.exercises.allSatisfy({ $0.sets.isEmpty }) {
            finishBlocked = true
        } else {
            confirmingFinish = true
        }
    }
}

extension WorkoutView {
    /// The program workout's name, when this is a program session.
    private var sessionName: String? {
        guard let s = store.session else { return nil }
        return store.program(s.programId)?.weeks.flatMap(\.workouts).first { $0.id == s.workoutId }?.name
    }

    /// "Week 1 · Day 2" for a program session.
    private var sessionLabel: String? {
        guard let s = store.session, let p = store.program(s.programId),
              let week = p.weeks.first(where: { $0.workouts.contains { $0.id == s.workoutId } }),
              let w = week.workouts.first(where: { $0.id == s.workoutId }) else { return nil }
        return "Week \(week.weekNumber) · Day \(w.dayNumber)"
    }
}

/// One exercise's sets plus the entry row for the next set. A program exercise also shows its plan.
private struct ExerciseLogger: View {
    @Environment(WorkoutStore.self) private var store
    let exercise: ExerciseDetail
    /// The prescribed sets: a program exercise's, or a started or repeated workout's (slice 6).
    let planned: [ProgramSetDetail]?
    /// A program exercise: it belongs to the plan and prefills like the web's program logger.
    let isProgram: Bool
    let showName: Bool
    let selecting: Bool
    let selected: Bool
    /// The workout's first exercise; only used by debug screenshot hooks.
    let isFirst: Bool
    let toggle: () -> Void

    /// Settings: the effort picker (none when tracking is off) and the unit a new exercise starts in.
    @Environment(SettingsModel.self) private var settings
    @State private var unit: String?
    @State private var weight = ""
    @State private var reps = ""
    /// A logged set being changed in place.
    @State private var editingSet: String?
    @State private var confirmingRemove = false
    /// Effort for the next set, on the current scale.
    @State private var effort: Int?
    @State private var warmup = false
    /// Set when a warm-up was just logged, so the next prefill keeps the effort picked for working sets.
    @State private var keepEffort = false
    @State private var help: HelpTab?
    @FocusState private var focus: Field?
    private enum Field { case weight, reps }
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if selecting {
                Button(action: toggle) {
                    HStack {
                        Image(systemName: selected ? "checkmark.square.fill" : "square")
                            .foregroundStyle(selected ? Theme.text(Theme.primary) : Theme.mutedForeground)
                        Text(exercise.name).font(.ripit(.headline)).foregroundStyle(Theme.foreground)
                        Spacer()
                    }
                    .frame(minHeight: Theme.touch)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            } else {
                // At accessibility text sizes the name gets its own line, like entryRow.
                if showName && typeSize.isAccessibilitySize {
                    Text(exercise.name).font(.ripit(.headline)).foregroundStyle(Theme.foreground)
                }
                // The ⓘ and ··· grow with the text, so at accessibility sizes they get room between them.
                HStack(spacing: typeSize.isAccessibilitySize ? 16 : 4) {
                    if showName && !typeSize.isAccessibilitySize {
                        Text(exercise.name).font(.ripit(.headline)).foregroundStyle(Theme.foreground)
                    }
                    if let timer = store.restTimer(exerciseId: exercise.id) { RestTimerChip(timer: timer) }
                    Spacer(minLength: 0)
                    Button { help = .info } label: {
                        Image(systemName: "info.circle")
                            .frame(minWidth: Theme.touch, minHeight: Theme.touch)
                            .contentShape(Rectangle())
                    }
                    .foregroundStyle(Theme.mutedForeground)
                    .accessibilityLabel("\(exercise.name) info, notes and history")
                    // A program exercise belongs to the plan; change it in the program editor.
                    if !isProgram {
                        Menu {
                            Button("Remove exercise", systemImage: "trash", role: .destructive) { confirmingRemove = true }
                        } label: {
                            Image(systemName: "ellipsis")
                                .frame(minWidth: Theme.touch, minHeight: Theme.touch)
                                .contentShape(Rectangle())
                        }
                        .foregroundStyle(Theme.mutedForeground)
                        .accessibilityLabel("\(exercise.name) options")
                    }
                }
                .padding(.vertical, -8)

                if let notes = store.exerciseNotes(exerciseId: exercise.id) {
                    Button { help = .notes } label: {
                        HStack(alignment: .top, spacing: 6) {
                            Image(systemName: "note.text")
                            Text(notes).lineLimit(2).multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                        }
                        .font(.ripit(.subheadline))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(minHeight: Theme.touch)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Notes: \(notes)")
                }
            }

            if let planned, !planned.isEmpty, !selecting { PlanStrip(planned: planned, logged: exercise.sets.count) }

            ForEach(exercise.sets) { set in
                HStack {
                    Button { edit(set) } label: { SetRow(set: set) }
                        .buttonStyle(.plain)
                        .padding(.vertical, 2)
                        .background(editingSet == set.id ? Theme.muted : .clear, in: Rectangle())
                        .accessibilityLabel(setLabel(set))
                    Button { store.deleteSet(set.id) } label: {
                        Image(systemName: "xmark").font(.ripit(.footnote))
                    }
                    .frame(width: Theme.touch, height: 36)
                    .foregroundStyle(Theme.mutedForeground)
                    .accessibilityLabel("Delete set \(set.setNumber)")
                }
            }

            if !selecting {
                if editingSet == nil, let last = store.lastTime(definitionId: exercise.definitionId) {
                    LastTimeLine(last: last, fill: use)
                }
                entryRow
                // Side by side normally; stacked at accessibility text sizes, like entryRow.
                let extras = typeSize.isAccessibilitySize
                    ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8)) : AnyLayout(HStackLayout(spacing: 8))
                extras {
                    if editingSet == nil, let kind = effortPicker { EffortMenu(kind: kind, value: $effort) }
                    WarmupToggle(isOn: $warmup)
                    if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
                }
            }
        }
        .padding(16)
        .onAppear {
            prefill()
            if isFirst && DebugHooks.flag("demoFocusWeight") { focus = .weight }
            if isFirst && DebugHooks.flag("demoRemove") { confirmingRemove = true }
            if isFirst && DebugHooks.flag("demoUseLastTime"), let f = store.lastTime(definitionId: exercise.definitionId)?.fill { use(f) }
            if isFirst, let tab = DebugHooks.string("demoHelp").flatMap({ HelpTab(rawValue: $0.capitalized) }) { help = tab }
        }
        .onChange(of: exercise.sets.count) { prefill() }
        .onChange(of: effortKind) { effort = plannedEffort() }
        .sheet(item: $help) { tab in
            NavigationStack { ExerciseHelpSheet(exercise: exercise, tab: tab) }
                .environment(store)
        }
        .onChange(of: focus) { _, field in
            // Like the web keypad, typing replaces a prefilled value instead of appending to it.
            guard field != nil else { return }
            DispatchQueue.main.async {
                UIApplication.shared.sendAction(#selector(UIResponder.selectAll(_:)), to: nil, from: nil, for: nil)
            }
        }
        .confirmationDialog("Remove \(exercise.name)?", isPresented: $confirmingRemove, titleVisibility: .visible) {
            Button("Remove exercise", role: .destructive) { store.removeExercise(exercise.id) }
        } message: {
            Text(exercise.sets.isEmpty ? "It has no sets yet." : "Its \(exercise.sets.count) logged \(exercise.sets.count == 1 ? "set is" : "sets are") deleted too.")
        }
    }

    /// One row normally; at accessibility text sizes the fields stack so nothing is cut off.
    @ViewBuilder private var entryRow: some View {
        if typeSize.isAccessibilitySize {
            VStack(spacing: 8) {
                HStack(spacing: 8) { weightField; unitButton }
                repsField
                logButton
            }
        } else {
            HStack(spacing: 8) { weightField; unitButton; repsField; logButton }
        }
        if weightOutOfRange {
            Text("Weight must be 0 to \(Int(LoggedWeight.max)).")
                .font(.ripit(.footnote))
                .foregroundStyle(Theme.text(Theme.error))
        }
    }

    private var weightField: some View {
        TextField("Weight", text: $weight)
            .keyboardType(.decimalPad)
            .focused($focus, equals: .weight)
            .fieldStyle()
    }

    private var repsField: some View {
        TextField("Reps", text: $reps)
            .keyboardType(.numberPad)
            .focused($focus, equals: .reps)
            .fieldStyle()
    }

    private var unitButton: some View {
        Button(currentUnit) { unit = currentUnit == "lbs" ? "kg" : "lbs" }
            .font(.ripit(.subheadline, .semibold))
            .fixedSize()
            .padding(.horizontal, 12)
            .frame(minWidth: 52, minHeight: Theme.touch)
            .background(Theme.muted, in: Rectangle())
            .foregroundStyle(Theme.foreground)
            .accessibilityLabel("Unit \(currentUnit), tap to switch")
    }

    private var logButton: some View {
        Button(editingSet == nil ? "Log" : "Save") { log() }
            .font(.ripit(.headline, .bold))
            .display(1.2)
            .fixedSize()
            .padding(.horizontal, 16)
            .frame(minWidth: 64, maxWidth: typeSize.isAccessibilitySize ? .infinity : nil, minHeight: Theme.touch)
            .background(Theme.primary.opacity(canLog ? 1 : 0.4), in: Rectangle())
            .foregroundStyle(Theme.primaryForeground)
            .disabled(!canLog)
    }

    private var effortPicker: EffortKind? { try? LoggerRules.effortPicker(settings.settings) }

    /// The scale efforts are read and saved on; with tracking off nothing is saved.
    private var effortKind: EffortKind { settings.settings.defaultIntensityRating }

    /// The unit picked for this set, else the set before it in this exercise, else Settings' default.
    private var currentUnit: String {
        unit ?? (try? LoggerRules.newSetUnit(previousSetUnit: exercise.sets.last.flatMap { WeightUnit(rawValue: $0.weightUnit) },
                                             settings.settings).rawValue) ?? WeightUnit.lbs.rawValue
    }

    private var parsedWeight: Double? {
        weight.isEmpty ? 0 : Double(weight.replacingOccurrences(of: ",", with: "."))
    }

    private var weightOutOfRange: Bool {
        guard let w = parsedWeight else { return !weight.isEmpty }
        return !LoggedWeight.isValid(w)
    }

    private var canLog: Bool {
        guard let w = parsedWeight, LoggedWeight.isValid(w), let r = Int(reps), r > 0 else { return false }
        return true
    }

    private func log() {
        guard canLog, let w = parsedWeight, let r = Int(reps) else { return }
        if let id = editingSet {
            store.updateSet(id, reps: r, weight: w, unit: currentUnit)
            if exercise.sets.first(where: { $0.id == id })?.isWarmup != warmup { store.setWarmup(id, warmup) }
            editingSet = nil
            prefill()
        } else {
            // A warm-up saves no effort; the effort picked stays for the next working set.
            let setEffort = warmup || effortPicker == nil ? nil : effort
            keepEffort = warmup
            store.logSet(exerciseId: exercise.id, reps: r, weight: w, unit: currentUnit,
                         rpe: effortKind == .rpe ? setEffort : nil, rir: effortKind == .rir ? setEffort : nil, isWarmup: warmup)
            warmup = false
        }
        focus = nil
    }

    private func edit(_ set: SetDetail) {
        guard !selecting else { return }
        if editingSet == set.id {
            editingSet = nil
            prefill()
            return
        }
        editingSet = set.id
        weight = set.weight == 0 ? "" : set.weight.formatted(.number.precision(.fractionLength(0...2)).grouping(.never))
        reps = "\(set.reps)"
        unit = set.weightUnit
        warmup = set.isWarmup
    }

    /// The default effort for the next set on the current scale: the program prefill's (this session,
    /// last time, then the plan), or none for an ad-hoc exercise.
    private func plannedEffort() -> Int? {
        guard isProgram, let p = store.prefill(exerciseId: exercise.id, setNumber: exercise.sets.count + 1) else { return nil }
        return Int(effortKind == .rpe ? p.rpe : p.rir)
    }

    /// "Set 2, 160 lbs times 5, RPE 9, warm-up. Tap to change".
    private func setLabel(_ set: SetDetail) -> String {
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
        editingSet = nil
        weight = p.weight == "0" ? "" : p.weight
        reps = p.reps
        if let u = p.weightUnit { unit = u }
        effort = Int(effortKind == .rpe ? p.rpe : p.rir)
    }

    /// Start the next set: a program exercise prefills like the web (this session, then last time,
    /// then the plan); an ad-hoc one from the last set logged, else from its plan's next set.
    private func prefill() {
        if isProgram, let p = store.prefill(exerciseId: exercise.id, setNumber: exercise.sets.count + 1) {
            weight = p.weight == "0" ? "" : p.weight
            reps = p.reps
            if let u = p.weightUnit { unit = u }
            // A planned (or last) RPE/RIR is the default effort.
            if !keepEffort { effort = Int(effortKind == .rpe ? p.rpe : p.rir) }
            keepEffort = false
            warmup = false
            return
        }
        keepEffort = false
        warmup = false
        // A planned "3-5" leaves reps to the person.
        let next = planned?.first { $0.setNumber > exercise.sets.count }
        let plannedReps = next.flatMap { Int($0.reps) }
        warmup = next?.isWarmup ?? false
        if let plannedReps { reps = "\(plannedReps)" }
        guard let last = exercise.sets.last else { return }
        weight = last.weight == 0 ? "" : last.weight.formatted(.number.precision(.fractionLength(0...2)).grouping(.never))
        reps = plannedReps.map { "\($0)" } ?? "\(last.reps)"
        unit = last.weightUnit
    }
}

/// The plan for an exercise, one chip per prescribed set; logged ones are ticked.
private struct PlanStrip: View {
    let planned: [ProgramSetDetail]
    let logged: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("PLAN").font(.ripit(.caption2, .bold)).tracking(1).foregroundStyle(Theme.mutedForeground)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(planned) { s in
                        let done = s.setNumber <= logged
                        HStack(spacing: 4) {
                            if done { Image(systemName: "checkmark").font(.ripit(.caption2, .bold)) }
                            Text(PlanFormat.label(s)).font(.ripit(.caption, .semibold).monospacedDigit())
                        }
                        .padding(.horizontal, 8)
                        .frame(minHeight: 28)
                        .background(done ? Theme.primary.opacity(0.15) : Theme.muted, in: Rectangle())
                        .foregroundStyle(done ? Theme.text(Theme.primary) : Theme.foreground)
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Plan: \(PlanFormat.summary(planned)). \(logged) logged.")
    }
}

private extension View {
    func fieldStyle() -> some View {
        self
            .font(.ripit(.body).monospacedDigit())
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, minHeight: Theme.touch)
            .background(Theme.muted, in: Rectangle())
            .overlay(Rectangle().stroke(Theme.border, lineWidth: 1))
            .foregroundStyle(Theme.foreground)
    }
}
