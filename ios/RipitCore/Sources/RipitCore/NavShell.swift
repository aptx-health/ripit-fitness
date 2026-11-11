// Public API for slice 9a, the web's bottom bar and quick actions (features/ios-app/nav-shell.feature).
// Shapes were fixed by work item 198. Every body is a stub that throws `RipitCoreError.notImplemented`;
// the slice 9a implementer (work item 199) replaces them. The tests in
// Tests/RipitCoreTests/NavShellTests.swift are the contract: change the bodies, not the shapes.
//
// The rules are the web's (initiatives/ios-app/logger-nav-discovery.md §3-5):
// - The bar (components/BottomNav.tsx): Training · Library · Workout · Progress · Settings. The Workout
//   chip is not a tab: it opens Quick Actions. Tapping a tab switches to it; tapping the tab already
//   selected returns it to its first screen.
// - Where things live (lib/nav/active-tab.ts, Dustin 2026-11-10 on item 196): programs, a program, its
//   editor and the builder are Library's, as are saved workouts. There is no History tab: the history
//   list and a finished workout are Training's (Training › Recent). After the summary closes, the phone
//   lands on Training.
// - The chip (BottomNav.tsx:44-47): VoiceOver reads "Quick actions", or with an open workout "Resume draft
//   workout: {name}", where the name is the program workout's name, else the workout's own name, else
//   "Open Workout" (app/api/workouts/active-draft/route.ts:41). It pulses only with an open workout, and
//   not when motion is reduced (DisplayRules.reducedMotion).
// - Quick actions (components/QuickActionSheet.tsx):
//   - With an open workout: one row, titled "Freestyle workout" for an ad-hoc workout, else the workout's
//     name, subtitled "In progress · tap to resume", with a discard button and the footer "Continue or
//     discard your draft to unlock other actions". Nothing else.
//   - Otherwise: "Continue your program" ("Week 3 · Day 1 · Upper Body", or "No active program" and not
//     tappable), "Freestyle workout" ("Log sets as you go"), and "My saved workouts" ("1 saved",
//     "4 saved") only when at least one is saved. No footer.
//   - The web shows "Loading…" while it fetches the next workout; the phone reads it locally, so it never
//     does. The web's follow-along heads-up before Freestyle is out of scope (item 196).
// - Discard (QuickActionSheet.tsx:242-265): the first tap arms it; a second tap less than 4 s later
//   discards. At 4 s it disarms, so a tap then arms again. Closing the card or the workout changing
//   resets it.

import Foundation

// MARK: - The bar

/// The four tabs. The Workout chip sits between Library and Progress and is not a tab.
public enum ShellTab: String, CaseIterable, Sendable, Codable {
    case training, library, progress, settings
}

/// What the bar shows, left to right.
public enum ShellBarItem: Sendable, Equatable {
    case tab(ShellTab)
    case workout
}

/// What a tap on a tab does.
public enum TabTap: Sendable, Equatable {
    case switchTo(ShellTab)
    /// The tab was already selected: return it to its first screen.
    case popToRoot(ShellTab)
}

/// Screens the shell has to place in a tab.
public enum ShellDestination: Sendable, Equatable, CaseIterable {
    case trainingHome
    /// The full history list ("See all" under Training › Recent).
    case historyList
    /// One finished workout.
    case finishedWorkout
    case libraryWorkouts
    case libraryPrograms
    case programDetail
    case programEdit
    case programBuilder
    case progressHome
    case liftPage
    case settingsHome
    case themePicker
}

/// What the Workout chip says and does.
public struct WorkoutButtonState: Sendable, Equatable {
    public let accessibilityLabel: String
    public let pulses: Bool

    public init(accessibilityLabel: String, pulses: Bool) {
        self.accessibilityLabel = accessibilityLabel
        self.pulses = pulses
    }
}

/// The workout in progress, as the shell sees it.
public struct OpenWorkout: Sendable, Equatable {
    /// A freestyle (ad-hoc) workout, including a started saved workout or a repeat.
    public let isFreestyle: Bool
    /// The program workout's name ("Upper Body"), else the workout's own name, else nil.
    public let name: String?

    public init(isFreestyle: Bool, name: String?) {
        self.isFreestyle = isFreestyle
        self.name = name
    }
}

public enum NavShell {
    /// The bar's items, left to right.
    public static func barItems() throws -> [ShellBarItem] {
        throw RipitCoreError.notImplemented
    }

    /// A tab's label: "Training", "Library", "Progress", "Settings".
    public static func label(_ tab: ShellTab) throws -> String {
        throw RipitCoreError.notImplemented
    }

    public static func tap(_ tab: ShellTab, selected: ShellTab) throws -> TabTap {
        throw RipitCoreError.notImplemented
    }

    /// The tab a screen belongs to.
    public static func tab(for destination: ShellDestination) throws -> ShellTab {
        throw RipitCoreError.notImplemented
    }

    /// Where the phone lands when the summary after Finish closes.
    public static func tabAfterSummary() throws -> ShellTab {
        throw RipitCoreError.notImplemented
    }

    public static func workoutButton(open: OpenWorkout?, einkDisplay: Bool, osReduceMotion: Bool) throws -> WorkoutButtonState {
        throw RipitCoreError.notImplemented
    }
}

// MARK: - Quick actions

/// Where a quick action goes.
public enum QuickActionTarget: Sendable, Equatable {
    /// Reopen the workout in progress.
    case resumeOpenWorkout
    /// Start (or resume) this program workout in the logger.
    case startProgramWorkout(programId: String, workoutId: String)
    /// An empty freestyle workout.
    case startFreestyle
    /// Library › Workouts.
    case savedWorkouts
}

public enum QuickActionKind: String, Sendable, Equatable {
    case resume, continueProgram, freestyle, savedWorkouts
}

public struct QuickActionRow: Sendable, Equatable {
    public let kind: QuickActionKind
    public let title: String
    public let subtitle: String
    /// nil when the row can't be tapped.
    public let target: QuickActionTarget?

    public init(kind: QuickActionKind, title: String, subtitle: String, target: QuickActionTarget?) {
        self.kind = kind
        self.title = title
        self.subtitle = subtitle
        self.target = target
    }
}

public struct QuickActionsMenu: Sendable, Equatable {
    public let rows: [QuickActionRow]
    /// The trash button on the resume row.
    public let showsDiscard: Bool
    public let footer: String?

    public init(rows: [QuickActionRow], showsDiscard: Bool, footer: String?) {
        self.rows = rows
        self.showsDiscard = showsDiscard
        self.footer = footer
    }
}

public enum QuickActions {
    /// What the card offers. `next` is the active program's next workout (nil with no active program);
    /// `savedCount` counts saved workouts that aren't archived.
    public static func menu(open: OpenWorkout?, next: UpNext?, savedCount: Int) throws -> QuickActionsMenu {
        throw RipitCoreError.notImplemented
    }
}

/// The discard button's two-tap confirm.
public struct DiscardConfirm: Sendable, Equatable {
    /// How long an armed button waits for the second tap.
    public static let window: TimeInterval = 4

    public private(set) var armedAt: Date?

    public init() {}

    /// A tap at `now`. Returns true when this tap discards; otherwise the button is now armed.
    public mutating func tap(at now: Date) throws -> Bool {
        throw RipitCoreError.notImplemented
    }

    /// Armed, so the button shows "Confirm" in red.
    public func isArmed(at now: Date) throws -> Bool {
        throw RipitCoreError.notImplemented
    }

    /// The card closed or the workout changed.
    public mutating func reset() throws {
        throw RipitCoreError.notImplemented
    }
}
