// Library › Workouts (slice 6, work item 180), like the web's SavedWorkoutsList: New, Pinned, Recent,
// an Older fold and Show archived, grouped by RipitCore exactly as the web groups them. Each row
// opens the workout's plan, with Start; pin, rename, archive, restore and delete are on the rows.
// Slice 9a (work item 199): Workouts | Programs, as on the web; programs open here.

import RipitCore
import SwiftUI

struct LibraryView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(Shell.self) private var shell
    @Binding var path: [LibraryRoute]
    @State private var showOlder = false
    @State private var showArchived = false
    @State private var detail: SavedWorkoutSummary?
    @State private var renaming: SavedWorkoutSummary?
    @State private var newName = ""
    /// -demoLibrary delete: the row whose delete prompt opens at launch.
    @State private var demoDeleteId: String?
    /// Started from the detail sheet; starts once the sheet has closed.
    @State private var startAfterDetail: SavedWorkoutSummary?

    var body: some View {
        @Bindable var shell = shell
        let g = store.savedGroups
        let active = g.new.count + g.pinned.count + g.recent.count + g.older.count
        ScrollViewReader { proxy in
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                PageTitle("LIBRARY")

                FolderTabs(items: [FolderTabItem(tab: LibrarySection.workouts, title: active > 0 ? "Workouts (\(active))" : "Workouts", icon: "bookmark"),
                                   FolderTabItem(tab: .programs, title: "Programs", icon: "book", tone: .active)],
                           selection: $shell.librarySection) { section in
                    switch section {
                    case .workouts: workouts
                    case .programs: ProgramListView(path: $path)
                    }
                }
                Color.clear.frame(height: 1).id("end")
            }
            .padding(16)
        }
        .onAppear {
            if DebugHooks.string("demoLibrary") == "bottom" {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { proxy.scrollTo("end", anchor: .bottom) }
            }
            if DebugHooks.string("demoLibrary") == "pinned" {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { proxy.scrollTo("Pinned", anchor: .top) }
            }
        }
        }
        .background(Theme.background)
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: LibraryRoute.self) { route in
            switch route {
            case .program(let id): ProgramDetailView(programId: id, path: $path)
            case .edit(let id): ProgramEditView(programId: id)
            }
        }
        .sheet(item: $detail, onDismiss: {
            if let item = startAfterDetail { store.startSavedWorkout(item.id, name: item.name) }
            startAfterDetail = nil
        }) { item in
            NavigationStack {
                SavedWorkoutDetailView(savedId: item.id) {
                    startAfterDetail = $0
                    detail = nil
                }
            }
            .environment(store)
        }
        .alert("Rename workout", isPresented: Binding(get: { renaming != nil }, set: { if !$0 { renaming = nil } })) {
            TextField("Name", text: $newName)
                .onChange(of: newName) { newName = SaveWorkoutView.capped(newName, SaveWorkoutView.maxName) }
            Button("Cancel", role: .cancel) { renaming = nil }
            Button("Rename") {
                if let item = renaming { store.renameSavedWorkout(item.id, to: newName) }
                renaming = nil
            }
            // Like Save: a blank name can't be sent.
            .disabled(newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .alert("Something went wrong", isPresented: Binding(get: { store.lastError != nil && !store.showingWorkout },
                                                            set: { if !$0 { store.lastError = nil } })) {
            Button("OK") { store.lastError = nil }
        } message: {
            Text(store.lastError ?? "")
        }
        .onAppear {
            store.reload()
            DebugHooks.openLibrary(store: store, older: &showOlder, archived: &showArchived, detail: &detail, deleting: &demoDeleteId)
            if let first = DebugHooks.libraryRename(store: store) {
                newName = ""
                renaming = first
            }
        }
    }

    /// Library › Workouts: the saved workouts, grouped as on the web.
    @ViewBuilder
    private var workouts: some View {
        let g = store.savedGroups
        let active = g.new.count + g.pinned.count + g.recent.count + g.older.count
        if active + g.archived.count == 0 {
            VStack(alignment: .leading, spacing: 12) {
                Text("You haven't saved any workouts yet. Finish an ad-hoc workout and tap Save.")
                    .foregroundStyle(Theme.mutedForeground)
                if store.current == nil {
                    Button("Start an ad-hoc workout") { store.startWorkout() }
                        .buttonStyle(OutlineButtonStyle())
                }
            }
            .padding(16)
        } else {
            if active == 0 {
                Text("All your saved workouts are archived.")
                    .foregroundStyle(Theme.mutedForeground)
                    .padding(16)
            }
            section("New", g.new) { NewRow(item: $0, open: { detail = $0 }) }
            section("Pinned", g.pinned) { row($0) }
            section("Recent", g.recent) { row($0) }
            fold("Older", g.older, isOpen: $showOlder) { row($0) }
            fold("Show archived", g.archived, isOpen: $showArchived) { item in
                ArchivedRow(item: item, open: { detail = $0 }, demoDelete: item.id == demoDeleteId)
            }
        }
    }

    private func row(_ item: SavedWorkoutSummary) -> some View {
        SavedRow(item: item, open: { detail = $0 }, rename: {
            newName = $0.name
            renaming = $0
        }, demoDelete: item.id == demoDeleteId)
    }

    @ViewBuilder
    private func section<Row: View>(_ title: String, _ items: [SavedWorkoutSummary], @ViewBuilder row: @escaping (SavedWorkoutSummary) -> Row) -> some View {
        if !items.isEmpty {
            GroupHeading(title: title).id(title)
            ForEach(items) { item in
                RowDivider()
                row(item)
            }
        }
    }

    /// A closed-by-default group: "Older (3)", "Show archived (2)".
    @ViewBuilder
    private func fold<Row: View>(_ title: String, _ items: [SavedWorkoutSummary], isOpen: Binding<Bool>,
                                 @ViewBuilder row: @escaping (SavedWorkoutSummary) -> Row) -> some View {
        if !items.isEmpty {
            Button { isOpen.wrappedValue.toggle() } label: {
                HStack {
                    Text("\(title) (\(items.count))").font(.ripit(.subheadline, .bold))
                    Spacer()
                    Image(systemName: isOpen.wrappedValue ? "chevron.up" : "chevron.down").font(.ripit(.footnote, .bold))
                }
                .foregroundStyle(Theme.mutedForeground)
                .padding(.horizontal, 16)
                .frame(minHeight: Theme.touch)
                .background(Theme.muted.opacity(0.5))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityValue(isOpen.wrappedValue ? "open" : "closed")
            if isOpen.wrappedValue {
                ForEach(items) { item in
                    RowDivider()
                    row(item)
                }
            }
        }
    }
}

private struct GroupHeading: View {
    let title: String

    var body: some View {
        Text(title.uppercased())
            .font(.ripit(.caption, .bold)).tracking(1)
            .foregroundStyle(Theme.mutedForeground)
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 6)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
    }
}

