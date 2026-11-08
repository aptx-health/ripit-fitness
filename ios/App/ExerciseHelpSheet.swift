// An exercise's Info / Notes / History while logging (slice 5; web ExerciseDisplayTabs.tsx,
// ExerciseInfoContent.tsx, ExerciseHistoryPanel.tsx). Notes only appear when the plan has some.

import RipitCore
import SwiftUI

enum HelpTab: String, CaseIterable, Identifiable {
    case info = "Info", notes = "Notes", history = "History"
    var id: String { rawValue }
}

struct ExerciseHelpSheet: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let exercise: ExerciseDetail
    @State var tab: HelpTab

    var body: some View {
        let notes = store.exerciseNotes(exerciseId: exercise.id)
        let tabs = HelpTab.allCases.filter { $0 != .notes || notes != nil }
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Picker("Section", selection: $tab) {
                    ForEach(tabs) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .frame(minHeight: Theme.touch)

                switch tab {
                case .info: InfoContent(definitionId: exercise.definitionId)
                case .notes: Text(notes ?? "").foregroundStyle(Theme.foreground)
                case .history: HistoryContent(definitionId: exercise.definitionId)
                }
            }
            .padding(16)
        }
        .background(Theme.background)
        .navigationTitle(exercise.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Done") { dismiss() }.frame(minHeight: Theme.touch)
            }
        }
    }
}

private struct SectionLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(.caption.weight(.bold)).tracking(1).foregroundStyle(Theme.mutedForeground)
    }
}

/// Photos, instructions, muscles and equipment.
private struct InfoContent: View {
    @Environment(WorkoutStore.self) private var store
    let definitionId: String

    var body: some View {
        let info = store.exerciseInfo(definitionId: definitionId)
        let photos = store.exercise(definitionId)?.images ?? []
        VStack(alignment: .leading, spacing: 16) {
            if !photos.isEmpty {
                HStack(spacing: 8) {
                    ForEach(photos, id: \.self) { ExercisePhoto(name: $0, size: CGSize(width: 160, height: 110)) }
                }
            }
            if let text = info?.instructions {
                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel(text: "Instructions")
                    Text(text).foregroundStyle(Theme.foreground)
                }
            }
            chips("Primary muscles", info?.primaryMuscles.map(ExerciseInfo.muscleName) ?? [])
            chips("Secondary muscles", info?.secondaryMuscles.map(ExerciseInfo.muscleName) ?? [])
            chips("Equipment", info?.equipment.map(\.capitalized) ?? [])
            if photos.isEmpty && info?.instructions == nil && (info?.primaryMuscles.isEmpty ?? true) && (info?.equipment.isEmpty ?? true) {
                Text("No details for this exercise yet.").foregroundStyle(Theme.mutedForeground)
            }
        }
    }

    @ViewBuilder private func chips(_ title: String, _ items: [String]) -> some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                SectionLabel(text: title)
                FlowRow(items: items)
            }
        }
    }
}

/// Wrapping chips.
private struct FlowRow: View {
    let items: [String]
    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 6) { ForEach(items, id: \.self, content: chip) }
            VStack(alignment: .leading, spacing: 6) { ForEach(items, id: \.self, content: chip) }
        }
    }

    private func chip(_ text: String) -> some View {
        Text(text)
            .font(.subheadline.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Theme.muted, in: RoundedRectangle(cornerRadius: 6))
            .foregroundStyle(Theme.foreground)
    }
}

/// The last 4 finished workouts with this exercise, newest first.
private struct HistoryContent: View {
    @Environment(WorkoutStore.self) private var store
    let definitionId: String

    var body: some View {
        let sessions = store.exerciseHistory(definitionId: definitionId)
        if sessions.isEmpty {
            Text("No finished workouts with this exercise yet.").foregroundStyle(Theme.mutedForeground)
        }
        VStack(spacing: 12) {
            ForEach(Array(sessions.enumerated()), id: \.offset) { _, s in SessionCard(session: s) }
        }
    }
}

private struct SessionCard: View {
    let session: HistorySession
    @State private var showWarmups = false
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // At accessibility text sizes the PR and e1RM go under the name instead of beside it.
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 6) {
                    title
                    HStack(spacing: 8) { badges }
                }
            } else {
                HStack(alignment: .firstTextBaseline) {
                    title
                    Spacer()
                    badges
                }
            }
            ForEach(session.workingSets, id: \.setNumber) { HistorySetRow(set: $0) }
            if !session.warmupSets.isEmpty {
                Button {
                    showWarmups.toggle()
                } label: {
                    HStack {
                        Image(systemName: showWarmups ? "chevron.down" : "chevron.right").font(.caption)
                        Text("\(session.warmupSets.count) warm-up \(session.warmupSets.count == 1 ? "set" : "sets")")
                        Spacer()
                    }
                    .font(.subheadline)
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(minHeight: Theme.touch)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                if showWarmups { ForEach(session.warmupSets, id: \.setNumber) { HistorySetRow(set: $0) } }
            }
        }
        .padding(12)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(session.isPR ? Theme.accent : Theme.border, lineWidth: 1))
    }

    private var title: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(session.workoutName).font(.headline).foregroundStyle(Theme.foreground)
            Text(Format.day(session.completedAt)).font(.caption).foregroundStyle(Theme.mutedForeground)
        }
    }

    @ViewBuilder private var badges: some View {
        if session.isPR {
            Text("PR")
                .font(.caption.weight(.bold))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Theme.accent, in: RoundedRectangle(cornerRadius: 4))
                .foregroundStyle(Theme.foreground)
        }
        if let e1rm = session.e1rm {
            Text("e1RM \(Int(e1rm.rounded())) lbs").font(.subheadline.monospacedDigit().weight(.semibold))
                .foregroundStyle(Theme.foreground)
        }
    }
}

private struct HistorySetRow: View {
    let set: HistorySet

    var body: some View {
        SetLine(setNumber: set.setNumber, weight: set.weight, unit: set.weightUnit, reps: set.reps,
                rpe: set.rpe, rir: set.rir, isWarmup: set.isWarmup)
    }
}
