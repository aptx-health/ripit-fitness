// The summary after Finish (slice 6, work item 180), like the web's WorkoutRollupModal: the workout's
// numbers, each exercise against last time, and Save for an ad-hoc workout. The words and numbers
// come from RipitCore (WorkoutRollup.text()), so they match the web's.

import RipitCore
import SwiftUI

struct SummaryView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    let completionId: String
    /// Switches to Library › Workouts after a save.
    let openLibrary: () -> Void
    @State private var saving = false

    var body: some View {
        ScrollView {
            if let rollup = store.rollup(completionId), let text = try? rollup.text() {
                VStack(alignment: .leading, spacing: 20) {
                    if let name = rollup.workoutName {
                        Text(name).font(.ripit(.title2, .bold)).foregroundStyle(Theme.foreground)
                    }
                    meta(text)
                    if let note = text.note {
                        Text(note).font(.ripit(.headline)).foregroundStyle(Theme.mutedForeground)
                    }
                    tiles(text.tiles)
                    if !text.exercises.isEmpty {
                        FolderBlock(title: "Exercises") {
                            ForEach(Array(text.exercises.enumerated()), id: \.offset) { i, ex in
                                if i > 0 { RowDivider() }
                                ExerciseSummaryRow(exercise: ex)
                            }
                        }
                    }
                    VStack(spacing: 12) {
                        if text.canSave {
                            Button { saving = true } label: { Label("Save workout", systemImage: "bookmark") }
                                .buttonStyle(OutlineButtonStyle())
                        }
                        Button("Done") { dismiss() }
                            .buttonStyle(FilledButtonStyle())
                    }
                }
                .padding(16)
            } else {
                ContentUnavailableView("No summary", systemImage: "checkmark.circle",
                                       description: Text("This workout is in your history."))
            }
        }
        .background(Theme.background)
        .navigationTitle("WORKOUT COMPLETE")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $saving) {
            SaveWorkoutView(completionId: completionId, openLibrary: openLibrary)
        }
        .onAppear { if DebugHooks.flag("demoSave") { saving = true } }
    }

    /// "#8" and "Last 7 Days 5", like the web's compact meta row.
    private func meta(_ text: RollupText) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 16) {
                metaItem("Workout", text.workoutNumber).fixedSize()
                metaItem("Last 7 Days", text.last7Days).fixedSize()
                Spacer(minLength: 0)
            }
            VStack(alignment: .leading, spacing: 4) {
                metaItem("Workout", text.workoutNumber)
                metaItem("Last 7 Days", text.last7Days)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private func metaItem(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(label.uppercased()).font(.ripit(.caption, .semibold)).tracking(1).foregroundStyle(Theme.mutedForeground)
            Text(value).font(.ripit(.headline).monospacedDigit()).foregroundStyle(Theme.foreground)
        }
    }

    /// The hero tile across the top, the rest two to a row (one at accessibility text sizes).
    @ViewBuilder
    private func tiles(_ tiles: [RollupTile]) -> some View {
        if let hero = tiles.first {
            let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: typeSize.isAccessibilitySize ? 1 : 2)
            VStack(spacing: 8) {
                StatTile(tile: hero, hero: true)
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(tiles.dropFirst(), id: \.label) { StatTile(tile: $0, hero: false) }
                }
            }
        }
    }
}

private struct StatTile: View {
    let tile: RollupTile
    let hero: Bool