enum SavedFormat {
    /// "2 exercises · Nov 7", or "· Created Nov 7" when never used.
    static func subtitle(_ item: SavedWorkoutSummary) -> String {
        let date = item.lastUsedAt.map(short) ?? "Created \(short(item.createdAt))"
        return "\(item.exerciseCount) \(item.exerciseCount == 1 ? "exercise" : "exercises") · \(date)"
    }

    static func short(_ d: Date) -> String {
        d.formatted(.dateTime.month(.abbreviated).day())
    }
}

/// The name and its subtitle; tapping opens the plan.
private struct RowTitle: View {
    let item: SavedWorkoutSummary
    let open: (SavedWorkoutSummary) -> Void

    var body: some View {
        Button { open(item) } label: {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name).font(.ripit(.headline)).foregroundStyle(Theme.foreground).multilineTextAlignment(.leading)
                Text(SavedFormat.subtitle(item)).font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
            }
            .frame(maxWidth: .infinity, minHeight: Theme.touch, alignment: .leading)
            .padding(.leading, 16)
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("View \(item.name)")
        .accessibilityHint(SavedFormat.subtitle(item))
    }
}

/// A Pinned, Recent or Older row: pin toggle and a menu with Rename, Archive and Delete. At
/// accessibility text sizes the two buttons sit under the name, spaced apart.
private struct SavedRow: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dynamicTypeSize) private var typeSize
    let item: SavedWorkoutSummary
    let open: (SavedWorkoutSummary) -> Void
    let rename: (SavedWorkoutSummary) -> Void
    var demoDelete = false
    @State private var confirmingDelete = false

    var body: some View {
        if typeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 4) {
                RowTitle(item: item, open: open)
                HStack(spacing: 24) { pin; menu }
                    .padding(.leading, 8)
                    .padding(.bottom, 8)
            }
        } else {
            HStack(spacing: 0) {
                RowTitle(item: item, open: open)
                pin
                menu
            }
            .padding(.trailing, 4)
        }
    }

    private var pin: some View {
        PinButton(name: item.name, pinned: item.pinnedAt != nil) { store.pinSavedWorkout(item.id, $0) }
    }

    private var menu: some View {
        Menu {
            Button("Rename", systemImage: "pencil") { rename(item) }
            Button("Archive", systemImage: "archivebox") { store.archiveSavedWorkout(item.id) }
            Button("Delete", systemImage: "trash", role: .destructive) { confirmingDelete = true }
        } label: {
            Image(systemName: "ellipsis")
                .frame(minWidth: Theme.touch, minHeight: Theme.touch)
                .contentShape(Rectangle())
        }
        .foregroundStyle(Theme.mutedForeground)
        .accessibilityLabel("Actions for \(item.name)")
        // On the row's own button, so the prompt points at the workout being deleted.
        .deleteConfirmation(item, isPresented: $confirmingDelete)
        .onAppear { if demoDelete { confirmingDelete = true } }
    }
}

