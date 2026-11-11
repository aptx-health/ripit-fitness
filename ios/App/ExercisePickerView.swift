// The exercise picker (slice 8, picker-custom.feature; web ExerciseSearchInterface.tsx): search,
// one muscle-group and one equipment filter, tick several and Add them in the order ticked, and
// create or edit custom exercises. Each row shows the start and finish photos.

import RipitCore
import SwiftUI
import UIKit

struct ExercisePickerView: View {
    /// Several exercises with an Add button, or one exercise picked by a tap (pinning a lift).
    enum Mode {
        case several(([String]) -> Void)
        case one((String) -> Void)
    }

    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var muscle: String?
    @State private var equipment: String?
    @State private var results: [PickerExercise] = []
    @State private var searched = false
    @State private var picks = PickList()
    @State private var filter: Filter?
    @State private var editor: EditorTarget?
    let mode: Mode

    init(query: String = "", onAdd: @escaping ([String]) -> Void) {
        _query = State(initialValue: query)
        mode = .several(onAdd)
    }

    init(query: String = "", onPick: @escaping (String) -> Void) {
        _query = State(initialValue: query)
        mode = .one(onPick)
    }

    private var several: Bool {
        if case .several = mode { true } else { false }
    }

    private var search: ExerciseSearch { ExerciseSearch(query: query, muscle: muscle, equipment: equipment) }

    var body: some View {
        List {
            // A row, not a pinned header, so at large text sizes the filters scroll away from the results.
            FilterBar(muscle: muscle, equipment: equipment, choose: { filter = $0 })
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                .listRowBackground(Theme.background)
                .listRowSeparator(.hidden)
            ForEach(results) { ex in
                PickerRow(exercise: ex, ticked: several ? picks.contains(ex.id) : nil,
                          onTap: { tap(ex.id) }, onEdit: { editor = .edit(ex.id) })
                    .listRowBackground(picks.contains(ex.id) ? Theme.primaryMuted : Theme.card)
                    .listRowSeparatorTint(Theme.border)
            }
            if searched && results.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text(query.isEmpty ? "No exercises match these filters." : "No exercises match \"\(query)\".")
                        .font(.ripit(.body)).foregroundStyle(Theme.mutedForeground)
                    if !query.trimmingCharacters(in: .whitespaces).isEmpty {
                        Button("Create \"\(query.trimmingCharacters(in: .whitespaces))\"") { editor = .create(query) }
                            .buttonStyle(OutlineButtonStyle())
                    }
                }
                .padding(.vertical, 8)
                .listRowBackground(Theme.card)
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .scrollDismissesKeyboard(.immediately)
        .background(Theme.background)
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search exercises")
        .autocorrectionDisabled()
        .textInputAutocapitalization(.never)
        .navigationTitle(several ? "ADD EXERCISES" : "PICK EXERCISE")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }.frame(minHeight: Theme.touch)
            }
        }
        .safeAreaInset(edge: .bottom) { bottomBar }
        .task(id: SearchKey(search: search, revision: store.revision)) {
            let found = await store.searchExercises(search)
            guard !Task.isCancelled else { return }
            results = found
            searched = true
        }
        .sheet(item: $filter) { f in
            ChoiceSheet(title: f == .muscle ? "Muscle group" : "Equipment",
                        allLabel: f == .muscle ? "All Muscle Groups" : "All Equipment",
                        choices: f == .muscle ? (try? ExerciseChoices.muscles()) ?? [] : FilterBar.equipmentChoices,
                        selected: [f == .muscle ? muscle : equipment].compactMap { $0 }) { picked in
                if f == .muscle { muscle = picked.first } else { equipment = picked.first }
            }
        }
        .sheet(item: $editor) { target in
            NavigationStack {
                CustomExerciseEditor(target: target) { id in
                    if case .create = target { created(id) }
                }
            }
            .environment(store)
        }
    }

    private var bottomBar: some View {
        HStack(spacing: 12) {
            Button("+ Create") { editor = .create(query) }
                .buttonStyle(OutlineButtonStyle())
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            if case .several(let onAdd) = mode {
                Button(picks.ids.isEmpty ? "Add" : "Add (\(picks.ids.count))") { onAdd(picks.ids) }
                    .buttonStyle(FilledButtonStyle())
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .disabled(picks.ids.isEmpty)
                    .opacity(picks.ids.isEmpty ? 0.5 : 1)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Theme.background.overlay(alignment: .top) { RowDivider() })
    }

    private func tap(_ id: String) {
        switch mode {
        case .several: try? picks.toggle(id)
        case .one(let onPick): onPick(id)
        }
    }

    /// A new custom exercise is ticked (or picked) right away, as on the web.
    private func created(_ id: String) {
        switch mode {
        case .several: if !picks.contains(id) { try? picks.toggle(id) }
        case .one(let onPick): onPick(id)
        }
    }
}

