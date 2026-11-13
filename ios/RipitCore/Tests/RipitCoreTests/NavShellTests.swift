// Scenarios of features/ios-app/nav-shell.feature (work item 198) that have a pure rule: the bar's items,
// pop to root, which tab a screen belongs to (History under Training, Programs under Library), landing
// after the summary, the Workout chip's label and pulse, the quick actions offered and where they go,
// and the discard's two-tap confirm. Everything else in the feature is on the reviewer's hands-on list
// (initiatives/ios-app/work/198-handback.md).
//
// Expected values are the web's, cited by line (the rules are inline in JSX, so no golden):
// - components/BottomNav.tsx:12-18 (tabs and labels), :44-47 (chip label), :51-56 (pulse only with a draft)
// - lib/nav/active-tab.ts:7-10 (programs belong to Library), app/api/workouts/active-draft/route.ts:41
// - components/QuickActionSheet.tsx: :267-271 (Continue subtitle), :308-362 (draft row and footer),
//   :403-433 (the three rows; saved only above 0; "1 saved" / "n saved"), :141-164 (targets),
//   :242-265 (arm, then confirm within 4 s)
// - Dustin 2026-11-10 (item 196): no History tab; after the summary, Training.
//
// API used: NavShell.barItems/label/tap/tab(for:)/tabAfterSummary/workoutButton, QuickActions.menu,
// DiscardConfirm, UpNext, OpenWorkout

import Foundation
import Testing
@testable import RipitCore

private let next = UpNext(programId: "p1", workoutId: "w7", workoutName: "Upper Body", weekNumber: 3, dayNumber: 1, hasDraft: false)
private let freestyle = OpenWorkout(isFreestyle: true, name: nil)
private let programDraft = OpenWorkout(isFreestyle: false, name: "Upper Body")

@Suite("Nav shell: the bar")
struct NavShellBarTests {
    @Test("Training, Library, the Workout chip, Progress, Settings, in that order")
    func barOrder() throws {
        #expect(try NavShell.barItems() == [.tab(.training), .tab(.library), .workout, .tab(.progress), .tab(.settings)])
    }

    @Test("There is no History tab")
    func noHistoryTab() {
        #expect(ShellTab.allCases == [.training, .library, .progress, .settings])
    }

    @Test("Tab labels are the web's", arguments: [
        (ShellTab.training, "Training"), (.library, "Library"), (.progress, "Progress"), (.settings, "Settings"),
    ])
    func labels(_ tab: ShellTab, _ label: String) throws {
        #expect(try NavShell.label(tab) == label)
    }

    @Test("Tapping another tab switches to it", arguments: [
        (ShellTab.progress, ShellTab.library), (.training, .settings), (.settings, .training),
    ])
    func switchTab(_ tapped: ShellTab, _ selected: ShellTab) throws {
        #expect(try NavShell.tap(tapped, selected: selected) == .switchTo(tapped))
    }

    @Test("Tapping the selected tab returns it to its first screen", arguments: ShellTab.allCases)
    func popToRoot(_ tab: ShellTab) throws {
        #expect(try NavShell.tap(tab, selected: tab) == .popToRoot(tab))
    }
}

@Suite("Nav shell: where screens live")
struct NavShellPlacesTests {
    @Test("Each screen's tab", arguments: [
        (ShellDestination.trainingHome, ShellTab.training),
        (.historyList, .training), (.finishedWorkout, .training),
        (.libraryWorkouts, .library), (.libraryPrograms, .library),
        (.programDetail, .library), (.programEdit, .library), (.programBuilder, .library),
        (.progressHome, .progress), (.liftPage, .progress),
        (.settingsHome, .settings), (.themePicker, .settings),
    ])
    func placed(_ destination: ShellDestination, _ tab: ShellTab) throws {
        #expect(try NavShell.tab(for: destination) == tab)
    }

    @Test("Every screen is placed")
    func everyScreenPlaced() throws {
        #expect(ShellDestination.allCases.count == 12)
        for d in ShellDestination.allCases { _ = try NavShell.tab(for: d) }
    }

