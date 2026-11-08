// Training home (slice 3): Up Next and the current week of the active program, like the web's
// /training. Ad-hoc workouts still start from here and from History. Slice 6 (work item 180) adds
// pinned saved workouts with one-tap Start and recent finished workouts with Repeat.

import RipitCore
import SwiftUI

enum TrainingRoute: Hashable {
    case programs
    case program(String)
    case edit(String)
}

struct TrainingView: View {
    @Environment(WorkoutStore.self) private var store
    @Binding var path: [TrainingRoute]
    @State private var building = false
    @State private var confirmingDiscard = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("TRAINING")
                    .font(.system(size: 40, weight: .black))
                    .tracking(2)
                    .foregroundStyle(Theme.foreground)

                // Any workout in progress, program or ad-hoc, even if its program was archived since.
                if let current = store.current {
                    FolderBlock(title: "In progress", tone: .active) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(store.currentTitle).font(.headline).foregroundStyle(Theme.foreground)
                            Text("Started \(Format.day(current.startedAt)), \(Format.time(current.startedAt)) · \(Format.counts(exercises: current.exercises.count, sets: current.exercises.reduce(0) { $0 + $1.sets.count }))")
                                .font(.subheadline).foregroundStyle(Theme.mutedForeground)
                            Text("One workout at a time: finish or discard this one to start another.")
                                .font(.caption).foregroundStyle(Theme.mutedForeground)
                            Button("Resume workout") { store.resumeWorkout() }
                                .buttonStyle(FilledButtonStyle())
                            Button("Discard") { confirmingDiscard = true }
                                .buttonStyle(OutlineButtonStyle(tint: Theme.error))
                        }
                        .padding(16)
                    }
                }

                if !store.pinnedWorkouts.isEmpty { pinnedBlock }
                if !store.recentWorkouts.isEmpty { recentBlock }

                if let program = store.activeProgram {
                    upNextBlock(program)
                    if let week = program.weeks.first(where: { $0.weekNumber == store.currentWeek }) {
                        weekBlock(program, week)
                    }
                } else {
                    FolderBlock(title: "No active program") {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(store.programs.isEmpty
                                 ? "Build a program to follow it week by week, or log an ad-hoc workout."
                                 : "Pick a program to follow and its next workout shows here.")
                                .foregroundStyle(Theme.mutedForeground)
                            if store.programs.isEmpty {
                                Button { building = true } label: { Label("New program", systemImage: "plus") }
                                    .buttonStyle(FilledButtonStyle())
                            } else {
                                Button("Choose a program") { path.append(.programs) }
                                    .buttonStyle(FilledButtonStyle())
                            }
                        }
                        .padding(16)
                    }
                }

                VStack(spacing: 12) {
                    Button { path.append(.programs) } label: { Label("Programs", systemImage: "list.bullet") }
                        .buttonStyle(OutlineButtonStyle())
                    if store.current == nil {
                        Button { store.startWorkout() } label: { Label("Ad-hoc workout", systemImage: "plus") }
                            .buttonStyle(OutlineButtonStyle())
                    }
                }
            }
            .padding(16)
        }
        .background(Theme.background)
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: TrainingRoute.self) { route in
            switch route {
            case .programs: ProgramListView(path: $path)
            case .program(let id): ProgramDetailView(programId: id, path: $path)
            case .edit(let id): ProgramEditView(programId: id)
            }
        }
        .sheet(isPresented: $building) {
            NavigationStack { ProgramBuilderView() }.environment(store)
        }
        .confirmationDialog("Discard \(store.currentTitle)?", isPresented: $confirmingDiscard, titleVisibility: .visible) {
            Button("Discard workout", role: .destructive) { store.discardWorkout() }
        } message: {
            Text("Its logged sets are deleted. History is not changed.")
        }
        .onAppear {
            store.reload()
            DebugHooks.openTrainingRoute(store: store, path: &path, building: &building)
            DebugHooks.applySavedDemo(store: store)
        }
    }

    private var pinnedBlock: some View {
        FolderBlock(title: "Pinned workouts") {
            ForEach(Array(store.pinnedWorkouts.enumerated()), id: \.element.id) { i, w in
                if i > 0 { RowDivider() }
                QuickRow(title: w.name, subtitle: "\(w.exerciseCount) \(w.exerciseCount == 1 ? "exercise" : "exercises")",
                         action: "Start", icon: "play.fill") { store.startSavedWorkout(w.id, name: w.name) }
            }
        }
    }

    private var recentBlock: some View {
        FolderBlock(title: "Recent") {
            ForEach(Array(store.recentWorkouts.enumerated()), id: \.element.id) { i, w in
                if i > 0 { RowDivider() }
                let subtitle = ([SavedFormat.short(w.completedAt)] + [w.durationSeconds.map(Format.minutes)].compactMap { $0 })
                    .joined(separator: " · ")
                QuickRow(title: w.name, subtitle: subtitle, action: w.canRepeat ? "Repeat" : nil, icon: "arrow.counterclockwise") {
                    store.repeatWorkout(w.id, name: w.name)
                }
            }
        }
    }

    @ViewBuilder
    private func upNextBlock(_ program: ProgramDetail) -> some View {
        FolderBlock(title: "Up next", tone: .active, trailing: {
            NavigationLink(value: TrainingRoute.program(program.id)) {
                Text(program.name).font(.footnote.weight(.semibold)).lineLimit(1)
            }
            .frame(minHeight: 32)
        }) {
            VStack(alignment: .leading, spacing: 12) {
                if let next = store.upNext {
                    Text("Week \(next.weekNumber) · Day \(next.dayNumber)")
                        .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.mutedForeground)
                    Text(next.workoutName).font(.title2.weight(.bold)).foregroundStyle(Theme.foreground)
                    if let w = program.weeks.flatMap(\.workouts).first(where: { $0.id == next.workoutId }) {
                        Text(w.exercises.map(\.name).joined(separator: " · "))
                            .font(.subheadline).foregroundStyle(Theme.mutedForeground).lineLimit(2)
                    }
                    // With another workout open this asks to resume or discard it (RootView), never silently.
                    Button(next.hasDraft ? "Resume workout" : "Start workout") { store.startProgramWorkout(next.workoutId) }
                        .buttonStyle(FilledButtonStyle())
                } else if let progress = store.activeProgress, progress.isComplete {
                    Text("Program complete").font(.title2.weight(.bold)).foregroundStyle(Theme.foreground)
                    Text("All \(progress.totalWorkouts) workouts done (cycle \(progress.cycleNumber)). Restart to run it again; your history stays.")
                        .foregroundStyle(Theme.mutedForeground)
                    Button("Restart program") { store.restartProgram(program.id) }
                        .buttonStyle(FilledButtonStyle())
                } else {
                    Text("This program has no workouts yet.").foregroundStyle(Theme.mutedForeground)
                    NavigationLink("Edit program", value: TrainingRoute.edit(program.id))
                        .buttonStyle(OutlineButtonStyle())
                }
            }
            .padding(16)
        }
    }

    private func weekBlock(_ program: ProgramDetail, _ week: ProgramWeek) -> some View {
        FolderBlock(title: "Week \(week.weekNumber) of \(program.weeks.count)") {
            ForEach(Array(week.workouts.enumerated()), id: \.element.id) { i, w in
                if i > 0 { RowDivider() }
                WorkoutRow(workout: w, done: store.activeDone.contains(w.id), isNext: store.upNext?.workoutId == w.id) {
                    store.startProgramWorkout(w.id)
                }
            }
        }
    }
}

