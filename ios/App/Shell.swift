// Slice 9a (work item 199): the web's bottom bar (components/BottomNav.tsx) and its Quick Actions card
// (components/QuickActionSheet.tsx) in place of Apple's tab bar. The rules (order, pop to root, the
// chip's label and pulse, the card's rows and the discard confirm) are RipitCore's NavShell; this is
// how they look. RootView keeps a TabView with one NavigationStack per tab and draws RipitTabBar under it.

import RipitCore
import SwiftUI
import UIKit

/// Program screens, pushed in Library.
enum LibraryRoute: Hashable {
    case program(String)
    case edit(String)
}

enum LibrarySection: Hashable { case workouts, programs }

/// Which tab is showing, each tab's navigation, and the Quick Actions card. Screens use it to move
/// between tabs (Training's active program opens in Library, as on the web).
@MainActor
@Observable
final class Shell {
    var tab: ShellTab
    var trainingPath: [TrainingRoute] = []
    var libraryPath: [LibraryRoute] = []
    var progressPath: [String] = []
    var settingsPath: [SettingsRoute] = []
    var librarySection: LibrarySection = .workouts
    var showingQuickActions = false

    init(tab: ShellTab = .training) { self.tab = tab }

    /// A tap on a tab: switch to it, or return the selected one to its first screen.
    func tap(_ tapped: ShellTab) {
        guard let action = try? NavShell.tap(tapped, selected: tab) else { return }
        switch action {
        case .switchTo(let t): tab = t
        case .popToRoot(let t):
            switch t {
            case .training: trainingPath = []
            case .library: libraryPath = []
            case .progress: progressPath = []
            case .settings: settingsPath = []
            }
        }
    }

    /// Library › Programs, optionally with a program (and its editor) open.
    func showPrograms(_ route: [LibraryRoute] = []) {
        librarySection = .programs
        libraryPath = route
        tab = .library
    }

    func showSavedWorkouts() {
        librarySection = .workouts
        libraryPath = []
        tab = .library
    }

    func afterSummary() {
        tab = (try? NavShell.tabAfterSummary()) ?? .training
    }
}

extension ShellTab {
    var icon: String {
        switch self {
        case .training: "waveform.path.ecg"
        case .library: "square.grid.2x2"
        case .progress: "chart.line.uptrend.xyaxis"
        case .settings: "gearshape"
        }
    }
}

// MARK: - The bar

/// Training · Library · WORKOUT · Progress · Settings: a 56pt row on the muted background with a 2pt
/// top border. The active tab is "lit" (Dustin 2026-11-11, option B): an accent-muted block with a 3pt
/// accent top edge slides under it, its label is in the accent color, and the other tabs dim to 80% (60% was
/// too faint to read in the light themes).
/// E-ink keeps its bold underlined label. Each tab change gives a light selection haptic.
struct RipitTabBar: View {
    @Environment(Shell.self) private var shell
    @Environment(WorkoutStore.self) private var store
    @Environment(SettingsModel.self) private var settings
    @Environment(\.accessibilityReduceMotion) private var osReduceMotion

