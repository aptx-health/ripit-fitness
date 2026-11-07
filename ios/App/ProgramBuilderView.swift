// Build a new program: weeks, workouts, catalog exercises with prescribed sets (free-text weight)
// and superset groups. Held in memory until Save, then written with createProgram.

import RipitCore
import SwiftUI

/// The in-memory program being built.
struct PlanDraft {
    struct Exercise: Identifiable {
        let id = UUID()
        var definitionId: String
        var name: String
        var group: String?
        var sets: [EditableSet]
    }

    struct Workout: Identifiable {
        let id = UUID()
        var name: String
        var exercises: [Exercise] = []
    }

    var name = ""
    var weeks: [[Workout]] = [[Workout(name: "Day 1")]]

    static let defaultSets = Array(repeating: PlannedSet(reps: "5"), count: 3)

    var plan: ProgramPlan {
        ProgramPlan(name: name.trimmingCharacters(in: .whitespaces), weeks: weeks.map { week in
            week.map { w in
                PlannedWorkout(w.name, w.exercises.map { PlannedExercise($0.definitionId, group: $0.group, sets: $0.sets.map(\.planned)) })
            }
        })
    }

    /// A copy of the last week, as a new week (fresh ids).
    mutating func addWeek() {
        let copy = (weeks.last ?? []).map { w in
            Workout(name: w.name, exercises: w.exercises.map { Exercise(definitionId: $0.definitionId, name: $0.name, group: $0.group, sets: $0.sets) })
        }
        weeks.append(copy.isEmpty ? [Workout(name: "Day 1")] : copy)
    }
}

/// One prescribed set as editable text.
struct EditableSet: Identifiable, Equatable {
    var id = UUID()
    var reps: String
    var weight: String

    init(reps: String, weight: String) {
        self.reps = reps
        self.weight = weight
    }

    init(_ s: PlannedSet) { self.init(reps: s.reps, weight: s.weight ?? "") }
    init(_ s: ProgramSetDetail) { self.init(reps: s.reps, weight: s.weight ?? "") }

    var planned: PlannedSet {
        let w = weight.trimmingCharacters(in: .whitespaces)
        return PlannedSet(reps: reps.trimmingCharacters(in: .whitespaces), weight: w.isEmpty ? nil : w)
    }
}

/// Superset labels, like the web's: A, B, C...
enum SupersetLabel {
    static let all = (0..<26).map { String(UnicodeScalar(UInt8(65 + $0))) }
}

struct ProgramBuilderView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var draft = PlanDraft()
    @State private var week = 0
    @State private var picking: UUID?

    private var canSave: Bool {
        !draft.name.trimmingCharacters(in: .whitespaces).isEmpty && draft.weeks.contains { $0.contains { !$0.exercises.isEmpty } }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                TextField("Program name", text: $draft.name)
                    .font(.title3.weight(.semibold))
                    .padding(.horizontal, 12)
                    .frame(minHeight: Theme.touch)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))

                HStack {
                    WeekPicker(weeks: Array(1...draft.weeks.count), selected: week + 1) { week = $0 - 1 }
                    Button { draft.addWeek(); week = draft.weeks.count - 1 } label: { Image(systemName: "plus") }
                        .frame(width: Theme.touch, height: 40)
                        .background(Theme.muted, in: RoundedRectangle(cornerRadius: 8))
                        .accessibilityLabel("Add week (copies the last week)")
                }

                ForEach($draft.weeks[week]) { $workout in
                    WorkoutDraftBlock(workout: $workout, onAddExercise: { picking = workout.id }) {
                        draft.weeks[week].removeAll { $0.id == workout.id }
                    }
                }

                Button {
                    draft.weeks[week].append(PlanDraft.Workout(name: "Day \(draft.weeks[week].count + 1)"))
                } label: { Label("Add workout", systemImage: "plus") }
                    .buttonStyle(OutlineButtonStyle())

                if draft.weeks.count > 1 {
                    Button("Remove week \(week + 1)") {
                        draft.weeks.remove(at: week)
                        week = max(0, week - 1)
                    }
                    .buttonStyle(OutlineButtonStyle(tint: Theme.error))
                }
            }
            .padding(16)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.background)
        .navigationTitle("New program")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.frame(minHeight: Theme.touch) }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    store.createProgram(draft.plan, activate: store.programs.allSatisfy { !$0.isActive })
                    dismiss()
                }
                .disabled(!canSave)
                .frame(minHeight: Theme.touch)
            }
        }
        .sheet(isPresented: Binding(get: { picking != nil }, set: { if !$0 { picking = nil } })) {
            NavigationStack {
                ExercisePickerView { id in
                    if let target = picking, let i = draft.weeks[week].firstIndex(where: { $0.id == target }) {
                        draft.weeks[week][i].exercises.append(PlanDraft.Exercise(
                            definitionId: id, name: store.exercise(id)?.name ?? id, sets: PlanDraft.defaultSets.map(EditableSet.init)))
                    }
                    picking = nil
                }
            }
            .environment(store)
        }
        .onAppear { if let demo = DebugHooks.demoDraft(store) { draft = demo } }
    }
}