private struct SearchKey: Equatable {
    let search: ExerciseSearch
    let revision: Int
}

enum Filter: String, Identifiable {
    case muscle, equipment
    var id: String { rawValue }
}

enum EditorTarget: Identifiable {
    case create(String)
    case edit(String)

    var id: String {
        switch self {
        case .create(let name): "create:\(name)"
        case .edit(let id): "edit:\(id)"
        }
    }
}

/// The two filter buttons. At large text sizes they stack.
private struct FilterBar: View {
    let muscle: String?
    let equipment: String?
    let choose: (Filter) -> Void

    /// The web picker's equipment filter (ExerciseSearchInterface EQUIPMENT_TYPES).
    static let equipmentChoices = [
        Choice(key: "barbell", label: "Barbell"), Choice(key: "dumbbell", label: "Dumbbell"),
        Choice(key: "cable", label: "Cable"), Choice(key: "machine", label: "Machine"),
        Choice(key: "smith_machine", label: "Smith Machine"), Choice(key: "bodyweight", label: "Bodyweight"),
        Choice(key: "resistance_band", label: "Resistance Band"), Choice(key: "kettlebell", label: "Kettlebell"),
        Choice(key: "other", label: "Other (specialized equipment)"),
    ]

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 8) { buttons }
            VStack(spacing: 8) { buttons }
        }
    }

    @ViewBuilder private var buttons: some View {
        FilterButton(label: muscle.map(ExerciseInfo.muscleName) ?? "All Muscle Groups", active: muscle != nil) { choose(.muscle) }
        FilterButton(label: equipment.map { key in Self.equipmentChoices.first { $0.key == key }?.label ?? key } ?? "All Equipment",
                     active: equipment != nil) { choose(.equipment) }
    }
}

private struct FilterButton: View {
    let label: String
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(label).lineLimit(2).multilineTextAlignment(.leading)
                Spacer(minLength: 0)
                Image(systemName: "chevron.down").font(.ripit(.caption))
            }
            .font(.ripit(.subheadline, .semibold))
            .foregroundStyle(active ? Theme.text(Theme.primary) : Theme.foreground)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: Theme.touch)
            .background(Theme.card)
            .overlay(Rectangle().strokeBorder(active ? Theme.edge(Theme.primary) : Theme.border, lineWidth: active ? 2 : Theme.line))
        }
        .buttonStyle(.plain)
        .fixedSize(horizontal: false, vertical: true)
    }
}

private struct PickerRow: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let exercise: PickerExercise
    /// Ticked or not when picking several; nil when a tap picks.
    let ticked: Bool?
    let onTap: () -> Void
    let onEdit: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Button(action: onTap) {
                // At accessibility text sizes the photos sit above the text, so the name keeps the width.
                let layout = dynamicTypeSize.isAccessibilitySize
                    ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8)) : AnyLayout(HStackLayout(spacing: 12))
                layout {
                    HStack(spacing: 12) {
                        if let ticked {
                            Image(systemName: ticked ? "checkmark.square.fill" : "square")
                                .font(.ripit(.title3))
                                .foregroundStyle(ticked ? Theme.text(Theme.primary) : Theme.mutedForeground)
                        }
                        photos
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text(exercise.name).font(.ripit(.headline)).foregroundStyle(Theme.foreground)
                            if exercise.isCustom { MineBadge() }
                        }
                        if !exercise.primaryMuscles.isEmpty {
                            Text(exercise.primaryMuscles.map(ExerciseInfo.muscleName).joined(separator: ", "))
                                .font(.ripit(.caption)).foregroundStyle(Theme.mutedForeground)
                        }
                        if !exercise.equipment.isEmpty {
                            Text(exercise.equipment.map(EquipmentLabel.of).joined(separator: ", "))
                                .font(.ripit(.caption)).foregroundStyle(Theme.mutedForeground)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .frame(minHeight: 64)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(ticked == true ? .isSelected : [])
            if exercise.isCustom {
                Button("Edit", action: onEdit)
                    .font(.ripit(.subheadline, .semibold))
                    .foregroundStyle(Theme.text(Theme.primary))
                    .frame(minWidth: Theme.touch, minHeight: Theme.touch)
                    .buttonStyle(.borderless)
                    .accessibilityLabel("Edit \(exercise.name)")
            }
        }
    }

    @ViewBuilder private var photos: some View {
        HStack(spacing: 4) {
            if exercise.images.isEmpty {
                ExercisePhoto(name: nil, size: CGSize(width: 124, height: 56))
            } else {
                ForEach(exercise.images, id: \.self) { ExercisePhoto(name: $0, size: CGSize(width: 60, height: 56)) }
            }
        }
    }
}

