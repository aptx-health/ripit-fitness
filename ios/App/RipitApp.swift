// Ripit for iPhone, slice 1 (work item 154): log an ad-hoc workout into a local SQLite database.
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

    var body: some View {
        @Bindable var store = store
        Group {
            if let error = store.openError {
                ContentUnavailableView("Can't open your data", systemImage: "exclamationmark.triangle",
                                       description: Text(error))
            } else {
                NavigationStack(path: $path) { HistoryView(path: $path) }
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
