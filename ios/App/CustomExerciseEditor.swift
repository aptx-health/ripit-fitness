// Create or edit a custom exercise (slice 8; web ExerciseDefinitionEditorModal.tsx): name,
// equipment and primary muscle (one each, as on the web), secondary muscles, instructions. A name
// that already exists is flagged as you type, and Save waits until everything is valid.

import RipitCore
import SwiftUI

struct CustomExerciseEditor: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let target: EditorTarget
    /// Called with the exercise's id once it is saved.
    let onSaved: (String) -> Void
    @State private var draft = CustomExerciseDraft(name: "", equipment: [], primaryMuscles: [])
    @State private var original: CustomExerciseDraft?
    @State private var choosing: Field?
    @State private var confirmingCancel = false
    @State private var loaded = false

    private enum Field: String, Identifiable {
        case equipment, primary, secondary
        var id: String { rawValue }
    }

    private var editingId: String? {
        if case .edit(let id) = target { id } else { nil }
    }

    private var problems: [FieldProblem] { (try? draft.problems()) ?? [] }

    /// Another exercise with this name. Editing without renaming never counts, as on the web.
    private var duplicate: Bool {
        let name = draft.name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, name != original?.name else { return false }
        return store.duplicateExercise(named: name, excluding: editingId) != nil
    }

    private var hasChanges: Bool { loaded && draft != (original ?? CustomExerciseDraft(name: initialName, equipment: [], primaryMuscles: [])) }

    private var initialName: String {
        if case .create(let name) = target { name.trimmingCharacters(in: .whitespacesAndNewlines) } else { "" }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if duplicate {
                    Text("An exercise with this name already exists.")
                        .font(.ripit(.subheadline, .semibold))
                        .foregroundStyle(Theme.errorForeground)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.error)
                        .accessibilityAddTraits(.isStaticText)
                }
                field("Name", required: true, problem: nameProblem) {
                    TextField("e.g., Bench Press", text: $draft.name, axis: .vertical)
                        .font(.ripit(.headline))
                        .accessibilityIdentifier("exercise-name")
                        .textInputAutocapitalization(.words)
                        // It wraps at large text sizes, but a name stays one line.
                        .onChange(of: draft.name) { _, name in
                            if name.contains(where: \.isNewline) { draft.name = name.filter { !$0.isNewline } }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .frame(minHeight: Theme.touch)
                        .background(Theme.card, in: Rectangle())
                        .overlay(Rectangle().stroke(nameProblem != nil || duplicate ? Theme.edge(Theme.error) : Theme.border,
                                                    lineWidth: nameProblem != nil || duplicate ? 2 : 1))
                }
                field("Equipment", required: true, problem: problem("equipment")) {
                    chooser(draft.equipment.map(EquipmentLabel.of).joined(separator: ", "), placeholder: "Select equipment") {
                        choosing = .equipment
                    }
                }
                field("Primary muscle group", required: true, problem: problem("primaryFAUs")) {
                    chooser(draft.primaryMuscles.map(ExerciseInfo.muscleName).joined(separator: ", "), placeholder: "Select primary muscle group") {
                        choosing = .primary
                    }
                }
                field("Secondary muscle groups", required: false, problem: problem("secondaryFAUs")) {
                    chooser(draft.secondaryMuscles.map(ExerciseInfo.muscleName).joined(separator: ", "), placeholder: "None") {
                        choosing = .secondary
                    }
                }
                field("Instructions", required: false, problem: problem("instructions")) {
                    TextField("How to perform this exercise...", text: instructions, axis: .vertical)
                        .lineLimit(4...12)
                        .accessibilityIdentifier("exercise-instructions")
                        .font(.ripit(.body))
                        .padding(12)
                        .background(Theme.card, in: Rectangle())
                        .overlay(Rectangle().stroke(Theme.border, lineWidth: 1))
                    let count = (draft.instructions ?? "").utf16.count
                    Text("\(count)/1000")
                        .font(.ripit(.caption))
                        .foregroundStyle(count > 1000 ? Theme.text(Theme.error) : Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .padding(16)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.background)
        .navigationTitle(editingId == nil ? "NEW EXERCISE" : "EDIT EXERCISE")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { if hasChanges { confirmingCancel = true } else { dismiss() } }
                    .frame(minHeight: Theme.touch)
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save", action: save)
                    .disabled(!problems.isEmpty || duplicate)
                    .frame(minHeight: Theme.touch)
            }
        }
        .interactiveDismissDisabled(hasChanges)
        .confirmationDialog("Discard this exercise?", isPresented: $confirmingCancel, titleVisibility: .visible) {
            Button("Discard", role: .destructive) { dismiss() }
            Button("Keep editing", role: .cancel) {}
        }
        .sheet(item: $choosing) { f in
            switch f {
            case .equipment:
                ChoiceSheet(title: "Select equipment", choices: (try? ExerciseChoices.equipment()) ?? [],
                            selected: draft.equipment) { draft.equipment = $0 }
            case .primary:
                ChoiceSheet(title: "Select primary muscle group", choices: (try? ExerciseChoices.muscles()) ?? [],
                            selected: draft.primaryMuscles) { picked in
                    draft.primaryMuscles = picked
                    draft.secondaryMuscles.removeAll { picked.contains($0) }
                }
            case .secondary:
                ChoiceSheet(title: "Select secondary muscle groups",
                            choices: ((try? ExerciseChoices.muscles()) ?? []).filter { !draft.primaryMuscles.contains($0.key) },
                            multi: true, selected: draft.secondaryMuscles) { draft.secondaryMuscles = $0 }
            }
        }
        .onAppear(perform: load)
    }

    private var instructions: Binding<String> {
        Binding(get: { draft.instructions ?? "" }, set: { draft.instructions = $0.isEmpty ? nil : $0 })
    }

    /// The name's problem, once something is typed (an empty name just keeps Save off).
    private var nameProblem: String? {
        draft.name.isEmpty ? nil : problem("name")
    }

    private func problem(_ field: String) -> String? {
        problems.first { $0.field == field }?.message
    }

    private func field<Content: View>(_ label: String, required: Bool, problem: String?,
                                      @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(required ? "\(label) *" : label)
                .font(.ripit(.caption, .semibold)).display(1).foregroundStyle(Theme.mutedForeground)
            content()
            if let problem {
                Text(problem).font(.ripit(.caption, .semibold)).foregroundStyle(Theme.text(Theme.error))
            }
        }
    }

    private func chooser(_ value: String, placeholder: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(value.isEmpty ? placeholder : value)
                    .foregroundStyle(value.isEmpty ? Theme.mutedForeground : Theme.foreground)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 0)
                Image(systemName: "chevron.down").foregroundStyle(Theme.mutedForeground)
            }
            .font(.ripit(.body))
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, minHeight: Theme.touch)
            .background(Theme.card)
            .overlay(Rectangle().stroke(Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func load() {
        guard !loaded else { return }
        switch target {
        case .create:
            draft.name = initialName
        case .edit(let id):
            original = store.customExercise(id)
            if let original { draft = original }
        }
        loaded = true
    }

    private func save() {
        switch target {
        case .create:
            guard let id = store.createCustomExercise(draft) else { return }
            onSaved(id)
        case .edit(let id):
            guard store.updateCustomExercise(id, draft) else { return }
            onSaved(id)
        }
        dismiss()
    }
}
