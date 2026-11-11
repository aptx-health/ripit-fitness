// The web app's look (app/globals.css): its 13 themes' color tokens, the Rajdhani display type,
// square corners, the hard offset shadow on primary buttons, and the folder blocks and folder tabs
// from docs/STYLING.md. Slice 7 (work item 185) puts all of it here, so screens change in one place.
// The colors follow Settings: `Look` holds the current theme, and RootView rebuilds the tabs when
// it changes, so every `Theme.x` reads the new value.

import RipitCore
import SwiftUI
import UIKit

/// The look Settings chose: the theme (from RipitCore's token table) and E-ink display.
enum Look {
    private(set) static var preference = (try? ThemePreference.webDefault()) ?? ThemePreference(themeName: .ripit, mode: .dark)
    private(set) static var einkDisplay = false
    private(set) static var palette = Palette(preference)
    /// The text size the native bars' titles are scaled for.
    private(set) static var textSize = UIContentSizeCategory.large

    /// Changes in identity whenever the look changes; RootView uses it to rebuild its tabs.
    static var key: String {
        "\(preference.themeName.rawValue)-\(preference.mode.rawValue)-\(einkDisplay)-\(textSize.rawValue)"
    }

    /// A dark background, whatever the mode: DOOM, CYBER, SYNTHWAVE '84 and DRACULA stay dark in
    /// "light" mode, as on the web. The status bar, tab bar, switches and alerts follow this.
    static var isDark: Bool {
        let hex = palette.hex("background")
        let channel = { (shift: UInt32) in Double((hex >> shift) & 0xFF) / 255 }
        return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0) < 0.5
    }

    /// The E-ink theme: paper, so no shadows and heavier borders (globals.css [data-theme="eink"]).
    static var isPaper: Bool { preference.themeName == .eink }

    static func apply(_ settings: AppSettings) {
        preference = (try? settings.theme.normalized()) ?? settings.theme
        einkDisplay = settings.einkDisplay
        palette = Palette(preference)
        applyUIKitAppearance()
    }

    /// Rescales the native bars' titles when the text size changes.
    static func setTextSize(_ size: UIContentSizeCategory) {
        guard size != textSize else { return }
        textSize = size
        applyUIKitAppearance()
    }

    /// Native bars keep their native shape, in the theme's colors and Rajdhani.
    private static func applyUIKitAppearance() {
        let foreground = UIColor(hex: palette.hex("foreground"))
        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = UIColor(hex: palette.hex("background"))
        nav.shadowColor = UIColor(hex: palette.hex("border"))
        // Titles grow with the text size, capped so a title still fits the bar.
        let traits = UITraitCollection(preferredContentSizeCategory: textSize)
        let title = UIFontMetrics(forTextStyle: .headline)
            .scaledFont(for: RipitFont.ui(17, .bold), maximumPointSize: 30, compatibleWith: traits)
        let largeTitle = UIFontMetrics(forTextStyle: .largeTitle)
            .scaledFont(for: RipitFont.ui(34, .bold), maximumPointSize: 52, compatibleWith: traits)
        nav.titleTextAttributes = [.foregroundColor: foreground, .font: title, .kern: 1.2]
        nav.largeTitleTextAttributes = [.foregroundColor: foreground, .font: largeTitle, .kern: 2]
        let buttons = UIBarButtonItemAppearance()
        buttons.normal.titleTextAttributes = [.font: RipitFont.ui(17, .semibold)]
        nav.buttonAppearance = buttons
        nav.doneButtonAppearance = buttons
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
        let item = UITabBarItem.appearance()
        item.setTitleTextAttributes([.font: RipitFont.ui(11, .semibold)], for: .normal)
        item.setTitleTextAttributes([.font: RipitFont.ui(11, .bold)], for: .selected)
        UISegmentedControl.appearance().setTitleTextAttributes([.font: RipitFont.ui(15, .semibold)], for: .normal)
    }
}

/// One theme and mode's tokens as colors. A token the theme doesn't define reads as `fallback`.
struct Palette {
    private let hexes: [String: UInt32]

    init(_ preference: ThemePreference) {
        let tokens = (try? ThemeTable.tokens(preference)) ?? ThemeTokens(values: [:])
        var hexes: [String: UInt32] = [:]
        for name in tokens.values.keys { hexes[name] = (try? tokens.color(name)) ?? nil }
        self.hexes = hexes
    }

