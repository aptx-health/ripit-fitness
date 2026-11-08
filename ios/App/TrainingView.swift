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
    @State private var quickTab: QuickTab?
    @State private var programTab: ProgramTab = DebugHooks.string("demoTab") == "program" ? .program : .upNext

    enum QuickTab { case pinned, recent }
    enum ProgramTab { case upNext, program }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                PageTitle("TRAINING")

                // Any workout in progress, program or ad-hoc, even if its program was archived since.
                if let current = store.current {
                    FolderBlock(title: "In progress", tone: .active) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(store.currentTitle).font(.ripit(.headline)).foregroundStyle(Theme.foreground)
                            Text("Started \(Format.day(current.startedAt)), \(Format.time(current.startedAt)) · \(Format.counts(exercises: current.exercises.count, sets: current.exercises.reduce(0) { $0 + $1.sets.count }))")
                                .font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
                            Text("One workout at a time: finish or discard this one to start another.")
                                .font(.ripit(.caption)).foregroundStyle(Theme.mutedForeground)
                            Button("Resume workout") { store.resumeWorkout() }
                                .buttonStyle(FilledButtonStyle())
                            Button("Discard") { confirmingDiscard = true }
                                .buttonStyle(OutlineButtonStyle(tint: Theme.error))
                        }
                        .padding(16)
                    }
                }

                if !store.pinnedWorkouts.isEmpty || !store.recentWorkouts.isEmpty { quickBlock }

                if let program = store.activeProgram {
                    programBlock(program)
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

    /// Pinned | Recent, folder tabs that switch in place like the web's. Opens on Pinned when
    /// there are pins, else Recent.
    private var quickBlock: some View {
        let initial: QuickTab = store.pinnedWorkouts.isEmpty || DebugHooks.string("demoTab") == "recent" ? .recent : .pinned
        return FolderTabs(items: [FolderTabItem(tab: QuickTab.pinned, title: "Pinned (\(store.pinnedWorkouts.count))", icon: "pin"),
                                  FolderTabItem(tab: .recent, title: "Recent", icon: "clock")],
                          selection: Binding(get: { quickTab ?? initial }, set: { quickTab = $0 })) { tab in
            switch tab {
            case .pinned: pinnedRows
            case .recent: recentRows
            }
        }
    }

    @ViewBuilder
    private var pinnedRows: some View {
        if store.pinnedWorkouts.isEmpty {
            Text("Pin a saved workout in Library to start it here in one tap.")
                .font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground).padding(16)
        }
        ForEach(Array(store.pinnedWorkouts.enumerated()), id: \.element.id) { i, w in
            if i > 0 { RowDivider() }
            QuickRow(title: w.name, subtitle: "\(w.exerciseCount) \(w.exerciseCount == 1 ? "exercise" : "exercises")",
                     action: "Start", icon: "play.fill") { store.startSavedWorkout(w.id, name: w.name) }
        }
    }

    @ViewBuilder
    private var recentRows: some View {
        if store.recentWorkouts.isEmpty {
            Text("Finished workouts show here, ready to repeat.")
                .font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground).padding(16)
        }
        ForEach(Array(store.recentWorkouts.enumerated()), id: \.element.id) { i, w in
            if i > 0 { RowDivider() }
            let subtitle = ([SavedFormat.short(w.completedAt)] + [w.durationSeconds.map(Format.minutes)].compactMap { $0 })
                .joined(separator: " · ")
            QuickRow(title: w.name, subtitle: subtitle, action: w.canRepeat ? "Repeat" : nil, icon: "arrow.counterclockwise") {
                store.repeatWorkout(w.id, name: w.name)
            }
        }
    }

    /// Up Next | Active Program, like the web's: the next workout, or the program and its current week.
    private func programBlock(_ program: ProgramDetail) -> some View {
        FolderTabs(items: [FolderTabItem(tab: ProgramTab.upNext, title: "Up next", icon: "play", tone: .active),
                           FolderTabItem(tab: .program, title: "Active program", icon: "book")],
                   selection: $programTab) { tab in
            switch tab {
            case .upNext: upNext(program)
            case .program: activeProgram(program)
            }
        }
    }

    @ViewBuilder
    private func upNext(_ program: ProgramDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(program.name).font(.ripit(.subheadline, .bold)).display(1).foregroundStyle(Theme.text(Theme.primary))
            if let next = store.upNext {
                Text("Week \(next.weekNumber) · Day \(next.dayNumber)")
                    .font(.ripit(.subheadline, .semibold)).foregroundStyle(Theme.mutedForeground)
                Text(next.workoutName).font(.ripit(.title2, .bold)).foregroundStyle(Theme.foreground)
                if let w = program.weeks.flatMap(\.workouts).first(where: { $0.id == next.workoutId }) {
                    Text(w.exercises.map(\.name).joined(separator: " · "))
                        .font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground).lineLimit(2)
                }
                // With another workout open this asks to resume or discard it (RootView), never silently.
                Button(next.hasDraft ? "Resume workout" : "Start workout") { store.startProgramWorkout(next.workoutId) }
                    .buttonStyle(FilledButtonStyle())
            } else if let progress = store.activeProgress, progress.isComplete {
                Text("Program complete").font(.ripit(.title2, .bold)).foregroundStyle(Theme.foreground)
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

    @ViewBuilder
    private func activeProgram(_ program: ProgramDetail) -> some View {
        NavigationLink(value: TrainingRoute.program(program.id)) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(program.name).font(.ripit(.title3, .bold)).display(1).foregroundStyle(Theme.foreground)
                    if let week = store.currentWeek {
                        Text("Week \(week) of \(program.weeks.count)")
                            .font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
                    }
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.ripit(.footnote, .bold)).foregroundStyle(Theme.mutedForeground)
            }
            .padding(16)
            .frame(minHeight: Theme.touch)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityHint("Opens the program")
        if let week = program.weeks.first(where: { $0.weekNumber == store.currentWeek }) {
            ForEach(week.workouts) { w in
                RowDivider()
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
                    .font(.ripit(.title3))
                    .foregroundStyle(done ? Theme.text(Theme.primary) : isNext ? Theme.text(Theme.accent) : Theme.border)
                VStack(alignment: .leading, spacing: 2) {
                    Text(Format.dayTitle(workout.dayNumber, workout.name))
                        .font(.ripit(.headline)).foregroundStyle(Theme.foreground)
                    Text(workout.exercises.isEmpty ? "No exercises" : workout.exercises.map(\.name).joined(separator: ", "))
                        .font(.ripit(.caption)).foregroundStyle(Theme.mutedForeground).lineLimit(1)
                }
                Spacer()
                Image(systemName: "play.fill").font(.ripit(.caption)).foregroundStyle(Theme.mutedForeground)
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
                Text(title).font(.ripit(.headline)).foregroundStyle(Theme.foreground)
                Text(subtitle).font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
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
