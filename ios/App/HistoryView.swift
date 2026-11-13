// The finished workouts, newest first, and the import from ripit.fit. Since slice 9a (work item 199)
// it opens from Training › Recent › See all; the workout in progress shows on Training.

import RipitCore
import SwiftUI
import UniformTypeIdentifiers

struct HistoryView: View {
    @Environment(WorkoutStore.self) private var store
    @State private var pickingFile = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                FolderBlock(title: "History") {
                    if store.history.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("No workouts yet. Start one and it will show up here.")
                                .foregroundStyle(Theme.mutedForeground)
                            Text("Used Ripit on the web? Download my data in ripit.fit Settings, then import the file.")
                                .font(.ripit(.subheadline))
                                .foregroundStyle(Theme.mutedForeground)
                            importButton
                        }
                        .padding(16)
                    } else {
                        ForEach(Array(store.history.enumerated()), id: \.element.id) { i, entry in
                            if i > 0 { RowDivider() }
                            NavigationLink(value: TrainingRoute.finished(entry.id)) { HistoryRow(entry: entry) }
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
                    .background(Theme.card, in: Rectangle())
            }
        }
        .fileImporter(isPresented: $pickingFile, allowedContentTypes: [.json]) { result in
            if case .success(let url) = result { Task { await store.importFile(at: url) } }
        }
        .navigationTitle("HISTORY")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            store.reload()
            if DebugHooks.flag("demoImportPicker") { pickingFile = true }
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
                        .font(.ripit(.headline))
                        .foregroundStyle(Theme.foreground)
                    Text(Format.counts(exercises: entry.exerciseCount, sets: entry.setCount))
                        .font(.ripit(.subheadline))
                        .foregroundStyle(Theme.mutedForeground)
                }
                if !typeSize.isAccessibilitySize { Spacer() }
                VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 4) {
                    Text(Format.day(entry.completedAt)).font(.ripit(.subheadline, .semibold))
                    Text(Format.time(entry.completedAt)).font(.ripit(.caption))
                }
                .foregroundStyle(Theme.mutedForeground)
            }
            if typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            Image(systemName: "chevron.right").font(.ripit(.caption)).foregroundStyle(Theme.border)
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
                            .font(.ripit(.title2, .bold))
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
                                    if run.group != nil { Text(ex.name).font(.ripit(.headline)).foregroundStyle(Theme.foreground) }
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
        .navigationTitle("WORKOUT")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SetRow: View {
    let set: SetDetail

    var body: some View {
        SetLine(setNumber: set.setNumber, weight: set.weight, unit: set.weightUnit, reps: set.reps,
                rpe: set.rpe, rir: set.rir, isWarmup: set.isWarmup)
    }
}

/// One logged set: "1  135 lbs × 8  @ RPE 8  W". At accessibility text sizes the weight and reps are
/// one wrapping line (so a number never breaks) with the tags under it (work item 177).
struct SetLine: View {
    let setNumber: Int
    let weight: Double
    let unit: String
    let reps: Int
    let rpe: Int?
    let rir: Int?
    let isWarmup: Bool
    @ScaledMetric(relativeTo: .subheadline) private var numberWidth: CGFloat = 28
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        Group {
            if typeSize.isAccessibilitySize {
                HStack(alignment: .firstTextBaseline) {
                    number
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(Format.weight(weight, unit)) \(Text("×").foregroundStyle(Theme.mutedForeground)) \(reps)")
                        SetTags(rpe: rpe, rir: rir, isWarmup: isWarmup)
                    }
                    Spacer(minLength: 0)
                }
            } else {
                HStack {
                    number
                    Text(Format.weight(weight, unit))
                    Text("×").foregroundStyle(Theme.mutedForeground)
                    Text("\(reps)")
                    SetTags(rpe: rpe, rir: rir, isWarmup: isWarmup)
                    Spacer()
                }
            }
        }
        .font(.ripit(.body).monospacedDigit())
        .foregroundStyle(Theme.foreground)
    }

    private var number: some View {
        Text("\(setNumber)")
            .font(.ripit(.subheadline, .bold))
            .foregroundStyle(Theme.mutedForeground)
            .frame(minWidth: numberWidth, alignment: .leading)
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