/// One program workout: day, name, exercises, and a done check. Tapping starts it.
struct WorkoutRow: View {
    let workout: ProgramWorkout
    let done: Bool
    var isNext = false
    let start: () -> Void

    var body: some View {
        Button(action: start) {
            HStack(spacing: 12) {
                Image(systemName: done ? "checkmark.circle.fill" : isNext ? "arrow.right.circle" : "circle")
                    .font(.title3)
                    .foregroundStyle(done ? Theme.primary : isNext ? Theme.accent : Theme.border)
                VStack(alignment: .leading, spacing: 2) {
                    Text(Format.dayTitle(workout.dayNumber, workout.name))
                        .font(.headline).foregroundStyle(Theme.foreground)
                    Text(workout.exercises.isEmpty ? "No exercises" : workout.exercises.map(\.name).joined(separator: ", "))
                        .font(.caption).foregroundStyle(Theme.mutedForeground).lineLimit(1)
                }
                Spacer()
                Image(systemName: "play.fill").font(.caption).foregroundStyle(Theme.mutedForeground)
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 60)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Start day \(workout.dayNumber), \(workout.name)\(done ? ", done" : "")")
    }
}

/// A pinned or recent workout: name, subtitle, and one button (Start, Repeat) when there is one.
struct QuickRow: View {
    let title: String
    let subtitle: String
    let action: String?
    let icon: String
    let perform: () -> Void
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8)) : AnyLayout(HStackLayout(spacing: 12))
        layout {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.headline).foregroundStyle(Theme.foreground)
                Text(subtitle).font(.subheadline).foregroundStyle(Theme.mutedForeground)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if let action {
                Button(action: perform) { Label(action, systemImage: icon) }
                    .buttonStyle(OutlineButtonStyle())
                    .frame(maxWidth: typeSize.isAccessibilitySize ? .infinity : 140)
                    .accessibilityLabel("\(action) \(title)")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .frame(minHeight: 60)
    }
}

enum PlanFormat {
    /// "3 × 5 @ 65%, 1 × AMRAP": runs of identical sets collapsed.
    static func summary(_ sets: [ProgramSetDetail]) -> String {
        var runs: [(count: Int, label: String)] = []
        for s in sets {
            let label = self.label(s)
            if let last = runs.last, last.label == label { runs[runs.count - 1].count += 1 } else { runs.append((1, label)) }
        }
        return runs.map { "\($0.count) × \($0.label)" }.joined(separator: ", ")
    }

    static func label(_ s: ProgramSetDetail) -> String {
        var out = s.reps
        if let w = s.weight, !w.isEmpty { out += " @ \(w)" }
        if let rpe = s.rpe { out += " RPE \(rpe)" }
        if let rir = s.rir { out += " RIR \(rir)" }
        if s.isWarmup { out += " (warm-up)" }
        return out
    }
}