/// An agent or coach workout not started yet: Start and Dismiss.
private struct NewRow: View {
    @Environment(WorkoutStore.self) private var store
    let item: SavedWorkoutSummary
    let open: (SavedWorkoutSummary) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            RowTitle(item: item, open: open)
            RowButtons {
                Button("Start") { store.startSavedWorkout(item.id, name: item.name) }
                    .buttonStyle(FilledButtonStyle())
                    .accessibilityLabel("Start \(item.name)")
                Button("Dismiss") { store.dismissSavedWorkout(item.id) }
                    .buttonStyle(OutlineButtonStyle())
                    .accessibilityLabel("Dismiss \(item.name)")
            }
        }
    }
}

/// Under Show archived: Restore puts it back by its date; Delete asks first.
private struct ArchivedRow: View {
    @Environment(WorkoutStore.self) private var store
    let item: SavedWorkoutSummary
    let open: (SavedWorkoutSummary) -> Void
    var demoDelete = false
    @State private var confirmingDelete = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            RowTitle(item: item, open: open)
            RowButtons {
                Button("Restore") { store.restoreSavedWorkout(item.id) }
                    .buttonStyle(OutlineButtonStyle())
                    .accessibilityLabel("Restore \(item.name)")
                Button("Delete") { confirmingDelete = true }
                    .buttonStyle(OutlineButtonStyle(tint: Theme.error))
                    .accessibilityLabel("Delete \(item.name)")
                    .deleteConfirmation(item, isPresented: $confirmingDelete)
            }
        }
        .onAppear { if demoDelete { confirmingDelete = true } }
    }
}

private extension View {
    /// Delete asks first, anchored to the view it's attached to.
    func deleteConfirmation(_ item: SavedWorkoutSummary, isPresented: Binding<Bool>) -> some View {
        modifier(DeleteConfirmation(item: item, isPresented: isPresented))
    }
}

private struct DeleteConfirmation: ViewModifier {
    @Environment(WorkoutStore.self) private var store
    let item: SavedWorkoutSummary
    @Binding var isPresented: Bool

    func body(content: Content) -> some View {
        content.confirmationDialog("Delete \(item.name)?", isPresented: $isPresented, titleVisibility: .visible) {
            Button("Delete", role: .destructive) { store.deleteSavedWorkout(item.id) }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("It's removed from your saved workouts. Workouts you did from it stay in history.")
        }
    }
}