    @Test("Closing the summary lands on Training, not Library")
    func afterSummary() throws {
        #expect(try NavShell.tabAfterSummary() == .training)
    }
}

@Suite("Nav shell: the Workout chip")
struct NavShellChipTests {
    @Test("No open workout: \"Quick actions\", no pulse")
    func noDraft() throws {
        #expect(try NavShell.workoutButton(open: nil, einkDisplay: false, osReduceMotion: false)
            == WorkoutButtonState(accessibilityLabel: "Quick actions", pulses: false))
    }

    @Test("Open workout: \"Resume draft workout: {name}\"", arguments: [
        (OpenWorkout(isFreestyle: false, name: "Upper Body"), "Resume draft workout: Upper Body"),
        (OpenWorkout(isFreestyle: true, name: "Push Day"), "Resume draft workout: Push Day"),
        (OpenWorkout(isFreestyle: true, name: nil), "Resume draft workout: Open Workout"),
    ])
    func draftLabel(_ open: OpenWorkout, _ label: String) throws {
        #expect(try NavShell.workoutButton(open: open, einkDisplay: false, osReduceMotion: false).accessibilityLabel == label)
    }

    @Test("Open workout: pulses unless E-ink or Reduce Motion", arguments: [
        (false, false, true), (true, false, false), (false, true, false), (true, true, false),
    ])
    func pulse(_ eink: Bool, _ os: Bool, _ pulses: Bool) throws {
        let state = try NavShell.workoutButton(open: programDraft, einkDisplay: eink, osReduceMotion: os)
        #expect(state.pulses == pulses)
        #expect(state.accessibilityLabel == "Resume draft workout: Upper Body")
    }
}

@Suite("Quick actions")
struct QuickActionsTests {
    static let continueRow = QuickActionRow(kind: .continueProgram, title: "Continue your program",
                                            subtitle: "Week 3 · Day 1 · Upper Body",
                                            target: .startProgramWorkout(programId: "p1", workoutId: "w7"))
    static let noProgramRow = QuickActionRow(kind: .continueProgram, title: "Continue your program",
                                             subtitle: "No active program", target: nil)
    static let freestyleRow = QuickActionRow(kind: .freestyle, title: "Freestyle workout",
                                             subtitle: "Log sets as you go", target: .startFreestyle)
    static func savedRow(_ subtitle: String) -> QuickActionRow {
        QuickActionRow(kind: .savedWorkouts, title: "My saved workouts", subtitle: subtitle, target: .savedWorkouts)
    }

