// The workout in progress: add exercises, log sets, group supersets, finish or discard.

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
                    Text("Started \(Format.time(w.startedAt))")
                        .foregroundStyle(Theme.mutedForeground)

                    if w.exercises.isEmpty {
                        Text("Add an exercise to start logging sets.")
                            .foregroundStyle(Theme.mutedForeground)
                    }

                    ForEach(SupersetRun.runs(w.exercises), id: \.id) { run in
                        FolderBlock(title: run.title, tone: run.group == nil ? .exercise : .superset) {
                            ForEach(Array(run.exercises.enumerated()), id: \.element.id) { i, ex in
                                if i > 0 { RowDivider() }
                                ExerciseLogger(exercise: ex, showName: run.group != nil,
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
        .navigationTitle("Workout")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { store.showingWorkout = false } label: { Image(systemName: "chevron.down") }
                    .frame(minWidth: Theme.touch, minHeight: Theme.touch)
                    .accessibilityLabel("Back to history")
            }
            ToolbarItem(placement: .topBarTrailing) {
                if (store.current?.exercises.count ?? 0) >= 2 {
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

/// One exercise's sets plus the entry row for the next set.
private struct ExerciseLogger: View {
    @Environment(WorkoutStore.self) private var store
    let exercise: ExerciseDetail
    let showName: Bool
    let selecting: Bool
    let selected: Bool
    let toggle: () -> Void

    /// The unit last logged anywhere, the default for an exercise with no sets yet.
    @AppStorage("weightUnit") private var lastUnit = "lbs"
    @State private var unit: String?
    @State private var weight = ""
    @State private var reps = ""
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

            ForEach(exercise.sets) { set in
                HStack {
                    SetRow(set: set)
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
            Button("Log") { log() }
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
        store.logSet(exerciseId: exercise.id, reps: r, weight: w, unit: currentUnit)
        lastUnit = currentUnit
        focus = nil
    }

    /// Start the next set from the last one logged.
    private func prefill() {
        guard let last = exercise.sets.last else { return }
        weight = last.weight == 0 ? "" : last.weight.formatted(.number.precision(.fractionLength(0...2)).grouping(.never))
        reps = "\(last.reps)"
        unit = last.weightUnit
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
