// Edit a saved program in place, like the web's /programs/[id]/edit. Each change is saved at once.
// Edits change the plan only: logged sets keep their numbers, and a rename shows in that workout's
// history (the web's rule). An exercise with logged sets can't be removed.

import RipitCore
import SwiftUI

struct ProgramEditView: View {
    @Environment(WorkoutStore.self) private var store
    let programId: String
    @State private var week: Int?
    @State private var name = ""
    @State private var addingTo: String?
    @State private var editing: ProgramExercise?

    var body: some View {
        let _ = store.programs   // re-read after each write
        ScrollView {
            if let p = store.program(programId) {
                let shown = week ?? p.weeks.first?.weekNumber
                VStack(alignment: .leading, spacing: 20) {
                    TextField("Program name", text: $name)
                        .font(.title3.weight(.semibold))
                        .padding(.horizontal, 12)
                        .frame(minHeight: Theme.touch)
                        .background(Theme.card, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))
                        .onSubmit { saveName(p) }

                    HStack {
                        WeekPicker(weeks: p.weeks.map(\.weekNumber), selected: shown) { week = $0 }
                        Button {
                            store.addProgramWeek(programId)
                            week = (p.weeks.last?.weekNumber ?? 0) + 1
                        } label: { Image(systemName: "plus") }
                            .frame(width: Theme.touch, height: 40)
                            .background(Theme.muted, in: RoundedRectangle(cornerRadius: 8))
                            .accessibilityLabel("Add week (copies the last week)")
                    }

                    if let w = p.weeks.first(where: { $0.weekNumber == shown }) {
                        ForEach(w.workouts) { workout in
                            WorkoutEditBlock(workout: workout, onAdd: { addingTo = workout.id }, onEdit: { editing = $0 })
                        }
                        Button {
                            store.addProgramWorkout(weekId: w.id, name: "Day \(w.workouts.count + 1)")
                        } label: { Label("Add workout to week \(w.weekNumber)", systemImage: "plus") }
                            .buttonStyle(OutlineButtonStyle())
                    }
                }
                .padding(16)
                .onAppear { name = p.name }
                .onDisappear { saveName(p) }
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.background)
        .navigationTitle("Edit program")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: Binding(get: { addingTo != nil }, set: { if !$0 { addingTo = nil } })) {
            NavigationStack {
                ExercisePickerView { id in
                    if let w = addingTo { store.addProgramExercise(workoutId: w, definitionId: id) }
                    addingTo = nil
                }
            }
            .environment(store)
        }
        .sheet(item: $editing) { ex in
            NavigationStack { ExerciseEditSheet(exercise: ex) }.environment(store)
        }
        .onAppear {
            if DebugHooks.flag("demoEditExercise"), editing == nil,
               let ex = store.program(programId)?.weeks.first?.workouts.first?.exercises.first { editing = ex }
        }
    }

    private func saveName(_ p: ProgramDetail) {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty && trimmed != p.name { store.renameProgram(programId, to: trimmed) }
    }
}

private struct WorkoutEditBlock: View {
    @Environment(WorkoutStore.self) private var store
    let workout: ProgramWorkout
    let onAdd: () -> Void
    let onEdit: (ProgramExercise) -> Void
    @State private var name = ""

    var body: some View {
        FolderBlock(title: "Day \(workout.dayNumber)") {
            VStack(alignment: .leading, spacing: 0) {
                TextField("Workout name", text: $name)
                    .font(.headline)
                    .padding(.horizontal, 16)
                    .frame(minHeight: Theme.touch)
                    .onSubmit(save)
                    .onAppear { name = workout.name }
                    .onDisappear(perform: save)
                ForEach(workout.exercises) { ex in
                    RowDivider()
                    Button { onEdit(ex) } label: {
                        HStack {
                            PlannedExerciseRow(exercise: ex)
                            Image(systemName: "pencil").foregroundStyle(Theme.mutedForeground).padding(.trailing, 16)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Edit \(ex.name)")
                }
                RowDivider()
                Button(action: onAdd) { Label("Add exercise", systemImage: "plus") }
                    .buttonStyle(OutlineButtonStyle())
                    .padding(12)
            }
        }
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty && trimmed != workout.name { store.renameProgramWorkout(workout.id, to: trimmed) }
    }
}

/// One program exercise: name, superset group, prescribed sets, remove.
private struct ExerciseEditSheet: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let exercise: ProgramExercise
    @State private var name = ""
    @State private var group: String?
    @State private var sets: [EditableSet] = []
    @State private var confirmingRemove = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Name").font(.caption.weight(.semibold)).foregroundStyle(Theme.mutedForeground)
                    TextField("Exercise name", text: $name)
                        .font(.headline)
                        .padding(.horizontal, 12)
                        .frame(minHeight: Theme.touch)
                        .background(Theme.card, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))
                    Text("A new name also shows in this workout's history.")
                        .font(.caption).foregroundStyle(Theme.mutedForeground)
                }
                HStack {
                    Text("Superset").font(.headline).foregroundStyle(Theme.foreground)
                    Spacer()
                    GroupMenu(group: $group)
                }
                FolderBlock(title: "Prescribed sets") {
                    SetsEditor(sets: $sets).padding(16)
                }
                Text("Changing the plan never changes sets you already logged.")
                    .font(.caption).foregroundStyle(Theme.mutedForeground)
                Button("Remove exercise") { confirmingRemove = true }
                    .buttonStyle(OutlineButtonStyle(tint: Theme.error))
            }
            .padding(16)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.background)
        .navigationTitle(exercise.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.frame(minHeight: Theme.touch) }
            ToolbarItem(placement: .confirmationAction) { Button("Save", action: save).frame(minHeight: Theme.touch) }
        }
        .onAppear {
            name = exercise.name
            group = exercise.group
            sets = exercise.sets.map(EditableSet.init)
        }
        .confirmationDialog("Remove \(exercise.name)?", isPresented: $confirmingRemove, titleVisibility: .visible) {
            Button("Remove", role: .destructive) {
                store.removeProgramExercise(exercise.id)
                dismiss()
            }
        } message: {
            Text("It leaves this workout's plan. If you already logged sets for it, it stays.")
        }
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty && trimmed != exercise.name { store.renameProgramExercise(exercise.id, to: trimmed) }
        if group != exercise.group { store.setProgramExerciseGroup(exercise.id, group) }
        let planned = sets.map(\.planned).filter { !$0.reps.isEmpty }
        if planned != exercise.sets.map({ PlannedSet(reps: $0.reps, weight: $0.weight, rpe: $0.rpe, rir: $0.rir, isWarmup: $0.isWarmup) }) {
            // Keep RPE, RIR and warm-up from the old set at the same position; the editor shows reps and weight only.
            let merged = planned.enumerated().map { i, s in
                let old = i < exercise.sets.count ? exercise.sets[i] : nil
                return PlannedSet(reps: s.reps, weight: s.weight, rpe: old?.rpe, rir: old?.rir, isWarmup: old?.isWarmup ?? false)
            }
            store.setPrescribedSets(exercise.id, merged)
        }
        dismiss()
    }
}