/// Two buttons side by side; stacked at accessibility text sizes so their labels never break.
private struct RowButtons<Content: View>: View {
    @ViewBuilder var content: () -> Content
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 8)) : AnyLayout(HStackLayout(spacing: 8))
        layout { content() }
            .padding([.horizontal, .bottom], 16)
    }
}

struct PinButton: View {
    let name: String
    let pinned: Bool
    let toggle: (Bool) -> Void

    var body: some View {
        Button { toggle(!pinned) } label: {
            Image(systemName: pinned ? "pin.fill" : "pin")
                .frame(minWidth: Theme.touch, minHeight: Theme.touch)
                .contentShape(Rectangle())
        }
        .foregroundStyle(pinned ? Theme.text(Theme.secondary) : Theme.mutedForeground)
        .accessibilityLabel(pinned ? "Unpin \(name)" : "Pin \(name)")
    }
}

/// A saved workout's plan, with Start (like the web's SavedWorkoutDetailDialog).
struct SavedWorkoutDetailView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let savedId: String
    let start: (SavedWorkoutSummary) -> Void

    var body: some View {
        let item = store.savedGroups.all.first { $0.id == savedId }
        ScrollView {
            if let item {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.name).font(.ripit(.title2, .bold)).foregroundStyle(Theme.foreground)
                            Text(SavedFormat.subtitle(item)).font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
                        }
                        Spacer(minLength: 0)
                        PinButton(name: item.name, pinned: item.pinnedAt != nil) { store.pinSavedWorkout(item.id, $0) }
                    }
                    if let notes = item.notes {
                        Text(notes).foregroundStyle(Theme.foreground)
                    }
                    FolderBlock(title: "Exercises") {
                        let plan = store.savedPlan(item.id)
                        ForEach(Array(plan.enumerated()), id: \.offset) { i, ex in
                            if i > 0 { RowDivider() }
                            VStack(alignment: .leading, spacing: 4) {
                                // The superset badge goes under the name when both don't fit on one line.
                                ViewThatFits(in: .horizontal) {
                                    HStack(spacing: 6) { exerciseName(ex.name); supersetBadge(ex.exerciseGroup) }
                                    VStack(alignment: .leading, spacing: 4) { exerciseName(ex.name); supersetBadge(ex.exerciseGroup) }
                                }
                                Text(ex.sets.isEmpty ? "No sets" : PlanFormat.summary(ex.sets.map(\.planned)))
                                    .font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
                                if let notes = ex.notes {
                                    Text(notes).font(.ripit(.footnote)).foregroundStyle(Theme.mutedForeground)
                                }
                            }
                            .padding(16)
                        }
                    }
                    Button { start(item) } label: { Label("Start this workout", systemImage: "play.fill") }
                        .buttonStyle(FilledButtonStyle())
                }
                .padding(16)
            } else {
                ContentUnavailableView("Workout deleted", systemImage: "trash")
            }
        }
        .background(Theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Close") { dismiss() }
                    .frame(minHeight: Theme.touch)
            }
        }
    }

    private func exerciseName(_ name: String) -> some View {
        Text(name).font(.ripit(.headline)).foregroundStyle(Theme.foreground)
    }

    @ViewBuilder
    private func supersetBadge(_ group: String?) -> some View {
        if let group {
            Text("SUPERSET \(group)").font(.ripit(.caption2, .bold))
                .fixedSize()
                .padding(.horizontal, 6).padding(.vertical, 2)
                .background(Theme.accent, in: Rectangle())
                .foregroundStyle(Theme.accentForeground)
        }
    }
}

extension SavedWorkoutGroups {
    var all: [SavedWorkoutSummary] { new + pinned + recent + older + archived }
}

extension SavedSet {
    /// As a prescribed set, for PlanFormat.
    var planned: ProgramSetDetail {
        ProgramSetDetail(id: "\(setNumber)", setNumber: setNumber, reps: reps, weight: nil, rpe: rpe, rir: rir, isWarmup: isWarmup)
    }
}