    var body: some View {
        let items = (try? NavShell.barItems()) ?? []
        HStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                switch item {
                case .tab(let t):
                    TabButton(tab: t, selected: shell.tab == t) {
                        // The marker slides (RootView turns motion off with Reduce Motion or E-ink).
                        withAnimation(.easeOut(duration: 0.22)) { shell.tap(t) }
                    }
                case .workout:
                    WorkoutChip(state: chipState) { shell.showingQuickActions = true }
                }
            }
        }
        .frame(height: Self.rowHeight)
        .background(alignment: .topLeading) {
            // Every slot is the same width, so the marker sits at the selected slot's offset. It runs up over
            // the bar's 2pt top border.
            GeometryReader { geo in
                let slot = geo.size.width / CGFloat(max(items.count, 1))
                let index = items.firstIndex { if case .tab(let t) = $0 { t == shell.tab } else { false } } ?? 0
                Rectangle()
                    .fill(Theme.accentMuted)
                    .overlay(alignment: .top) { Rectangle().fill(Theme.edge(Theme.accent)).frame(height: 3) }
                    .frame(width: slot, height: geo.size.height + 4)
                    .offset(x: slot * CGFloat(index), y: -2)
            }
            .accessibilityHidden(true)
        }
        .sensoryFeedback(.selection, trigger: shell.tab)
        // Apple's bar keeps its labels small at every text size; this one does too, and a long press
        // shows the label large instead.
        .dynamicTypeSize(...DynamicTypeSize.large)
        .padding(.bottom, 2)
    }

    /// The web's 56px row.
    static let rowHeight: CGFloat = 56
    /// The bar's height above the home indicator: the row, its 2pt bottom padding.
    static let height: CGFloat = rowHeight + 2

    private var chipState: WorkoutButtonState {
        (try? NavShell.workoutButton(open: store.openWorkout, einkDisplay: settings.settings.einkDisplay,
                                     osReduceMotion: osReduceMotion))
            ?? WorkoutButtonState(accessibilityLabel: "Quick actions", pulses: false)
    }
}

private struct TabButton: View {
    let tab: ShellTab
    let selected: Bool
    let action: () -> Void

    var body: some View {
        let label = (try? NavShell.label(tab)) ?? ""
        Button(action: action) {
            VStack(spacing: 2) {
                Image(systemName: tab.icon).font(.system(size: 20))
                Text(label)
                    .font(.custom(RipitFont.name(selected ? .bold : .semibold), fixedSize: 11))
                    .underline(selected && Look.isPaper, pattern: .solid)
                    .lineLimit(1)
            }
            .foregroundStyle(selected ? Theme.text(Theme.accent) : Theme.mutedForeground)
            .opacity(selected ? 1 : 0.8)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .frame(minWidth: Theme.touch, minHeight: Theme.touch)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityShowsLargeContentViewer {
            Image(systemName: tab.icon)
            Text(label)
        }
        .accessibilityLabel(label)
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }
}

/// The raised WORKOUT chip: 64×52, lifted 4pt, an accent fill on a hard accent-hover bottom edge,
/// pressed 3pt down. With a workout open it glows in the warning color and a shine sweeps it every 7 s.
private struct WorkoutChip: View {
    let state: WorkoutButtonState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            EmptyView()
        }
        .buttonStyle(ChipStyle(pulses: state.pulses))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityLabel(state.accessibilityLabel)
        .accessibilityShowsLargeContentViewer {
            Image(systemName: "dumbbell.fill")
            Text("Workout")
        }
    }
}

private struct ChipStyle: ButtonStyle {
    let pulses: Bool

    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: 6)
        let depth: CGFloat = Look.isPaper ? 0 : 5
        let pressed = configuration.isPressed ? min(3, depth) : 0
        VStack(spacing: 2) {
            Image(systemName: "dumbbell.fill").font(.system(size: 18, weight: .heavy))
            Text("WORKOUT").font(.custom(RipitFont.name(.bold), fixedSize: 9)).tracking(0.9)
        }
        .foregroundStyle(Theme.accentForeground)
        .frame(width: 64, height: 52)
        .background(Theme.accent, in: shape)
        .overlay { if pulses { Shine().clipShape(shape) } }
        .overlay { if Look.isPaper { shape.strokeBorder(Theme.border, lineWidth: Theme.line) } }
        .background {
            shape.fill(Look.palette.color("accent-hover")).offset(y: depth - pressed)
        }
        .background { if pulses { Pulse(shape: shape) } }
        .offset(y: -4 + pressed)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .contentShape(Rectangle())
    }
}

/// globals.css doom-pulse: a warning-colored glow, 20pt at 30% to 40pt at 60% and back, every 2 s.
private struct Pulse: View {
    let shape: RoundedRectangle

    var body: some View {
        let warning = Look.palette.color("warning")
        PhaseAnimator([false, true]) { on in
            // Drawn behind the chip, so only the glow shows.
            shape.fill(warning)
                .shadow(color: warning.opacity(on ? 0.6 : 0.3), radius: on ? 20 : 10)
                .shadow(color: warning.opacity(on ? 0.6 : 0.3), radius: on ? 20 : 10)
        } animation: { _ in .easeInOut(duration: 1) }
    }
}

