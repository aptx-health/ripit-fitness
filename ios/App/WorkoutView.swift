// The workout in progress: add exercises, log sets, group supersets, finish or discard.

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
                        .buttonStyle(FilledButtonStyle(fill: Theme.accent, foreground: Theme.foreground))
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
            if DebugHooks.flag("demoFinish"), let w = store.current { finish(w) }
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

    /// An empty workout doesn't go into history: log a set first, or discard it.
    private func finish(_ w: WorkoutDetail) {
        if w.exercises.allSatisfy({ $0.sets.isEmpty }) {
            finishBlocked = true
        } else {
            store.finishWorkout()
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
    /// The workout's first exercise; only used by debug screenshot hooks.
    let isFirst: Bool
    let toggle: () -> Void

    /// The unit last logged anywhere, the default for an exercise with no sets yet.
    @AppStorage("weightUnit") private var lastUnit = "lbs"
    @State private var unit: String?
    @State private var weight = ""
    @State private var reps = ""
    @State private var confirmingRemove = false
    @FocusState private var focus: Field?
    private enum Field { case weight, reps }
    @Environment(\.dynamicTypeSize) private var typeSize

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
            } else {
                HStack(alignment: .top) {
                    if showName { Text(exercise.name).font(.headline).foregroundStyle(Theme.foreground) }
                    Spacer(minLength: 0)
                    Menu {
                        Button("Remove exercise", systemImage: "trash", role: .destructive) { confirmingRemove = true }
                    } label: {
                        Image(systemName: "ellipsis")
                            .frame(width: Theme.touch, height: Theme.touch)
                            .contentShape(Rectangle())
                    }
                    .foregroundStyle(Theme.mutedForeground)
                    .accessibilityLabel("\(exercise.name) options")
                }
                .padding(.top, -12)
                .padding(.bottom, showName ? 0 : -24)
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
        .onAppear {
            prefill()
            if isFirst && DebugHooks.flag("demoFocusWeight") { focus = .weight }
            if isFirst && DebugHooks.flag("demoRemove") { confirmingRemove = true }
        }
        .onChange(of: exercise.sets.count) { prefill() }
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
                .font(.footnote)
                .foregroundStyle(Theme.error)
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
            .font(.subheadline.weight(.semibold))
            .fixedSize()
            .padding(.horizontal, 12)
            .frame(minWidth: 52, minHeight: Theme.touch)
            .background(Theme.muted, in: RoundedRectangle(cornerRadius: 8))
            .foregroundStyle(Theme.foreground)
            .accessibilityLabel("Unit \(currentUnit), tap to switch")
    }

    private var logButton: some View {
        Button("Log") { log() }
            .font(.headline)
            .fixedSize()
            .padding(.horizontal, 16)
            .frame(minWidth: 64, maxWidth: typeSize.isAccessibilitySize ? .infinity : nil, minHeight: Theme.touch)
            .background(Theme.primary.opacity(canLog ? 1 : 0.4), in: RoundedRectangle(cornerRadius: 8))
            .foregroundStyle(Theme.primaryForeground)
            .disabled(!canLog)
    }

    private var currentUnit: String { unit ?? lastUnit }

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
