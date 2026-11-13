// Create or edit a custom exercise (slice 8; web ExerciseDefinitionEditorModal.tsx): name,
// equipment and primary muscle (one each, as on the web), secondary muscles, instructions. A name
// that already exists is flagged under the name as you type. A field's error shows once that field
// is touched or Save is tapped; Save saves only a valid form.

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
    /// Fields (by problem field name) the person has changed or opened; their errors show.
    @State private var touched: Set<String> = []
    /// Save was tapped on an invalid form: every error shows.
    @State private var tried = false

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
        ScrollViewReader { proxy in
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                field("Name", required: true, problem: nameProblem) {
                    TextField("e.g., Bench Press", text: name, axis: .vertical)
                        .font(.ripit(.headline))
                        .accessibilityIdentifier("exercise-name")
                        .textInputAutocapitalization(.words)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .frame(minHeight: Theme.touch)
                        .background(Theme.card, in: Rectangle())
                        .overlay(Rectangle().stroke(nameProblem != nil || duplicate ? Theme.edge(Theme.error) : Theme.border,
                                                    lineWidth: nameProblem != nil || duplicate ? 2 : 1))
                    // Under the field, so it stays in view while the keyboard is up.
                    if duplicate {
                        Text("An exercise with this name already exists.")
                            .font(.ripit(.subheadline, .semibold))
                            .foregroundStyle(Theme.errorForeground)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Theme.error)
                            .id("duplicate")
                    }
                }
                field("Equipment", required: true, problem: shown("equipment")) {
                    chooser(draft.equipment.map(EquipmentLabel.of).joined(separator: ", "), placeholder: "Select equipment") {
                        touched.insert("equipment")
                        choosing = .equipment
                    }
                }
                field("Primary muscle group", required: true, problem: shown("primaryFAUs")) {
                    chooser(draft.primaryMuscles.map(ExerciseInfo.muscleName).joined(separator: ", "), placeholder: "Select primary muscle group") {
                        touched.insert("primaryFAUs")
                        choosing = .primary
                    }
                }
                field("Secondary muscle groups", required: false, problem: shown("secondaryFAUs")) {
                    chooser(draft.secondaryMuscles.map(ExerciseInfo.muscleName).joined(separator: ", "), placeholder: "None") {
                        touched.insert("secondaryFAUs")
                        choosing = .secondary
                    }
                }
                field("Instructions", required: false, problem: shown("instructions")) {
                    TextField("How to perform this exercise...", text: instructions, axis: .vertical)
                        .lineLimit(4...12)
                        .accessibilityIdentifier("exercise-instructions")
                        .font(.ripit(.body))
                        .padding(12)
                        .background(Theme.card, in: Rectangle())
                        .overlay(Rectangle().stroke(Theme.border, lineWidth: 1))
                    let count = (draft.instructions ?? "").utf16.count
                    Text(verbatim: "\(count)/\(CustomExerciseDraft.maxInstructions)")
                        .font(.ripit(.caption))
                        .foregroundStyle(count > CustomExerciseDraft.maxInstructions ? Theme.text(Theme.error) : Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .padding(16)
        }
        // At large text sizes the warning is taller than the gap above the keyboard: bring it into view.
        .onChange(of: duplicate) { _, isDuplicate in
            if isDuplicate { withAnimation { proxy.scrollTo("duplicate", anchor: .bottom) } }
        }
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
                // Tappable while invalid: a tap shows every error instead of saving.
                Button("Save", action: save)
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
        Binding(get: { draft.instructions ?? "" }, set: {
            draft.instructions = $0.isEmpty ? nil : $0
            touched.insert("instructions")
        })
    }

    /// The name wraps at large text sizes, but stays one line.
    private var name: Binding<String> {
        Binding(get: { draft.name }, set: {
            draft.name = $0.filter { !$0.isNewline }
            touched.insert("name")
        })
    }

    private var nameProblem: String? { shown("name") }

    /// A field's problem, once that field is touched or Save was tapped.
    private func shown(_ field: String) -> String? {
        guard tried || touched.contains(field) else { return nil }
        return problems.first { $0.field == field }?.message
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
        guard problems.isEmpty, !duplicate else {
            tried = true
            return
        }
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