/// globals.css chip-gold-shine: a thin white streak across the top edge, once every 7 s.
private struct Shine: View {
    var body: some View {
        GeometryReader { geo in
            PhaseAnimator([false, true]) { across in
                LinearGradient(colors: [.clear, .white.opacity(0.85), .clear], startPoint: .leading, endPoint: .trailing)
                    .frame(width: geo.size.width * 0.35, height: 3)
                    .blur(radius: 0.5)
                    .offset(x: across ? geo.size.width * 1.2 : -geo.size.width * 0.5, y: 1)
                    .opacity(across ? 1 : 0)
            } animation: { across in across ? .easeInOut(duration: 1.3).delay(5.6) : nil }
        }
        .allowsHitTesting(false)
    }
}

// MARK: - Quick actions

/// The web's Quick Actions folder card, floating above the bar over a dim backdrop. It closes with ✕ or
/// a tap on the backdrop.
struct QuickActionsOverlay: View {
    @Environment(Shell.self) private var shell
    @Environment(WorkoutStore.self) private var store
    @State private var discard = DiscardConfirm()
    @State private var now = Date()

    var body: some View {
        ZStack(alignment: .bottom) {
            if shell.showingQuickActions {
                Color.black.opacity(0.55)
                    .ignoresSafeArea()
                    .onTapGesture { close() }
                    .accessibilityHidden(true)
                    .transition(.opacity)
                card
                    .padding(.horizontal, 8)
                    .padding(.bottom, 64)
                    .frame(maxWidth: 448)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeOut(duration: 0.2), value: shell.showingQuickActions)
        .onChange(of: shell.showingQuickActions) { try? discard.reset() }
        .onChange(of: store.current?.id) { try? discard.reset() }
    }

    private var menu: QuickActionsMenu {
        let g = store.savedGroups
        let saved = g.new.count + g.pinned.count + g.recent.count + g.older.count
        return (try? QuickActions.menu(open: store.openWorkout, next: store.upNext, savedCount: saved))
            ?? QuickActionsMenu(rows: [], showsDiscard: false, footer: nil)
    }

    private var card: some View {
        let menu = menu
        return VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .bottom, spacing: 0) {
                FolderTab(title: "Quick actions", icon: "bolt", tone: .active)
                    .accessibilityAddTraits(.isHeader)
                Spacer(minLength: 0)
                Button { close() } label: {
                    Image(systemName: "xmark").font(.system(size: 18, weight: .semibold))
                        .frame(width: Theme.touch, height: Theme.touch)
                        .background(Theme.card)
                        .overlay(Rectangle().strokeBorder(Theme.edge(Theme.primary), lineWidth: Theme.folderLine))
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.foreground)
                .accessibilityLabel("Close")
            }
            VStack(spacing: 0) {
                ForEach(Array(menu.rows.enumerated()), id: \.offset) { i, row in
                    if i > 0 { RowDivider() }
                    HStack(spacing: 0) {
                        ActionRow(row: row) { go(row.target) }
                        if row.kind == .resume && menu.showsDiscard { discardButton }
                    }
                }
                if let footer = menu.footer {
                    RowDivider()
                    Text(footer)
                        .font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
                        .padding(.horizontal, 16).padding(.vertical, 12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .background(Theme.card)
            .overlay(Rectangle().strokeBorder(Theme.edge(Theme.primary), lineWidth: Theme.folderLine))
            .shadow(color: .black.opacity(Look.isPaper ? 0 : 0.35), radius: 12, y: -8)
        }
        // Capped so the card still fits over the screen at the largest sizes; titles wrap, never truncate.
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
        .accessibilityAction(.escape) { close() }
    }

    /// The trash button: the first tap shows a red Confirm for 4 s, a second tap within it discards.
    private var discardButton: some View {
        TimelineView(.periodic(from: .now, by: 0.5)) { context in
            let armed = (try? discard.isArmed(at: context.date)) ?? false
            Button {
                if (try? discard.tap(at: Date())) == true {
                    store.discardWorkout()
                    close()
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "trash").font(.system(size: 17, weight: .semibold))
                    if armed { Text("CONFIRM").font(.ripit(.caption, .bold)).tracking(1) }
                }
                .padding(.horizontal, 12)
                .frame(minWidth: Theme.touch, minHeight: Theme.touch)
                .background(armed ? Theme.error : Theme.card)
                .foregroundStyle(armed ? Theme.errorForeground : Theme.foreground.opacity(0.7))
                .overlay(Rectangle().strokeBorder(armed ? Theme.error : Theme.border, lineWidth: Theme.line))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .padding(.trailing, 12)
            .accessibilityLabel(armed ? "Confirm discard draft" : "Discard draft")
        }
    }

    private func go(_ target: QuickActionTarget?) {
        guard let target else { return }
        close()
        switch target {
        case .resumeOpenWorkout: store.resumeWorkout()
        case .startProgramWorkout(_, let workoutId): store.startProgramWorkout(workoutId)
        case .startFreestyle: store.startWorkout()
        case .savedWorkouts: shell.showSavedWorkouts()
        }
    }

    private func close() { shell.showingQuickActions = false }
}

private struct ActionRow: View {
    let row: QuickActionRow
    let action: () -> Void

    var body: some View {
        let enabled = row.target != nil
        Button(action: action) {
            HStack(spacing: 12) {
                icon
                VStack(alignment: .leading, spacing: 2) {
                    Text(row.title).font(.ripit(.headline, .bold)).display(1.5)
                        .foregroundStyle(Theme.foreground)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(row.subtitle).font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            .frame(minHeight: 64)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.5)
    }

    /// Continue wears the web's success chip when it can be tapped; the others a plain icon.
    @ViewBuilder
    private var icon: some View {
        let symbol = switch row.kind {
        case .resume, .continueProgram: "play"
        case .freestyle: "dumbbell"
        case .savedWorkouts: "bookmark"
        }
        let chip = row.kind == .continueProgram && row.target != nil
        Image(systemName: symbol).font(.system(size: 20, weight: .semibold))
            .frame(width: 40, height: 40)
            .background(chip ? Look.palette.color("success") : .clear)
            .foregroundStyle(chip ? Look.palette.color("success-foreground") : Theme.foreground)
            .accessibilityHidden(true)
    }
}

extension View {
    /// One tab's stack: Apple's bar hidden, and every scroll view in it (pushed screens too) given a bottom
    /// margin of the web bar's height, so a list's last row scrolls clear of it. Neither the TabView's
    /// safe-area inset nor one on the stack reaches the scroll views; content margins pass down the environment.
    func tabBarInset(keyboardUp: Bool) -> some View {
        toolbar(.hidden, for: .tabBar)
            .contentMargins(.bottom, keyboardUp ? 0 : RipitTabBar.height, for: .automatic)
    }
}

// MARK: - Keyboard

/// Whether the keyboard is up. The bar steps aside while it is, as Apple's does, instead of riding
/// up on top of it.
@MainActor
@Observable
final class KeyboardState {
    private(set) var isUp = false
    @ObservationIgnored private var observers: [NSObjectProtocol] = []

    init() {
        let center = NotificationCenter.default
        observers = [
            center.addObserver(forName: UIResponder.keyboardWillShowNotification, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.isUp = true }
            },
            center.addObserver(forName: UIResponder.keyboardWillHideNotification, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.isUp = false }
            },
        ]
    }
}

// MARK: - The open workout

extension WorkoutStore {
    /// The workout in progress as the shell sees it: a program workout by its name, else freestyle by
    /// its own name (a started saved workout or a repeat).
    var openWorkout: OpenWorkout? {
        guard let current else { return nil }
        if let s = session {
            let name = program(s.programId)?.weeks.flatMap(\.workouts).first { $0.id == s.workoutId }?.name
            return OpenWorkout(isFreestyle: false, name: name)
        }
        return OpenWorkout(isFreestyle: true, name: current.name)
    }
}
