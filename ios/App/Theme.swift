// The web app's RIPIT default theme (app/globals.css, [data-theme="ripit"]), light and dark,
// plus the folder-block pieces from docs/STYLING.md: a paper tab over a bordered box.

import RipitCore
import SwiftUI
import UIKit

enum Theme {
    static let background = dynamic(light: 0xFBF8F3, dark: 0x1A1108)
    static let foreground = dynamic(light: 0x3A2817, dark: 0xFEF3C7)
    static let card = dynamic(light: 0xFFFCF7, dark: 0x251A0F)
    static let muted = dynamic(light: 0xF5EFE6, dark: 0x3A2817)
    static let mutedForeground = dynamic(light: 0x78573B, dark: 0xD4C4B0)
    static let border = dynamic(light: 0xD4C4B0, dark: 0x4A3420)
    static let primary = Color(hex: 0x10B981)
    static let primaryForeground = Color.white
    static let secondary = Color(hex: 0x92400E)
    static let secondaryForeground = Color(hex: 0xFEF3C7)
    static let accent = dynamic(light: 0xD4930A, dark: 0xFBBF24)
    static let error = dynamic(light: 0xDC2626, dark: 0xEF4444)

    /// The web app's 48px minimum touch target.
    static let touch: CGFloat = 48

    private static func dynamic(light: UInt32, dark: UInt32) -> Color {
        Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) })
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}

extension Color {
    init(hex: UInt32) { self.init(uiColor: UIColor(hex: hex)) }
}

/// Paper tab colours, like the web's PaperTabs tones.
enum TabTone {
    case exercise, superset, active

    var fill: Color {
        switch self {
        case .exercise: Theme.secondary
        case .superset: Theme.accent
        case .active: Theme.primary
        }
    }

    var label: Color {
        switch self {
        case .exercise: Theme.secondaryForeground
        case .superset: Color(hex: 0x1A1108)
        case .active: Theme.primaryForeground
        }
    }
}

/// A folder block: a paper tab label sitting on a bordered card box.
struct FolderBlock<Content: View, Trailing: View>: View {
    let title: String
    var tone: TabTone = .exercise
    @ViewBuilder var trailing: () -> Trailing
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .bottom) {
                Text(title.uppercased())
                    .font(.footnote.weight(.bold))
                    .tracking(1)
                    .foregroundStyle(tone.label)
                    .fixedSize(horizontal: false, vertical: true)
                    // Capped so one long word ("CONVENTIONAL") still fits the width instead of hyphenating.
                    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(tone.fill, in: UnevenRoundedRectangle(topLeadingRadius: 8, topTrailingRadius: 8))
                    // The title gets the width first, so a long name at large text sizes wraps between words.
                    .layoutPriority(1)
                Spacer(minLength: 0)
                trailing()
            }
            VStack(alignment: .leading, spacing: 0, content: content)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.card)
                .clipShape(UnevenRoundedRectangle(bottomLeadingRadius: 8, bottomTrailingRadius: 8, topTrailingRadius: 8))
                .overlay(UnevenRoundedRectangle(bottomLeadingRadius: 8, bottomTrailingRadius: 8, topTrailingRadius: 8)
                    .stroke(Theme.border, lineWidth: 1))
        }
    }
}

extension FolderBlock where Trailing == EmptyView {
    init(title: String, tone: TabTone = .exercise, @ViewBuilder content: @escaping () -> Content) {
        self.init(title: title, tone: tone, trailing: { EmptyView() }, content: content)
    }
}

/// A full-width filled button at least 48pt tall.
struct FilledButtonStyle: ButtonStyle {
    var fill: Color = Theme.primary
    var foreground: Color = Theme.primaryForeground

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: Theme.touch)
            .foregroundStyle(foreground)
            .background(fill.opacity(configuration.isPressed ? 0.8 : 1), in: RoundedRectangle(cornerRadius: 8))
    }
}

/// An outlined button at least 48pt tall.
struct OutlineButtonStyle: ButtonStyle {
    var tint: Color = Theme.foreground

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: Theme.touch)
            .foregroundStyle(tint)
            .background(configuration.isPressed ? Theme.muted : Theme.card, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))
    }
}

/// Plain divided rows inside a folder box.
struct RowDivider: View {
    var body: some View { Rectangle().fill(Theme.border).frame(height: 1) }
}

enum Format {
    static func weight(_ w: Double, _ unit: String) -> String {
        w == 0 ? "BW" : "\(w.formatted(.number.precision(.fractionLength(0...2)))) \(unit)"
    }

    /// "Day 1" or "Day 1 · Push": the day number only when the name doesn't already say it.
    static func dayTitle(_ dayNumber: Int, _ name: String) -> String {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        return trimmed.isEmpty || trimmed == "Day \(dayNumber)" ? "Day \(dayNumber)" : "Day \(dayNumber) · \(trimmed)"
    }

    /// "Strength Block · W2 · Pull".
    static func sessionTitle(program: String, week: Int, workout: String) -> String {
        "\(program) · W\(week) · \(workout)"
    }

    /// A history row's title: the program session's program, week and day, else its own name.
    static func historyTitle(_ e: HistoryEntry) -> String {
        if let program = e.programName, let week = e.weekNumber {
            return sessionTitle(program: program, week: week, workout: e.name ?? "Workout")
        }
        return e.name ?? "Ad-hoc workout"
    }

    static func counts(exercises: Int, sets: Int) -> String {
        "\(exercises) \(exercises == 1 ? "exercise" : "exercises") · \(sets) \(sets == 1 ? "set" : "sets")"
    }

    static func day(_ d: Date) -> String {
        d.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
    }

    static func time(_ d: Date) -> String {
        d.formatted(date: .omitted, time: .shortened)
    }

    /// "45 min" or "1h 05m", like the web's lib/format/duration.ts.
    static func minutes(_ seconds: Int) -> String {
        let total = max(1, Int((Double(seconds) / 60 + 0.5).rounded(.down)))
        return total < 60 ? "\(total) min" : "\(total / 60)h \(String(format: "%02d", total % 60))m"
    }
}

/// Selects a text field's contents when it gets focus, so typing replaces a value (work item 170).
private struct SelectAllOnFocus: ViewModifier {
    @FocusState private var focused: Bool

    func body(content: Content) -> some View {
        content
            .focused($focused)
            .onChange(of: focused) { _, isFocused in
                guard isFocused else { return }
                DispatchQueue.main.async {
                    UIApplication.shared.sendAction(#selector(UIResponder.selectAll(_:)), to: nil, from: nil, for: nil)
                }
            }
    }
}

extension View {
    func selectAllOnFocus() -> some View { modifier(SelectAllOnFocus()) }
}