    func hex(_ name: String, fallback: UInt32 = 0x808080) -> UInt32 { hexes[name] ?? fallback }
    func color(_ name: String) -> Color { Color(hex: hex(name)) }
}

enum Theme {
    static var background: Color { Look.palette.color("background") }
    static var foreground: Color { Look.palette.color("foreground") }
    static var card: Color { Look.palette.color("card") }
    static var muted: Color { Look.palette.color("muted") }
    static var mutedForeground: Color { Look.palette.color("muted-foreground") }
    static var border: Color { Look.palette.color("border") }
    static var input: Color { Look.palette.color("input") }
    static var primary: Color { Look.palette.color("primary") }
    static var primaryActive: Color { Look.palette.color("primary-active") }
    static var primaryForeground: Color { Look.palette.color("primary-foreground") }
    static var primaryMuted: Color { Look.palette.color("primary-muted") }
    static var secondary: Color { Look.palette.color("secondary") }
    static var secondaryForeground: Color { Look.palette.color("secondary-foreground") }
    static var secondaryActive: Color { Look.palette.color("secondary-active") }
    static var accent: Color { Look.palette.color("accent") }
    static var accentForeground: Color { Look.palette.color("accent-foreground") }
    static var accentMuted: Color { Look.palette.color("accent-muted") }
    static var success: Color { Look.palette.color("success") }
    static var successForeground: Color { Look.palette.color("success-foreground") }
    static var error: Color { Look.palette.color("error") }
    static var errorForeground: Color { Look.palette.color("error-foreground") }

    /// The web app's 48px minimum touch target.
    static let touch: CGFloat = 48
    /// Hairline borders, heavier on the E-ink theme (globals.css: "solid black, never hairline").
    static var line: CGFloat { Look.isPaper ? 2 : 1 }

    /// Colored text and icons. The E-ink theme draws them black and keeps color for fills
    /// (globals.css: "Colour is for fills only").
    static func text(_ color: Color) -> Color { Look.isPaper ? foreground : color }
    /// Colored borders, black on the E-ink theme like the web's border utilities.
    static func edge(_ color: Color) -> Color { Look.isPaper ? border : color }
    /// A folder box's border, in its tab's color.
    static let folderLine: CGFloat = 2
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

// MARK: - Type

/// Rajdhani (SIL OFL, Fonts/OFL.txt), the web's font for everything (globals.css body, app/layout.tsx
/// weights 500/600/700). It runs small next to SF, so sizes are scaled up to read the same.
enum RipitFont {
    static let scale: CGFloat = 1.12

    /// The SF size of each text style at the default type size.
    static func baseSize(_ style: Font.TextStyle) -> CGFloat {
        switch style {
        case .largeTitle: 34
        case .title: 28
        case .title2: 22
        case .title3: 20
        case .headline, .body: 17
        case .callout: 16
        case .subheadline: 15
        case .footnote: 13
        case .caption: 12
        case .caption2: 11
        @unknown default: 17
        }
    }

    /// Medium, SemiBold or Bold; E-ink display makes text one step bolder, like the web.
    static func name(_ weight: Font.Weight) -> String {
        let heavy: [Font.Weight] = [.bold, .heavy, .black]
        var step = heavy.contains(weight) ? 2 : weight == .semibold ? 1 : 0
        if Look.einkDisplay { step = min(step + 1, 2) }
        return ["Rajdhani-Medium", "Rajdhani-SemiBold", "Rajdhani-Bold"][step]
    }

    static func ui(_ size: CGFloat, _ weight: Font.Weight) -> UIFont {
        UIFont(name: name(weight), size: size * scale) ?? .systemFont(ofSize: size)
    }
}

extension Font {
    /// The web's font at a text style's size, scaling with Dynamic Type.
    static func ripit(_ style: Font.TextStyle, _ weight: Font.Weight? = nil) -> Font {
        let weight = weight ?? (style == .headline ? .semibold : .medium)
        return .custom(RipitFont.name(weight), size: RipitFont.baseSize(style) * RipitFont.scale, relativeTo: style)
    }

