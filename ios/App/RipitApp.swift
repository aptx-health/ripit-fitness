// Ripit for iPhone, slice 1 (work item 154): log an ad-hoc workout into a local SQLite database.
// Slice 3 (work item 161) adds a Training tab for programs beside History.
// No account, no network. Logic lives in RipitCore; this target is the SwiftUI layer.

import SwiftUI

@main
struct RipitApp: App {
    @State private var store: WorkoutStore

    init() {
        let url = WorkoutStore.databaseURL
        DebugHooks.applyBeforeOpen(databaseURL: url)
        let store = WorkoutStore(databaseURL: url)
        DebugHooks.applyAfterOpen(store: store)
        _store = State(initialValue: store)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
        }
    }
}

struct RootView: View {
    @Environment(WorkoutStore.self) private var store
    @State private var path: [String] = []
    @State private var trainingPath: [TrainingRoute] = []
    @State private var tab = DebugHooks.flag("demoHistoryTab") ? 1 : 0

    var body: some View {
        @Bindable var store = store
        Group {
            if let error = store.openError {
                ContentUnavailableView("Can't open your data", systemImage: "exclamationmark.triangle",
                                       description: Text(error))
            } else {
                TabView(selection: $tab) {
                    NavigationStack(path: $trainingPath) { TrainingView(path: $trainingPath) }
                        .tabItem { Label("Training", systemImage: "figure.strengthtraining.traditional") }
                        .tag(0)
                    NavigationStack(path: $path) { HistoryView(path: $path) }
                        .tabItem { Label("History", systemImage: "clock") }
                        .tag(1)
                }
                    .fullScreenCover(isPresented: $store.showingWorkout) {
                        NavigationStack { WorkoutView() }
                            .environment(store)
                    }
            }
        }
        .tint(Theme.primary)
        .background(Theme.background)
    }
}
