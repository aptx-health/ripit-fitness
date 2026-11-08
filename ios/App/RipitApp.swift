// Ripit for iPhone, slice 1 (work item 154): log an ad-hoc workout into a local SQLite database.
// Slice 3 (work item 161) adds a Training tab for programs beside History; slice 4 (168) adds Progress;
// slice 6 (180) adds Library › Workouts and the summary after Finish; slice 7 (185) adds Settings and
// the web's themes, applied live: the tabs are rebuilt whenever the look changes.
// No account, no network. Logic lives in RipitCore; this target is the SwiftUI layer.

import RipitCore
import SwiftUI

@main
struct RipitApp: App {
    @State private var store: WorkoutStore
    @State private var settings = SettingsModel()

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
                .environment(settings)
        }
    }
}

struct RootView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(SettingsModel.self) private var settings
    @Environment(\.accessibilityReduceMotion) private var osReduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var path: [String] = []
    @State private var trainingPath: [TrainingRoute] = []
    @State private var progressPath: [String] = []
    @State private var settingsPath: [SettingsRoute] = DebugHooks.flag("demoThemePicker") ? [.theme] : []
    @State private var tab = DebugHooks.flag("demoHistoryTab") ? 1 : DebugHooks.flag("demoProgressTab") ? 2
        : DebugHooks.flag("demoLibraryTab") ? 3 : DebugHooks.flag("demoSettingsTab") ? 4 : 0

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
                    NavigationStack { LibraryView() }
                        .tabItem { Label("Library", systemImage: "square.grid.2x2") }
                        .tag(3)
                    NavigationStack(path: $path) { HistoryView(path: $path) }
                        .tabItem { Label("History", systemImage: "clock") }
                        .tag(1)
                    NavigationStack(path: $progressPath) { ProgressTabView(path: $progressPath) }
                        .tabItem { Label("Progress", systemImage: "chart.line.uptrend.xyaxis") }
                        .tag(2)
                    NavigationStack(path: $settingsPath) { SettingsView(path: $settingsPath) }
                        .tabItem { Label("Settings", systemImage: "gearshape") }
                        .tag(4)
                }
                    // A new theme or E-ink display rebuilds the tabs, so every Theme color and font is
                    // read again; the selected tab and each tab's navigation path are kept.
                    .id(lookKey)
                    .confirmationDialog("\(store.currentTitle) is in progress",
                                        isPresented: Binding(get: { store.pendingStart != nil }, set: { if !$0 { store.pendingStart = nil } }),
                                        titleVisibility: .visible, presenting: store.pendingStart) { pending in
                        Button("Resume \(store.currentTitle)") {
                            store.pendingStart = nil
                            store.resumeWorkout()
                        }
                        Button("Discard it and start \(pending.name)", role: .destructive) { store.discardAndStartPending() }
                    } message: { _ in
                        Text("One workout at a time. Discarding deletes its logged sets.")
                    }
                    // The import result shows wherever the import was started.
                    .alert(item: $store.importResult) { result in
                        Alert(title: Text(result.title), message: Text(result.message), dismissButton: .default(Text("OK")))
                    }
                    .fullScreenCover(isPresented: $store.showingWorkout, onDismiss: {
                        // The summary opens once the workout screen has gone (it replaces going straight back).
                        if let id = store.justFinished { store.summary = FinishedWorkout(id: id) }
                        store.justFinished = nil
                    }) {
                        NavigationStack { WorkoutView() }
                            .environment(store)
                            .environment(settings)
                    }
                    .sheet(item: $store.summary) { finished in
                        NavigationStack {
                            SummaryView(completionId: finished.id) {
                                store.summary = nil
                                tab = 3
                            }
                        }
                        .environment(store)
                    }
            }
        }
        .tint(Theme.text(Theme.primary))
        .background(Theme.background)
        .font(.ripit(.body))
        // From the theme's background, not the mode: some themes stay dark in "light" mode.
        .preferredColorScheme(lookIsDark ? .dark : .light)
        // Motion is off with E-ink display on or the OS's Reduce Motion (lib/display.ts).
        .transaction { t in
            if (try? DisplayRules.reducedMotion(einkDisplay: settings.settings.einkDisplay, osReduceMotion: osReduceMotion)) == true {
                t.animation = nil
                t.disablesAnimations = true
            }
        }
    }

    /// Read from the observed settings, so a change re-renders RootView after `Look` has the new values.
    /// A new text size also rescales the native bars' titles, which only new bars pick up.
    private var lookKey: String {
        _ = settings.settings
        Look.setTextSize(UIContentSizeCategory(typeSize))
        return Look.key
    }

    private var lookIsDark: Bool {
        _ = settings.settings
        return Look.isDark
    }
}
