// The logger's plan list (slice 9b; web WorkoutPlanEditor.tsx, WorkoutPlanEditorRow.tsx): every exercise with
// sets done of planned and a tick, NOW on the current one. Tap a row to jump; REORDER shows drag handles;
// each row's menu swaps or deletes; + ADD EXERCISE appends. In a freestyle workout, supersets are grouped
// and ungrouped here (Dustin 2026-11-11). Every edit changes today's workout only.

import RipitCore
import SwiftUI

struct PlanSheet: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(SettingsModel.self) private var settings
    @Environment(\.dismiss) private var dismiss
    let currentId: String?
    let jump: (String) -> Void
    let swap: (ExerciseDetail) -> Void
    let delete: (ExerciseDetail) -> Void
    let add: () -> Void
    @State private var reordering = false
    @State private var grouping = false
    @State private var picked: Set<String> = []
    @State private var deleting: ExerciseDetail?

    var body: some View {
        let exercises = store.current?.exercises ?? []
        let index = exercises.firstIndex { $0.id == currentId }
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .bottom, spacing: 0) {
                FolderTab(title: "Workout plan \(index.map { "\($0 + 1)" } ?? "0")/\(exercises.count)", icon: "checklist", tone: .active)
                    .accessibilityAddTraits(.isHeader)
                Spacer(minLength: 0)
                Button { dismiss() } label: {
                    Image(systemName: "xmark").font(.system(size: 18, weight: .semibold))
                        .frame(width: Theme.touch, height: Theme.touch)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.foreground)
                .accessibilityLabel("Close")
            }
            .padding([.horizontal, .top], 12)
            VStack(spacing: 0) {
                Text(summary(exercises))
                    .font(.ripit(.subheadline).monospacedDigit())
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                RowDivider()
                List {
                    ForEach(Array(exercises.enumerated()), id: \.element.id) { i, ex in
                        row(ex, number: i + 1)
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(ex.id == currentId ? Theme.success.opacity(0.12) : Theme.card)
                            .listRowSeparatorTint(Theme.border)
                    }
                    .onMove { from, to in
                        guard let source = from.first else { return }
                        store.moveExercise(exercises[source].id, to: to > source ? to - 1 : to)
                    }
                    .moveDisabled(!reordering)
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .environment(\.editMode, .constant(reordering ? .active : .inactive))
                RowDivider()
                footer(exercises)
                    .padding(12)
            }
            .background(Theme.card)
            .overlay(Rectangle().strokeBorder(Theme.edge(Theme.primary), lineWidth: Theme.folderLine))
            .padding(.horizontal, 12)
        }
        .background(Theme.background)
        .confirmationDialog("Delete \(deleting?.name ?? "")?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }),
                            titleVisibility: .visible, presenting: deleting) { ex in
            Button("Delete exercise", role: .destructive) { delete(ex) }
        } message: { ex in
            Text(ex.sets.isEmpty ? "It will be removed from this workout."
                 : "It will be removed from this workout, with its \(ex.sets.count) logged \(ex.sets.count == 1 ? "set" : "sets").")
        }
    }

    /// "4 of 17 sets · 00:09": working sets logged of planned, and the workout clock.
    private func summary(_ exercises: [ExerciseDetail]) -> String {
        let done = exercises.reduce(0) { $0 + $1.sets.filter { !$0.isWarmup }.count }
        let planned = exercises.reduce(0) { $0 + store.plannedSets($1).filter { !$0.isWarmup }.count }
        let seconds = (try? LoggingClock.elapsedSeconds(from: store.current?.startedAt ?? Date(), to: Date())) ?? 0
        let clock = (try? LoggingClock.workoutText(seconds)) ?? ""
        return planned > 0 ? "\(done) of \(planned) sets · \(clock)" : "\(done) \(done == 1 ? "set" : "sets") · \(clock)"
    }

    private func row(_ ex: ExerciseDetail, number: Int) -> some View {
        let working = ex.sets.filter { !$0.isWarmup }
        let plannedWorking = store.plannedSets(ex).filter { !$0.isWarmup }.count
        let plan = try? LoggerRules.planRow(doneWorkingSets: working.count,
                                             plannedWorkingSets: store.plannedSets(ex).isEmpty ? nil : plannedWorking,
                                             lastWeight: working.last?.weight,
                                             unit: working.last?.weightUnit ?? settings.settings.defaultWeightUnit.rawValue,
                                             isCurrent: ex.id == currentId)
        let isNow = plan?.status == .now
        return HStack(spacing: 12) {
            if grouping {
                Image(systemName: picked.contains(ex.id) ? "checkmark.square.fill" : "square")
                    .font(.ripit(.title3))
                    .foregroundStyle(picked.contains(ex.id) ? Theme.text(Theme.primary) : Theme.mutedForeground)
            }
            Group {
                if plan?.status == .done {
                    Image(systemName: "checkmark").font(.ripit(.headline, .bold))
                } else {
                    Text("\(number)").font(.ripit(.headline, .bold).monospacedDigit())
                }
            }
            .frame(minWidth: 36, minHeight: 36)
            .background(isNow || plan?.status == .done ? Theme.success : .clear)
            .foregroundStyle(isNow || plan?.status == .done ? Theme.successForeground : Theme.foreground)
            .overlay(Rectangle().strokeBorder(isNow || plan?.status == .done ? .clear : Theme.border, lineWidth: 2))
            .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(ex.name).font(.ripit(.headline, .bold)).foregroundStyle(Theme.foreground)
                        .fixedSize(horizontal: false, vertical: true)
                    if isNow {
                        Text("NOW").font(.ripit(.caption, .bold)).tracking(1)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(Theme.success).foregroundStyle(Theme.successForeground)
                    }
                }
                if let badge = try? LoggerRules.supersetBadge(ex.group) {
                    Text(badge).font(.ripit(.caption, .bold))
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Theme.accent).foregroundStyle(Theme.accentForeground)
                }
                Text(plan?.subLine ?? "").font(.ripit(.subheadline).monospacedDigit()).foregroundStyle(Theme.mutedForeground)
            }
            Spacer(minLength: 0)
            if !reordering && !grouping { menu(ex) }
        }
        .padding(.leading, 16)
        .padding(.vertical, 10)
        .frame(minHeight: 64)
        .contentShape(Rectangle())
        .onTapGesture {
            if grouping {
                if picked.contains(ex.id) { picked.remove(ex.id) } else { picked.insert(ex.id) }
            } else if !reordering {
                jump(ex.id)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(rowLabel(ex, number: number, plan: plan))
        .accessibilityAddTraits(.isButton)
        .accessibilityAction(named: "Swap exercise") { swap(ex) }
        .accessibilityAction(named: "Delete exercise") { deleting = ex }
    }

    private func rowLabel(_ ex: ExerciseDetail, number: Int, plan: PlanRow?) -> String {
        var parts = ["\(number). \(ex.name)"]
        if plan?.status == .now { parts.append("now") }
        if plan?.status == .done { parts.append("done") }
        if let badge = try? LoggerRules.supersetBadge(ex.group) { parts.append(badge) }
        if let sub = plan?.subLine { parts.append(sub) }
        if grouping { parts.append(picked.contains(ex.id) ? "selected" : "not selected") }
        return parts.joined(separator: ", ")
    }

    private func menu(_ ex: ExerciseDetail) -> some View {
        Menu {
            Button("Swap exercise", systemImage: "arrow.triangle.2.circlepath") {
                // Closes this sheet for the picker; the menu's own close animation finishes first, or the
                // two dismissals collide and an animation never ends.
                Task {
                    try? await Task.sleep(for: .milliseconds(350))
                    swap(ex)
                }
            }
            if store.session == nil, ex.group != nil {
                Button("Remove from superset", systemImage: "link") { store.removeFromSuperset(ex.id) }
            }
            Button("Delete exercise", systemImage: "trash", role: .destructive) { deleting = ex }
        } label: {
            Image(systemName: "ellipsis")
                .rotationEffect(.degrees(90))
                .frame(width: Theme.touch, height: Theme.touch)
                .contentShape(Rectangle())
        }
        .foregroundStyle(Theme.mutedForeground)
        .accessibilityLabel("\(ex.name) options")
    }

    @ViewBuilder private func footer(_ exercises: [ExerciseDetail]) -> some View {
        if grouping {
            HStack(spacing: 8) {
                Button("Cancel") { grouping = false; picked = [] }.buttonStyle(OutlineButtonStyle())
                Button("Group \(picked.count)") {
                    store.groupAsSuperset(exercises.map(\.id).filter(picked.contains))
                    grouping = false
                    picked = []
                }
                .buttonStyle(FilledButtonStyle(fill: Theme.accent, foreground: Theme.accentForeground, shadow: nil))
                .disabled(picked.count < 2)
                .opacity(picked.count < 2 ? 0.5 : 1)
            }
        } else {
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    Button { reordering.toggle() } label: {
                        Label(reordering ? "Done" : "Reorder", systemImage: reordering ? "checkmark" : "arrow.up.arrow.down")
                    }
                    .buttonStyle(OutlineButtonStyle())
                    .disabled(exercises.count < 2)
                    // Supersets are a freestyle workout's; a program's come from its plan.
                    if store.session == nil && exercises.count >= 2 && !reordering {
                        Button { grouping = true } label: { Label("Superset", systemImage: "link") }
                            .buttonStyle(OutlineButtonStyle())
                    }
                }
                if !reordering {
                    Button(action: add) { Label("Add exercise", systemImage: "plus") }
                        .buttonStyle(FilledButtonStyle(fill: Theme.accent, foreground: Theme.accentForeground, shadow: nil))
                }
            }
        }
    }
}