    var body: some View {
        VStack(spacing: 4) {
            Text(tile.value)
                .font(.ripit(hero ? .largeTitle : .title2, .bold).monospacedDigit())
                .foregroundStyle(Theme.foreground)
            Text(tile.label.uppercased())
                .font(.ripit(.caption, .semibold)).tracking(1)
                .foregroundStyle(Theme.mutedForeground)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(hero ? 16 : 12)
        .background(Theme.muted, in: Rectangle())
        .overlay(Rectangle().stroke(Theme.border, lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}

/// "Barbell Row · top 156.3 × 8" over "3 sets · 24 reps · 3,730 lbs · same as last"; each pair
/// stacks when it doesn't fit on one line.
private struct ExerciseSummaryRow: View {
    let exercise: RollupExerciseText

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            pair {
                Text(exercise.name).font(.ripit(.headline)).foregroundStyle(Theme.foreground)
            } trailing: {
                if let top = exercise.top {
                    Text(top).font(.ripit(.subheadline).monospacedDigit()).foregroundStyle(Theme.mutedForeground)
                }
            }
            pair {
                Text(exercise.line).font(.ripit(.subheadline).monospacedDigit()).foregroundStyle(Theme.mutedForeground)
            } trailing: {
                if let trend = exercise.trend {
                    let up = trend.hasPrefix("+")
                    Label(trend.uppercased(), systemImage: up ? "chart.line.uptrend.xyaxis" : trend.hasPrefix("-") ? "chart.line.downtrend.xyaxis" : "equal")
                        .font(.ripit(.footnote, .bold))
                        .foregroundStyle(up ? Theme.text(Theme.primary) : Theme.mutedForeground)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private func pair(@ViewBuilder _ leading: () -> some View, @ViewBuilder trailing: () -> some View) -> some View {
        let (l, t) = (leading(), trailing())
        return ViewThatFits(in: .horizontal) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                l.fixedSize()
                Spacer(minLength: 0)
                t.fixedSize()
            }
            VStack(alignment: .leading, spacing: 4) { l; t }
        }
    }
}

/// Save an ad-hoc workout to repeat: the web's suggested name, editable, and optional notes.
struct SaveWorkoutView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let completionId: String
    let openLibrary: () -> Void
    @State private var name = ""
    @State private var notes = ""
    @State private var savedId: String?

    /// The web's limits, counted as JavaScript counts (UTF-16 units).
    static let maxName = 100
    static let maxNotes = 2000

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if savedId != nil {
                    Label("Saved to your workouts", systemImage: "bookmark.fill")
                        .font(.ripit(.title3, .bold)).foregroundStyle(Theme.text(Theme.primary))
                    Text("Start it again from Library › Workouts, or pin it to see it on Training.")
                        .foregroundStyle(Theme.mutedForeground)
                    Button("Open Library › Workouts") { openLibrary() }
                        .buttonStyle(FilledButtonStyle())
                } else {
                    field("Name", count: name.utf16.count, max: Self.maxName) {
                        TextField("Name", text: $name, axis: .vertical)
                            // Wraps at large text sizes, but a name stays one line.
                            .onChange(of: name) { name = Self.capped(name.replacingOccurrences(of: "\n", with: " "), Self.maxName) }
                    }
                    field("Notes (optional)", count: notes.utf16.count, max: Self.maxNotes) {
                        TextField("Anything to remember next time", text: $notes, axis: .vertical)
                            .lineLimit(3...8)
                            .onChange(of: notes) { notes = Self.capped(notes, Self.maxNotes) }
                    }
                    Button("Save") {
                        savedId = store.saveWorkout(fromCompletion: completionId, name: name, notes: notes)
                    }
                    .buttonStyle(FilledButtonStyle())
                    .disabled(trimmedName.isEmpty)
                    .opacity(trimmedName.isEmpty ? 0.5 : 1)
                }
            }
            .padding(16)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.background)
        .navigationTitle("SAVE WORKOUT")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if name.isEmpty, savedId == nil {
                name = (try? SavedWorkoutNaming.suggestedName(at: Date(), timeZone: .current)) ?? ""
                if DebugHooks.flag("demoSaveNow") {
                    savedId = store.saveWorkout(fromCompletion: completionId, name: name, notes: "Pause the first rep")
                }
            }
        }
    }

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }

    private func field(_ label: String, count: Int, max: Int, @ViewBuilder input: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            let title = Text(label.uppercased()).font(.ripit(.caption, .bold)).tracking(1)
            let counter = Text("\(count)/\(max)").font(.ripit(.caption).monospacedDigit())
            ViewThatFits(in: .horizontal) {
                HStack { title.fixedSize(); Spacer(); counter.fixedSize() }
                VStack(alignment: .leading, spacing: 2) { title; counter }
            }
            .foregroundStyle(Theme.mutedForeground)
            input()
                .padding(12)
                .frame(minHeight: Theme.touch)
                .background(Theme.card, in: Rectangle())
                .overlay(Rectangle().stroke(Theme.border, lineWidth: 1))
                .foregroundStyle(Theme.foreground)
        }
    }

    /// The text cut to at most `max` UTF-16 units, never splitting a character.
    static func capped(_ text: String, _ max: Int) -> String {
        guard text.utf16.count > max else { return text }
        var out = ""
        for c in text {
            if out.utf16.count + String(c).utf16.count > max { break }
            out.append(c)
        }
        return out
    }
}