private struct WorkoutDraftBlock: View {
    @Binding var workout: PlanDraft.Workout
    let onAddExercise: () -> Void
    let onRemove: () -> Void

    var body: some View {
        FolderBlock(title: workout.name.isEmpty ? "Workout" : workout.name, trailing: {
            Button(action: onRemove) { Image(systemName: "trash").font(.footnote) }
                .frame(width: 40, height: 32)
                .foregroundStyle(Theme.mutedForeground)
                .accessibilityLabel("Remove workout")
        }) {
            VStack(alignment: .leading, spacing: 0) {
                TextField("Workout name", text: $workout.name)
                    .font(.headline)
                    .padding(.horizontal, 16)
                    .frame(minHeight: Theme.touch)
                ForEach($workout.exercises) { $ex in
                    RowDivider()
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text(ex.name).font(.headline).foregroundStyle(Theme.foreground)
                            Spacer()
                            GroupMenu(group: $ex.group)
                            Button { workout.exercises.removeAll { $0.id == ex.id } } label: { Image(systemName: "xmark").font(.footnote) }
                                .frame(width: 40, height: 36)
                                .foregroundStyle(Theme.mutedForeground)
                                .accessibilityLabel("Remove \(ex.name)")
                        }
                        SetsEditor(sets: $ex.sets)
                    }
                    .padding(16)
                }
                RowDivider()
                Button(action: onAddExercise) { Label("Add exercise", systemImage: "plus") }
                    .buttonStyle(OutlineButtonStyle())
                    .padding(12)
            }
        }
    }
}

/// Pick a superset label (or none) for an exercise.
struct GroupMenu: View {
    @Binding var group: String?

    var body: some View {
        Menu {
            Button("No superset") { group = nil }
            ForEach(SupersetLabel.all.prefix(6), id: \.self) { g in Button("Superset \(g)") { group = g } }
        } label: {
            Text(group.map { "Superset \($0)" } ?? "Superset")
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 10)
                .frame(minHeight: 32)
                .background(group == nil ? Theme.muted : Theme.accent, in: RoundedRectangle(cornerRadius: 6))
                .foregroundStyle(group == nil ? Theme.mutedForeground : Color(hex: 0x1A1108))
        }
        .accessibilityLabel(group.map { "Superset \($0), change" } ?? "Add to a superset")
    }
}

/// Prescribed sets as rows of reps and free-text weight ("135", "65%", "RPE 8").
struct SetsEditor: View {
    @Binding var sets: [EditableSet]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text("Set").frame(width: 28, alignment: .leading)
                Text("Reps").frame(maxWidth: .infinity)
                Text("Weight").frame(maxWidth: .infinity)
                Color.clear.frame(width: 36, height: 1)
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(Theme.mutedForeground)
            ForEach(Array($sets.enumerated()), id: \.element.id) { i, $set in
                HStack(spacing: 8) {
                    Text("\(i + 1)").font(.subheadline.weight(.bold)).foregroundStyle(Theme.mutedForeground)
                        .frame(width: 28, alignment: .leading)
                    TextField("5", text: $set.reps).planField()
                    TextField("e.g. 65%", text: $set.weight).planField()
                    Button { sets.remove(at: i) } label: { Image(systemName: "minus.circle") }
                        .frame(width: 36, height: 40)
                        .foregroundStyle(Theme.mutedForeground)
                        .accessibilityLabel("Remove set \(i + 1)")
                }
            }
            Button {
                sets.append(sets.last.map { EditableSet(reps: $0.reps, weight: $0.weight) } ?? EditableSet(reps: "5", weight: ""))
            } label: { Label("Add set", systemImage: "plus").font(.subheadline.weight(.semibold)) }
                .frame(minHeight: 40)
        }
    }
}

private extension View {
    func planField() -> some View {
        self
            .font(.body.monospacedDigit())
            .multilineTextAlignment(.center)
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)
            .frame(maxWidth: .infinity, minHeight: 40)
            .background(Theme.muted, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))
            .foregroundStyle(Theme.foreground)
    }
}
