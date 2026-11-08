// The program list (activate, archive, new) and one program by week, like the web's /programs
// and /programs/[id].

import RipitCore
import SwiftUI

struct ProgramListView: View {
    @Environment(WorkoutStore.self) private var store
    @Binding var path: [TrainingRoute]
    @State private var building = false
    @State private var archiving: ProgramSummary?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                FolderBlock(title: "Programs") {
                    if store.programs.isEmpty {
                        Text("No programs yet. Build one to follow it week by week.")
                            .foregroundStyle(Theme.mutedForeground)
                            .padding(16)
                    }
                    ForEach(Array(store.programs.enumerated()), id: \.element.id) { i, p in
                        if i > 0 { RowDivider() }
                        HStack(spacing: 8) {
                            NavigationLink(value: TrainingRoute.program(p.id)) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(p.name).font(.ripit(.headline)).foregroundStyle(Theme.foreground)
                                        if p.isActive { ActiveBadge() }
                                    }
                                    Spacer()
                                }
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            Menu {
                                if !p.isActive { Button("Make active") { store.activateProgram(p.id) } }
                                Button("Edit") { path.append(.edit(p.id)) }
                                Button("Archive", role: .destructive) { archiving = p }
                            } label: {
                                Image(systemName: "ellipsis").frame(width: Theme.touch, height: Theme.touch)
                            }
                            .foregroundStyle(Theme.mutedForeground)
                            .accessibilityLabel("Actions for \(p.name)")
                        }
                        .padding(.leading, 16)
                        .frame(minHeight: 64)
                    }
                }
                Button { building = true } label: { Label("New program", systemImage: "plus") }
                    .buttonStyle(FilledButtonStyle())
            }
            .padding(16)
        }
        .background(Theme.background)
        .navigationTitle("PROGRAMS")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $building) {
            NavigationStack { ProgramBuilderView() }.environment(store)
        }
        .confirmationDialog("Archive \(archiving?.name ?? "")?", isPresented: Binding(get: { archiving != nil }, set: { if !$0 { archiving = nil } }),
                            titleVisibility: .visible) {
            Button("Archive program", role: .destructive) {
                if let p = archiving { store.archiveProgram(p.id) }
                archiving = nil
            }
        } message: {
            Text("It leaves this list. Workouts you logged stay in History.")
        }
    }
}

struct ActiveBadge: View {
    var body: some View {
        Text("ACTIVE")
            .font(.ripit(.caption2, .bold)).tracking(1)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(Theme.primary, in: Rectangle())
            .foregroundStyle(Theme.primaryForeground)
    }
}

struct ProgramDetailView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    let programId: String
    @Binding var path: [TrainingRoute]
    @State private var week: Int?
    @State private var archiving = false

    var body: some View {
        // Re-read on every store change so a finished workout or restart shows at once.
        let _ = store.history.count + store.programs.count
        ScrollView {
            if let p = store.program(programId), let progress = store.progress(programId) {
                let done = store.doneWorkouts(programId)
                let shown = week ?? (p.isActive ? store.currentWeek : nil) ?? p.weeks.first?.weekNumber
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 6) {
                        // The badge goes under the title at accessibility sizes, so the name keeps the width
                        // and wraps between words.
                        let layout = typeSize.isAccessibilitySize
                            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8)) : AnyLayout(HStackLayout())
                        layout {
                            Text(p.name).font(.ripit(.title, .bold)).display(1.5).foregroundStyle(Theme.foreground)
                                .fixedSize(horizontal: false, vertical: true)
                                // Capped like the folder tabs, so one long word still fits the width.
                                .dynamicTypeSize(...DynamicTypeSize.accessibility2)
                            if p.isActive { ActiveBadge() }
                        }
                        Text("\(progress.doneWorkouts) of \(progress.totalWorkouts) workouts done · cycle \(progress.cycleNumber)")
                            .foregroundStyle(Theme.mutedForeground)
                    }

                    if !p.isActive {
                        Button("Make active") { store.activateProgram(p.id) }.buttonStyle(FilledButtonStyle())
                    } else if progress.isComplete {
                        Button("Restart program") { store.restartProgram(p.id) }.buttonStyle(FilledButtonStyle())
                    }

                    if p.weeks.count > 1 {
                        WeekPicker(weeks: p.weeks.map(\.weekNumber), selected: shown) { week = $0 }
                    }

                    if let w = p.weeks.first(where: { $0.weekNumber == shown }) {
                        ForEach(w.workouts) { workout in
                            FolderBlock(title: Format.dayTitle(workout.dayNumber, workout.name),
                                        tone: done.contains(workout.id) ? .active : .exercise, trailing: {
                                if done.contains(workout.id) {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.text(Theme.primary))
                                }
                            }) {
                                ForEach(Array(workout.exercises.enumerated()), id: \.element.id) { i, ex in
                                    if i > 0 { RowDivider() }
                                    PlannedExerciseRow(exercise: ex)
                                }
                                if p.isActive {
                                    RowDivider()
                                    Button("Start workout") { store.startProgramWorkout(workout.id) }
                                        .buttonStyle(OutlineButtonStyle())
                                        .padding(12)
                                }
                            }
                        }
                    } else {
                        Text("No weeks yet.").foregroundStyle(Theme.mutedForeground)
                    }

                    Button("Archive program") { archiving = true }
                        .buttonStyle(OutlineButtonStyle(tint: Theme.error))
                        .padding(.top, 12)
                }
                .padding(16)
            }
        }
        .background(Theme.background)
        .navigationTitle("PROGRAM")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink("Edit", value: TrainingRoute.edit(programId)).frame(minHeight: Theme.touch)
            }
        }
        .confirmationDialog("Archive this program?", isPresented: $archiving, titleVisibility: .visible) {
            Button("Archive program", role: .destructive) {
                store.archiveProgram(programId)
                dismiss()
            }
        } message: {
            Text("It leaves your program list. Workouts you logged stay in History.")
        }
    }
}

/// Week number chips, scrolling sideways for long programs.
struct WeekPicker: View {
    let weeks: [Int]
    let selected: Int?
    let pick: (Int) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(weeks, id: \.self) { n in
                    Button("Week \(n)") { pick(n) }
                        .font(.ripit(.subheadline, .semibold))
                        .padding(.horizontal, 14)
                        .frame(minHeight: 40)
                        .background(n == selected ? Theme.secondary : Theme.muted, in: Rectangle())
                        .foregroundStyle(n == selected ? Theme.secondaryForeground : Theme.foreground)
                }
            }
        }
    }
}

/// An exercise in the plan: name, superset label, and its prescribed sets.
struct PlannedExerciseRow: View {
    let exercise: ProgramExercise

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            if let g = exercise.group {
                // Grows with the text instead of clipping the letter.
                Text(g).font(.ripit(.caption, .bold))
                    .fixedSize()
                    .frame(minWidth: 24, minHeight: 24)
                    .padding(.horizontal, 2)
                    .background(Theme.accent, in: Rectangle())
                    .foregroundStyle(Theme.accentForeground)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(exercise.name).font(.ripit(.headline)).foregroundStyle(Theme.foreground)
                Text(exercise.sets.isEmpty ? "No sets" : PlanFormat.summary(exercise.sets))
                    .font(.ripit(.subheadline).monospacedDigit()).foregroundStyle(Theme.mutedForeground)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