    /// A fixed-size display font that still scales with Dynamic Type (page titles).
    static func ripitDisplay(_ size: CGFloat, relativeTo style: Font.TextStyle = .largeTitle) -> Font {
        .custom(RipitFont.name(.bold), size: size, relativeTo: style)
    }
}

extension View {
    /// The web's display treatment for labels, buttons, tab titles and headings: uppercase, tracked
    /// (.doom-label 0.05em, .doom-heading 0.08em, .doom-title 0.1em).
    func display(_ tracking: CGFloat = 1) -> some View {
        textCase(.uppercase).tracking(tracking)
    }
}

/// A page title like the web's .doom-title: "TRAINING". Wraps between words at large sizes.
struct PageTitle: View {
    let text: String
    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text.uppercased())
            .font(.ripitDisplay(44))
            .tracking(4)
            .foregroundStyle(Theme.foreground)
            .lineLimit(2)
            .minimumScaleFactor(0.5)
            .accessibilityAddTraits(.isHeader)
    }
}

// MARK: - Folder blocks

/// Paper tab colours, like the web's PaperTabs tones. `.plain` is a Settings block's muted tab.
enum TabTone {
    case exercise, superset, active, plain

    var fill: Color {
        switch self {
        case .exercise: Theme.secondary
        case .superset: Theme.accent
        case .active: Theme.primary
        case .plain: Theme.muted
        }
    }

    var label: Color {
        switch self {
        case .exercise: Theme.secondaryForeground
        case .superset: Theme.accentForeground
        case .active: Theme.primaryForeground
        case .plain: Theme.mutedForeground
        }
    }

    /// The box under the tab is bordered in the tab's color, like the web's folders (black on E-ink).
    var edge: Color { self == .plain ? Theme.border : Theme.edge(fill) }
}

/// The web's folder tab: square on the left, a slanted right edge.
struct FolderTabShape: Shape {
    var slant: CGFloat = 18

    func path(in rect: CGRect) -> Path {
        Path { p in
            p.move(to: CGPoint(x: rect.minX, y: rect.maxY))
            p.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
            p.addLine(to: CGPoint(x: rect.maxX - slant, y: rect.minY))
            p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
            p.closeSubpath()
        }
    }
}

/// One folder tab label. An unselected tab is muted, with a border, like the web's inactive tabs.
struct FolderTab: View {
    let title: String
    var icon: String?
    var tone: TabTone = .exercise
    var selected = true

    var body: some View {
        HStack(spacing: 6) {
            if let icon { Image(systemName: icon).font(.ripit(.footnote, .bold)) }
            Text(title)
                .font(.ripit(.subheadline, .bold))
                .display(1.2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(selected ? tone.label : Theme.mutedForeground)
        // Capped so one long word ("CONVENTIONAL") still fits the width instead of hyphenating.
        .dynamicTypeSize(...DynamicTypeSize.accessibility2)
        .padding(.leading, 14)
        .padding(.trailing, 28)
        .padding(.vertical, 8)
        .background(selected ? tone.fill : Theme.muted, in: FolderTabShape())
        .overlay(selected && tone != .plain ? nil : FolderTabShape().stroke(Theme.border, lineWidth: Theme.line))
    }
}

/// The bordered box under a folder tab.
private struct FolderBox: ViewModifier {
    let edge: Color

    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card)
            .overlay(Rectangle().strokeBorder(edge, lineWidth: Theme.folderLine))
    }
}

/// A folder block: a paper tab label sitting on a bordered card box.
struct FolderBlock<Content: View, Trailing: View>: View {
    let title: String
    var tone: TabTone = .exercise
    var icon: String?
    @ViewBuilder var trailing: () -> Trailing
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .bottom) {
                FolderTab(title: title, icon: icon, tone: tone)
                    // The title gets the width first, so a long name at large text sizes wraps between words.
                    .layoutPriority(1)
                Spacer(minLength: 0)
                trailing()
            }
            VStack(alignment: .leading, spacing: 0, content: content)
                .modifier(FolderBox(edge: tone.edge))
        }
    }
}

extension FolderBlock where Trailing == EmptyView {
    init(title: String, tone: TabTone = .exercise, icon: String? = nil, @ViewBuilder content: @escaping () -> Content) {
        self.init(title: title, tone: tone, icon: icon, trailing: { EmptyView() }, content: content)
    }
}

