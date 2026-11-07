// Home: start or resume a workout, and the finished workouts, newest first.

import RipitCore
import SwiftUI
import UniformTypeIdentifiers

struct HistoryView: View {
    @Environment(WorkoutStore.self) private var store
    @Binding var path: [String]
    @State private var pickingFile = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("RIPIT")
                    .font(.system(size: 40, weight: .black))
                    .tracking(2)
                    .foregroundStyle(Theme.foreground)

                if let current = store.current {
                    ResumeCard(workout: current)
                } else {
                    Button { store.startWorkout() } label: {
                        Label("Start workout", systemImage: "plus")
                    }
                    .buttonStyle(FilledButtonStyle())
                }

                FolderBlock(title: "History") {
                    if store.history.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("No workouts yet. Start one and it will show up here.")
                                .foregroundStyle(Theme.mutedForeground)
                            Text("Used Ripit on the web? Download my data in ripit.fit Settings, then import the file.")
                                .font(.subheadline)
                                .foregroundStyle(Theme.mutedForeground)
                            importButton
                        }
                        .padding(16)
                    } else {
                        ForEach(Array(store.history.enumerated()), id: \.element.id) { i, entry in
                            if i > 0 { RowDivider() }
                            NavigationLink(value: entry.id) { HistoryRow(entry: entry) }
                                .buttonStyle(.plain)
                        }
                    }
                }

                if !store.history.isEmpty { importButton }
            }
            .padding(16)
        }
        .background(Theme.background)
        .overlay {
            if store.importing {
                ProgressView("Importing…")
                    .padding(24)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 12))
            }
        }
        .fileImporter(isPresented: $pickingFile, allowedContentTypes: [.json]) { result in
            if case .success(let url) = result { Task { await store.importFile(at: url) } }
        }
        .navigationDestination(for: String.self) { WorkoutDetailView(workoutId: $0) }
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            store.reload()
            if DebugHooks.flag("demoImportPicker") { pickingFile = true }
            if DebugHooks.flag("demoDetail"), let first = store.history.first, path.isEmpty { path = [first.id] }
        }
    }
}

extension HistoryView {
    private var importButton: some View {
        Button { pickingFile = true } label: {
            Label("Import from ripit.fit", systemImage: "square.and.arrow.down")
        }
        .buttonStyle(OutlineButtonStyle())
        .disabled(store.importing)
    }
}

private struct ResumeCard: View {
    @Environment(WorkoutStore.self) private var store
    let workout: WorkoutDetail

    var body: some View {
        FolderBlock(title: "In progress", tone: .active) {
            VStack(alignment: .leading, spacing: 12) {
                let sets = workout.exercises.reduce(0) { $0 + $1.sets.count }
                Text("Started \(Format.day(workout.startedAt)), \(Format.time(workout.startedAt))")
                    .font(.headline)
                    .foregroundStyle(Theme.foreground)
                Text(Format.counts(exercises: workout.exercises.count, sets: sets))
                    .foregroundStyle(Theme.mutedForeground)
                Button("Resume workout") { store.resumeWorkout() }
                    .buttonStyle(FilledButtonStyle())
            }
            .padding(16)
        }
    }
}

private struct HistoryRow: View {
    let entry: HistoryEntry
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        HStack {
            // At accessibility text sizes the date moves under the name instead of squeezing it.
            let layout = typeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4))
                : AnyLayout(HStackLayout())
            layout {
                VStack(alignment: .leading, spacing: 4) {
                    Text(Format.historyTitle(entry))
                        .font(.headline)
                        .foregroundStyle(Theme.foreground)
                    Text(Format.counts(exercises: entry.exerciseCount, sets: entry.setCount))
                        .font(.subheadline)
                        .foregroundStyle(Theme.mutedForeground)
                }
                if !typeSize.isAccessibilitySize { Spacer() }
                VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 4) {
                    Text(Format.day(entry.completedAt)).font(.subheadline.weight(.semibold))
                    Text(Format.time(entry.completedAt)).font(.caption)
                }
                .foregroundStyle(Theme.mutedForeground)
            }
            if typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.border)
        }
        .padding(.vertical, typeSize.isAccessibilitySize ? 12 : 0)
        .padding(.horizontal, 16)
        .frame(minHeight: 64)
        .contentShape(Rectangle())
    }
}

/// A finished workout, read-only.
struct WorkoutDetailView: View {
    @Environment(WorkoutStore.self) private var store
    let workoutId: String

    var body: some View {
        ScrollView {
            if let w = store.detail(workoutId) {
                VStack(alignment: .leading, spacing: 20) {
                    if let entry = store.history.first(where: { $0.id == workoutId }) {
                        Text(Format.historyTitle(entry))
                            .font(.title2.weight(.bold))
                            .foregroundStyle(Theme.foreground)
                    }
                    if let done = w.completedAt {
                        Text("\(Format.day(done)), \(Format.time(w.startedAt))–\(Format.time(done))")
                            .foregroundStyle(Theme.mutedForeground)
                    }
                    // A program session lists every planned exercise; history shows only what was done.
                    ForEach(SupersetRun.runs(w.exercises.filter { !$0.sets.isEmpty }), id: \.id) { run in
                        FolderBlock(title: run.title, tone: run.group == nil ? .exercise : .superset) {
                            ForEach(Array(run.exercises.enumerated()), id: \.element.id) { i, ex in
                                if i > 0 { RowDivider() }
                                VStack(alignment: .leading, spacing: 8) {
                                    if run.group != nil { Text(ex.name).font(.headline).foregroundStyle(Theme.foreground) }
                                    ForEach(ex.sets) { SetRow(set: $0) }
                                }
                                .padding(16)
                            }
                        }
                    }
                }
                .padding(16)
            }
        }
        .background(Theme.background)
        .navigationTitle("Workout")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SetRow: View {
    let set: SetDetail
    @ScaledMetric(relativeTo: .subheadline) private var numberWidth: CGFloat = 28

    var body: some View {
        HStack {
            Text("\(set.setNumber)")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(Theme.mutedForeground)
                .frame(minWidth: numberWidth, alignment: .leading)
            Text(Format.weight(set.weight, set.weightUnit))
            Text("×").foregroundStyle(Theme.mutedForeground)
            Text("\(set.reps)")
            Spacer()
        }
        .font(.body.monospacedDigit())
        .foregroundStyle(Theme.foreground)
    }
}

/// Consecutive exercises sharing a superset group, shown as one folder block.
struct SupersetRun {
    let id: String
    let group: String?
    let exercises: [ExerciseDetail]

    var title: String { group.map { "Superset \($0)" } ?? exercises[0].name }

    static func runs(_ exercises: [ExerciseDetail]) -> [SupersetRun] {
        var out: [SupersetRun] = []
        for ex in exercises {
            if let g = ex.group, let last = out.last, last.group == g {
                out[out.count - 1] = SupersetRun(id: last.id, group: g, exercises: last.exercises + [ex])
            } else {
                out.append(SupersetRun(id: ex.id, group: ex.group, exercises: [ex]))
            }
        }
        return out
    }
}
