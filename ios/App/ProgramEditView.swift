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
    /// The exercise whose sheet is open, by id: the sheet always gets the saved plan (work item 171).
    @State private var editingId: String?

    var body: some View {
        let _ = store.revision   // re-read the program after every write
        ScrollView {
            if let p = store.program(programId) {
                let shown = week ?? p.weeks.first?.weekNumber
                VStack(alignment: .leading, spacing: 20) {
                    TextField("Program name", text: $name)
                        .font(.ripit(.title3, .semibold))
                        .padding(.horizontal, 12)
                        .frame(minHeight: Theme.touch)
                        .background(Theme.card, in: Rectangle())
                        .overlay(Rectangle().stroke(Theme.border, lineWidth: 1))
                        .onSubmit { saveName(p) }

                    HStack {
                        WeekPicker(weeks: p.weeks.map(\.weekNumber), selected: shown) { week = $0 }
                        Button {
                            store.addProgramWeek(programId)
                            week = (p.weeks.last?.weekNumber ?? 0) + 1
                        } label: { Image(systemName: "plus") }
                            .frame(width: Theme.touch, height: 40)
                            .background(Theme.muted, in: Rectangle())
                            .accessibilityLabel("Add week (copies the last week)")
                    }

                    if let w = p.weeks.first(where: { $0.weekNumber == shown }) {
                        ForEach(w.workouts) { workout in
                            WorkoutEditBlock(workout: workout, onAdd: { addingTo = workout.id }, onEdit: { editingId = $0.id })
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
        .navigationTitle("EDIT PROGRAM")
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
        .sheet(isPresented: Binding(get: { editingId != nil }, set: { if !$0 { editingId = nil } }),
               onDismiss: { DebugHooks.editFlowDismissed(reopen: { editingId = $0 }) }) {
            if let id = editingId, let ex = exercise(id) {
                NavigationStack { ExerciseEditSheet(exercise: ex) }.environment(store)
            }
        }
        .onAppear {
            if DebugHooks.flag("demoEditExercise") || DebugHooks.flag("demoEditFlow"), editingId == nil,
               let ex = store.program(programId)?.weeks.first?.workouts.first?.exercises.first { editingId = ex.id; DebugHooks.editFlowExerciseId = ex.id }
        }
    }

    /// The exercise as saved now.
    private func exercise(_ id: String) -> ProgramExercise? {
        store.program(programId)?.weeks.flatMap(\.workouts).flatMap(\.exercises).first { $0.id == id }
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
                    .font(.ripit(.headline))
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
    @State private var confirmingCancel = false

    /// Unsaved edits in the sheet.
    private var hasChanges: Bool {
        name.trimmingCharacters(in: .whitespaces) != exercise.name || group != exercise.group
            || sets.map(\.planned) != exercise.sets.map { EditableSet($0).planned }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Name").font(.ripit(.caption, .semibold)).foregroundStyle(Theme.mutedForeground)
                    TextField("Exercise name", text: $name)
                        .font(.ripit(.headline))
                        .padding(.horizontal, 12)
                        .frame(minHeight: Theme.touch)
                        .background(Theme.card, in: Rectangle())
                        .overlay(Rectangle().stroke(Theme.border, lineWidth: 1))
                    Text("A new name also shows in this workout's history.")
                        .font(.ripit(.caption)).foregroundStyle(Theme.mutedForeground)
                }
                HStack {
                    Text("Superset").font(.ripit(.headline)).foregroundStyle(Theme.foreground)
                    Spacer()
                    GroupMenu(group: $group)
                }
                FolderBlock(title: "Prescribed sets") {
                    SetsEditor(sets: $sets).padding(16)
                }
                Text("Changing the plan never changes sets you already logged.")
                    .font(.ripit(.caption)).foregroundStyle(Theme.mutedForeground)
                Button("Remove exercise") { confirmingRemove = true }
                    .buttonStyle(OutlineButtonStyle(tint: Theme.error))
            }
            .padding(16)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.background)
        .navigationTitle(exercise.name.uppercased())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { if hasChanges { confirmingCancel = true } else { dismiss() } }
                    .frame(minHeight: Theme.touch)
            }
            ToolbarItem(placement: .confirmationAction) { Button("Save", action: save).frame(minHeight: Theme.touch) }
        }
        .interactiveDismissDisabled(hasChanges)
        .confirmationDialog("Discard your changes?", isPresented: $confirmingCancel, titleVisibility: .visible) {
            Button("Discard changes", role: .destructive) { dismiss() }
            Button("Keep editing", role: .cancel) {}
        }
        .onAppear {
            DebugHooks.editFlowStep(removeFirstSet: { sets.removeFirst() }, changeRep: { sets[0].reps = "6" }, save: save)
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
        // Each set keeps its own RPE, RIR and warm-up flag (they live on EditableSet).
        let planned = sets.map(\.planned).filter { !$0.reps.isEmpty }
        if planned != exercise.sets.map({ EditableSet($0).planned }) { store.setPrescribedSets(exercise.id, planned) }
        dismiss()
    }
}