/// One tab of a `FolderTabs`.
struct FolderTabItem<Tab: Hashable>: Identifiable {
    let tab: Tab
    let title: String
    var icon: String?
    var tone: TabTone = .exercise
    var id: Tab { tab }
}

/// Folder tabs that switch in place, like the web's tabbed folders (Pinned | Recent, Records | Lifts).
/// Side by side; stacked when they don't fit at large text sizes.
struct FolderTabs<Tab: Hashable, Content: View>: View {
    let items: [FolderTabItem<Tab>]
    @Binding var selection: Tab
    @ViewBuilder var content: (Tab) -> Content
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let current = items.first { $0.tab == selection } ?? items[0]
        VStack(alignment: .leading, spacing: 0) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .bottom, spacing: -10) { tabs }
                VStack(alignment: .leading, spacing: 2) { tabs }
            }
            VStack(alignment: .leading, spacing: 0) { content(current.tab) }
                .modifier(FolderBox(edge: current.tone.edge))
        }
    }

    private var tabs: some View {
        ForEach(items) { item in
            Button { selection = item.tab } label: {
                FolderTab(title: item.title, icon: item.icon, tone: item.tone, selected: item.tab == selection)
                    .frame(minHeight: 44, alignment: .bottom)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .zIndex(item.tab == selection ? 1 : 0)
            .accessibilityAddTraits(item.tab == selection ? [.isSelected] : [])
        }
    }
}

// MARK: - Bottom bar

extension View {
    /// Pins a bar to the bottom of the screen, above the scrolling content. The bar's controls stay above
    /// the home indicator, while its background runs down to the screen's edge so nothing scrolls beneath it.
    /// Use this for every fixed bottom bar (the picker's Create / Add, the logger's ‹ Log › bar, the tab bar).
    /// The tab bar passes its own fill, no padding and the web nav's 2px top border.
    func bottomBar<Bar: View>(fill: Color = Theme.background, padded: Bool = true, edge: CGFloat = Theme.line,
                              @ViewBuilder _ bar: () -> Bar) -> some View {
        safeAreaInset(edge: .bottom, spacing: 0) {
            bar()
                .padding(.horizontal, padded ? 16 : 0)
                .padding(.vertical, padded ? 10 : 0)
                .frame(maxWidth: .infinity)
                .background {
                    fill
                        .ignoresSafeArea(edges: .bottom)
                        .overlay(alignment: .top) { Rectangle().fill(Theme.border).frame(height: edge) }
                }
        }
    }
}

// MARK: - Buttons and fields

/// A full-width filled button at least 48pt tall, square, with the web's hard offset shadow
/// (.doom-button-3d: 4px of the darker shade under it) on primary buttons.
struct FilledButtonStyle: ButtonStyle {
    var fill: Color = Theme.primary
    var foreground: Color = Theme.primaryForeground
    /// The hard shadow's color; nil for none.
    var shadow: Color? = Theme.primaryActive

    func makeBody(configuration: Configuration) -> some View {
        let depth: CGFloat = shadow == nil || Look.isPaper ? 0 : 4
        let pressed = configuration.isPressed
        configuration.label
            .font(.ripit(.headline, .bold))
            .display(1.5)
            .frame(maxWidth: .infinity, minHeight: Theme.touch)
            .foregroundStyle(foreground)
            .background(fill.opacity(pressed ? 0.9 : 1))
            .overlay(Look.isPaper ? Rectangle().strokeBorder(Theme.border, lineWidth: 2) : nil)
            .offset(y: pressed ? depth : 0)
            .background(alignment: .bottom) {
                if let shadow, depth > 0 { Rectangle().fill(shadow).offset(y: depth) }
            }
            .padding(.bottom, depth)
    }
}

/// An outlined button at least 48pt tall, square.
struct OutlineButtonStyle: ButtonStyle {
    var tint: Color = Theme.foreground

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.ripit(.headline, .semibold))
            .display(1.2)
            .frame(maxWidth: .infinity, minHeight: Theme.touch)
            .foregroundStyle(Theme.text(tint))
            .background(configuration.isPressed ? Theme.muted : Theme.card)
            .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: Theme.line))
    }
}

/// Plain divided rows inside a folder box.
struct RowDivider: View {
    var body: some View { Rectangle().fill(Theme.border).frame(height: Theme.line) }
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
