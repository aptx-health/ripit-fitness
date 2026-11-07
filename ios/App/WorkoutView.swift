// The workout in progress: add exercises, log sets, group supersets, finish or discard.
// A program workout (slice 3) also shows each exercise's plan and prefills like the web.

import RipitCore
import SwiftUI

struct WorkoutView: View {
    @Environment(WorkoutStore.self) private var store
    @State private var picking = false
    @State private var selecting = false
    @State private var selected: Set<String> = []
    @State private var confirmingDiscard = false

    var body: some View {
        @Bindable var store = store
        ScrollView {
            if let w = store.current {
                VStack(alignment: .leading, spacing: 20) {
                    Text([sessionLabel, "Started \(Format.time(w.startedAt))"].compactMap { $0 }.joined(separator: " · "))
                        .foregroundStyle(Theme.mutedForeground)

                    if w.exercises.isEmpty {
                        Text("Add an exercise to start logging sets.")
                            .foregroundStyle(Theme.mutedForeground)
                    }

                    ForEach(SupersetRun.runs(w.exercises), id: \.id) { run in
                        FolderBlock(title: run.title, tone: run.group == nil ? .exercise : .superset) {
                            ForEach(Array(run.exercises.enumerated()), id: \.element.id) { i, ex in
                                if i > 0 { RowDivider() }
                                ExerciseLogger(exercise: ex, planned: store.session?.exercises.first { $0.id == ex.id }?.planned,
                                               showName: run.group != nil,
                                               selecting: selecting, selected: selected.contains(ex.id)) {
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
                        .buttonStyle(FilledButtonStyle(fill: Theme.accent, foreground: Theme.foreground))
                        .disabled(selected.count < 2)
                        .opacity(selected.count < 2 ? 0.5 : 1)
                    } else {
                        Button { picking = true } label: { Label("Add exercise", systemImage: "plus") }
                            .buttonStyle(OutlineButtonStyle())
                    }

                    VStack(spacing: 12) {
                        Button("Finish workout") { store.finishWorkout() }
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
        .navigationTitle(sessionName ?? "Workout")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { store.showingWorkout = false } label: { Image(systemName: "chevron.down") }
                    .frame(minWidth: Theme.touch, minHeight: Theme.touch)
                    .accessibilityLabel("Back to history")
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
        }
        .sheet(isPresented: $picking) {
            NavigationStack {
                ExercisePickerView(query: DebugHooks.pickerQuery ?? "") { id in
                    store.addExercise(id)
                    picking = false
                }
            }
            .environment(store)
        }
        .confirmationDialog("Discard this workout?", isPresented: $confirmingDiscard, titleVisibility: .visible) {
            Button("Discard workout", role: .destructive) { store.discardWorkout() }
        } message: {
            Text("Its exercises and sets are deleted. History is not changed.")
        }
        .alert("Something went wrong", isPresented: Binding(get: { store.lastError != nil }, set: { if !$0 { store.lastError = nil } })) {
            Button("OK") { store.lastError = nil }
        } message: {
            Text(store.lastError ?? "")
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
    /// The prescribed sets, for a program exercise.
    let planned: [ProgramSetDetail]?
    let showName: Bool
    let selecting: Bool
    let selected: Bool
    let toggle: () -> Void

    /// The unit last logged anywhere, the default for an exercise with no sets yet.
    @AppStorage("weightUnit") private var lastUnit = "lbs"
    @State private var unit: String?
    @State private var weight = ""
    @State private var reps = ""
    /// A logged set being changed in place.
    @State private var editingSet: String?
    @FocusState private var focus: Field?
    private enum Field { case weight, reps }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if selecting {
                Button(action: toggle) {
                    HStack {
                        Image(systemName: selected ? "checkmark.square.fill" : "square")
                            .foregroundStyle(selected ? Theme.primary : Theme.mutedForeground)
                        Text(exercise.name).font(.headline).foregroundStyle(Theme.foreground)
                        Spacer()
                    }
                    .frame(minHeight: Theme.touch)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            } else if showName {
                Text(exercise.name).font(.headline).foregroundStyle(Theme.foreground)
            }

            if let planned, !planned.isEmpty, !selecting { PlanStrip(planned: planned, logged: exercise.sets.count) }

            ForEach(exercise.sets) { set in
                HStack {
                    Button { edit(set) } label: { SetRow(set: set) }
                        .buttonStyle(.plain)
                        .padding(.vertical, 2)
                        .background(editingSet == set.id ? Theme.muted : .clear, in: RoundedRectangle(cornerRadius: 6))
                        .accessibilityLabel("Set \(set.setNumber), \(Format.weight(set.weight, set.weightUnit)) times \(set.reps). Tap to change")
                    Button { store.deleteSet(set.id) } label: {
                        Image(systemName: "xmark").font(.footnote)
                    }
                    .frame(width: Theme.touch, height: 36)
                    .foregroundStyle(Theme.mutedForeground)
                    .accessibilityLabel("Delete set \(set.setNumber)")
                }
            }

            if !selecting { entryRow }
        }
        .padding(16)
        .onAppear(perform: prefill)
        .onChange(of: exercise.sets.count) { prefill() }
    }

    private var entryRow: some View {
        HStack(spacing: 8) {
            TextField("Weight", text: $weight)
                .keyboardType(.decimalPad)
                .focused($focus, equals: .weight)
                .fieldStyle()
            Button(currentUnit) { unit = currentUnit == "lbs" ? "kg" : "lbs" }
                .font(.subheadline.weight(.semibold))
                .frame(width: 52, height: Theme.touch)
                .background(Theme.muted, in: RoundedRectangle(cornerRadius: 8))
                .foregroundStyle(Theme.foreground)
                .accessibilityLabel("Unit \(currentUnit), tap to switch")
            TextField("Reps", text: $reps)
                .keyboardType(.numberPad)
                .focused($focus, equals: .reps)
                .fieldStyle()
            Button(editingSet == nil ? "Log" : "Save") { log() }
                .font(.headline)
                .frame(width: 64, height: Theme.touch)
                .background(Theme.primary.opacity(canLog ? 1 : 0.4), in: RoundedRectangle(cornerRadius: 8))
                .foregroundStyle(Theme.primaryForeground)
                .disabled(!canLog)
        }
    }

    private var currentUnit: String { unit ?? lastUnit }

    private var parsedWeight: Double? {
        weight.isEmpty ? 0 : Double(weight.replacingOccurrences(of: ",", with: "."))
    }

    private var canLog: Bool {
        guard let w = parsedWeight, w >= 0, let r = Int(reps), r > 0 else { return false }
        return true
    }

    private func log() {
        guard let w = parsedWeight, let r = Int(reps), r > 0 else { return }
        if let id = editingSet {
            store.updateSet(id, reps: r, weight: w, unit: currentUnit)
            editingSet = nil
            prefill()
        } else {
            store.logSet(exerciseId: exercise.id, reps: r, weight: w, unit: currentUnit)
        }
        lastUnit = currentUnit
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
    }

    /// Start the next set: a program exercise prefills like the web (this session, then last time,
    /// then the plan); an ad-hoc one from the last set logged.
    private func prefill() {
        if planned != nil, let p = store.prefill(exerciseId: exercise.id, setNumber: exercise.sets.count + 1) {
            weight = p.weight == "0" ? "" : p.weight
            reps = p.reps
            if let u = p.weightUnit { unit = u }
            return
        }
        guard let last = exercise.sets.last else { return }
        weight = last.weight == 0 ? "" : last.weight.formatted(.number.precision(.fractionLength(0...2)).grouping(.never))
        reps = "\(last.reps)"
        unit = last.weightUnit
    }
}

/// The plan for a program exercise, one chip per prescribed set; logged ones are ticked.
private struct PlanStrip: View {
    let planned: [ProgramSetDetail]
    let logged: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("PLAN").font(.caption2.weight(.bold)).tracking(1).foregroundStyle(Theme.mutedForeground)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(planned) { s in
                        let done = s.setNumber <= logged
                        HStack(spacing: 4) {
                            if done { Image(systemName: "checkmark").font(.caption2.weight(.bold)) }
                            Text(PlanFormat.label(s)).font(.caption.monospacedDigit().weight(.semibold))
                        }
                        .padding(.horizontal, 8)
                        .frame(minHeight: 28)
                        .background(done ? Theme.primary.opacity(0.15) : Theme.muted, in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(done ? Theme.primary : Theme.foreground)
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
            .font(.body.monospacedDigit())
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, minHeight: Theme.touch)
            .background(Theme.muted, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))
            .foregroundStyle(Theme.foreground)
    }
}