/// The "mine" mark on a custom exercise.
struct MineBadge: View {
    var body: some View {
        Text("MINE")
            .font(.ripit(.caption2, .bold))
            .display(1)
            .foregroundStyle(Theme.accentForeground)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Theme.accent)
            .overlay(Look.isPaper ? Rectangle().strokeBorder(Theme.border, lineWidth: 1) : nil)
            .accessibilityLabel("My exercise")
    }
}

/// The web's equipment labels (EQUIPMENT_LABELS), for rows and the editor.
enum EquipmentLabel {
    private static let labels: [String: String] = {
        var all = Dictionary(uniqueKeysWithValues: ((try? ExerciseChoices.equipment()) ?? []).map { ($0.key, $0.label) })
        all["bench"] = "Bench"
        all["pull_up_bar"] = "Pull-Up Bar"
        return all
    }()

    static func of(_ key: String) -> String {
        labels[key] ?? key.replacingOccurrences(of: "_", with: " ").capitalized
    }
}

/// A list of choices in a sheet (the web's FilterChoiceSheet): one choice, closing on a tap, or
/// several with Done. `allLabel` adds a first row that clears the choice.
struct ChoiceSheet: View {
    @Environment(\.dismiss) private var dismiss
    let title: String
    var allLabel: String?
    let choices: [Choice]
    var multi = false
    @State var selected: [String]
    let onSelect: ([String]) -> Void

    init(title: String, allLabel: String? = nil, choices: [Choice], multi: Bool = false, selected: [String],
         onSelect: @escaping ([String]) -> Void) {
        self.title = title
        self.allLabel = allLabel
        self.choices = choices
        self.multi = multi
        _selected = State(initialValue: selected)
        self.onSelect = onSelect
    }

    var body: some View {
        NavigationStack {
            List {
                if let allLabel {
                    row(allLabel, on: selected.isEmpty) { pick(nil) }
                }
                ForEach(choices, id: \.key) { c in
                    row(c.label, on: selected.contains(c.key)) { pick(c.key) }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle(title.uppercased())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.frame(minHeight: Theme.touch)
                }
                if multi {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { onSelect(selected); dismiss() }.frame(minHeight: Theme.touch)
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func row(_ label: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(label).font(.ripit(.body)).foregroundStyle(Theme.foreground)
                Spacer()
                if on { Image(systemName: "checkmark").foregroundStyle(Theme.text(Theme.primary)) }
            }
            .frame(minHeight: Theme.touch)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowBackground(on ? Theme.primaryMuted : Theme.card)
        .listRowSeparatorTint(Theme.border)
        .accessibilityAddTraits(on ? .isSelected : [])
    }

    private func pick(_ key: String?) {
        guard multi else {
            onSelect(key.map { [$0] } ?? [])
            dismiss()
            return
        }
        guard let key else { selected = []; return }
        if let i = selected.firstIndex(of: key) { selected.remove(at: i) } else { selected.append(key) }
    }
}

/// A bundled photo from ExerciseImages, or a placeholder when there is none. Photos decode off
/// the main thread, so scrolling the picker stays smooth.
struct ExercisePhoto: View {
    let name: String?
    let size: CGSize
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size.width, height: size.height)
            } else {
                Theme.muted
                    .overlay {
                        if name == nil { Image(systemName: "dumbbell").foregroundStyle(Theme.mutedForeground) }
                    }
                    .accessibilityLabel(name == nil ? "No photo" : "Photo loading")
            }
        }
        .frame(width: size.width, height: size.height)
        .clipShape(Rectangle())
        .task(id: name) {
            guard let name else { image = nil; return }
            image = PhotoCache.cached(name)
            if image == nil { image = await PhotoCache.load(name) }
        }
    }
}

enum PhotoCache {
    // NSCache is thread-safe.
    nonisolated(unsafe) private static let cache = NSCache<NSString, UIImage>()

    static func cached(_ name: String) -> UIImage? {
        cache.object(forKey: name as NSString)
    }

    /// Reads and downsamples a photo on a background thread.
    static func load(_ name: String) async -> UIImage? {
        await Task.detached(priority: .userInitiated) {
            guard let url = Bundle.main.url(forResource: name, withExtension: nil, subdirectory: "ExerciseImages"),
                  let image = UIImage(contentsOfFile: url.path)?.preparingThumbnail(of: CGSize(width: 180, height: 120))
            else { return nil }
            cache.setObject(image, forKey: name as NSString)
            return image
        }.value
    }
}