    @Test("No open workout, a program and saved workouts: all three rows, no discard, no footer")
    func allThree() throws {
        #expect(try QuickActions.menu(open: nil, next: next, savedCount: 2)
            == QuickActionsMenu(rows: [Self.continueRow, Self.freestyleRow, Self.savedRow("2 saved")], showsDiscard: false, footer: nil))
    }

    @Test("Saved workouts: hidden at 0, \"1 saved\", \"n saved\"", arguments: [
        (0, nil), (1, "1 saved"), (12, "12 saved"),
    ] as [(Int, String?)])
    func savedCount(_ count: Int, _ subtitle: String?) throws {
        let rows = try QuickActions.menu(open: nil, next: next, savedCount: count).rows
        #expect(rows.map(\.kind) == (subtitle == nil ? [.continueProgram, .freestyle] : [.continueProgram, .freestyle, .savedWorkouts]))
        if let subtitle { #expect(rows.last == Self.savedRow(subtitle)) }
    }

    @Test("No active program: Continue reads \"No active program\" and can't be tapped; the others still can")
    func noProgram() throws {
        #expect(try QuickActions.menu(open: nil, next: nil, savedCount: 1)
            == QuickActionsMenu(rows: [Self.noProgramRow, Self.freestyleRow, Self.savedRow("1 saved")], showsDiscard: false, footer: nil))
    }

    @Test("Continue's subtitle is Week · Day · name of the next workout", arguments: [
        (UpNext(programId: "p2", workoutId: "w1", workoutName: "Lower A", weekNumber: 1, dayNumber: 4, hasDraft: false), "Week 1 · Day 4 · Lower A"),
        (UpNext(programId: "p2", workoutId: "w9", workoutName: "Day 2: Pull", weekNumber: 12, dayNumber: 2, hasDraft: false), "Week 12 · Day 2 · Day 2: Pull"),
    ])
    func continueSubtitle(_ up: UpNext, _ subtitle: String) throws {
        let row = try QuickActions.menu(open: nil, next: up, savedCount: 0).rows.first
        #expect(row?.subtitle == subtitle)
        #expect(row?.target == .startProgramWorkout(programId: up.programId, workoutId: up.workoutId))
    }

    @Test("Open workout: only it, with discard and the footer; nothing else, whatever else exists", arguments: [
        (programDraft, "Upper Body"), (freestyle, "Freestyle workout"),
        (OpenWorkout(isFreestyle: true, name: "Push Day"), "Freestyle workout"),
    ])
    func draftOnly(_ open: OpenWorkout, _ title: String) throws {
        #expect(try QuickActions.menu(open: open, next: next, savedCount: 3) == QuickActionsMenu(
            rows: [QuickActionRow(kind: .resume, title: title, subtitle: "In progress · tap to resume", target: .resumeOpenWorkout)],
            showsDiscard: true, footer: "Continue or discard your draft to unlock other actions"))
    }

    @Test("Open program workout with no name falls back like the chip")
    func draftNoName() throws {
        let row = try QuickActions.menu(open: OpenWorkout(isFreestyle: false, name: nil), next: nil, savedCount: 0).rows
        #expect(row == [QuickActionRow(kind: .resume, title: "Open Workout", subtitle: "In progress · tap to resume", target: .resumeOpenWorkout)])
    }
}

@Suite("Quick actions: discard confirm")
struct DiscardConfirmTests {
    static let t0 = Clock.at(2026, 11, 10, 18)
    static func at(_ s: TimeInterval) -> Date { t0.addingTimeInterval(s) }

    @Test("The first tap arms; it doesn't discard")
    func firstTapArms() throws {
        var d = DiscardConfirm()
        #expect(try d.isArmed(at: Self.at(0)) == false)
        #expect(try d.tap(at: Self.at(0)) == false)
        #expect(try d.isArmed(at: Self.at(0)) == true)
    }

    @Test("A second tap within 4 s discards", arguments: [0.3, 2.0, 3.99])
    func secondTapDiscards(_ later: TimeInterval) throws {
        var d = DiscardConfirm()
        _ = try d.tap(at: Self.at(10))
        #expect(try d.tap(at: Self.at(10 + later)) == true)
    }

    @Test("At 4 s it disarms, and a tap then arms again", arguments: [4.0, 4.5, 60])
    func expires(_ later: TimeInterval) throws {
        var d = DiscardConfirm()
        _ = try d.tap(at: Self.at(10))
        #expect(try d.isArmed(at: Self.at(10 + later)) == false)
        #expect(try d.tap(at: Self.at(10 + later)) == false)
        #expect(try d.isArmed(at: Self.at(10 + later)) == true)
        #expect(try d.tap(at: Self.at(10 + later + 1)) == true)
    }

    @Test("Armed until just before 4 s")
    func armedWindow() throws {
        var d = DiscardConfirm()
        _ = try d.tap(at: Self.at(0))
        #expect(try d.isArmed(at: Self.at(3.99)) == true)
        #expect(try d.isArmed(at: Self.at(4)) == false)
    }

    @Test("Closing the card or the workout changing disarms it")
    func reset() throws {
        var d = DiscardConfirm()
        _ = try d.tap(at: Self.at(0))
        try d.reset()
        #expect(try d.isArmed(at: Self.at(1)) == false)
        #expect(try d.tap(at: Self.at(1)) == false)
    }

    @Test("After a discard it starts over, disarmed")
    func afterDiscard() throws {
        var d = DiscardConfirm()
        _ = try d.tap(at: Self.at(0))
        #expect(try d.tap(at: Self.at(1)) == true)
        #expect(try d.isArmed(at: Self.at(1.5)) == false)
        #expect(try d.tap(at: Self.at(2)) == false)
    }
}
