// Settings (slice 7, work item 185; features/ios-app/settings-look.feature): the web's blocks
// (components/settings/*Block.tsx) for Look, Workouts, Training targets and Help. Each change is
// saved at once through RipitCore's SettingsStore and applied live (RootView rebuilds on `Look`).

import RipitCore
import SwiftUI

/// The settings the app runs on, saved in UserDefaults.
@Observable
final class SettingsModel {
    private let store: SettingsStore
    private(set) var settings: AppSettings
    var error: String?

    private let defaults: UserDefaults
    /// The mode before a light-only theme (E-INK), restored on leaving it (the web's pickTheme).
    private static let modeBeforeKey = "themeModeBeforeLightOnly"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        store = SettingsStore(defaults: defaults)
        let fallback = AppSettings(theme: ThemePreference(themeName: .ripit, mode: .dark), einkDisplay: false,
                                   intensityEnabled: false, defaultIntensityRating: .rir, defaultWeightUnit: .lbs,
                                   weeklyWorkoutTarget: 3)
        settings = (try? store.load()) ?? (try? AppSettings.webDefaults()) ?? fallback
        Look.apply(settings)
    }

    /// Changes, saves and applies. A refused value (a target outside 1 to 14) keeps the saved settings.
    func update(_ change: (inout AppSettings) -> Void) {
        var next = settings
        change(&next)
        do {
            try store.save(next)
            settings = try store.load()
            Look.apply(settings)
        } catch SettingsError.invalidTarget {
            error = "The weekly target is 1 to 14 workouts."
        } catch {
            self.error = "Couldn't save settings: \(error.localizedDescription)"
        }
    }

    /// Picks a theme from the list. Picking E-INK (light only) remembers the mode you had; leaving it
    /// restores that mode, or the device's own when none was kept (hooks/useThemePreference.ts
    /// pickTheme). Unlike the web, it doesn't turn E-ink display on.
    func pickTheme(_ theme: ThemeName) {
        let lightOnly = { (name: ThemeName) in (try? name.isLightOnly()) ?? false }
        let current = settings.theme
        var mode = current.mode
        if !lightOnly(current.themeName) && lightOnly(theme) {
            defaults.set(current.mode.rawValue, forKey: Self.modeBeforeKey)
        }
        if lightOnly(current.themeName) && !lightOnly(theme) {
            mode = defaults.string(forKey: Self.modeBeforeKey).flatMap(ThemeMode.init(rawValue:)) ?? Self.deviceMode
            defaults.removeObject(forKey: Self.modeBeforeKey)
        }
        update { $0.theme = ThemePreference(themeName: theme, mode: mode) }
    }

    /// The device's light or dark appearance, ignoring the app's own.
    private static var deviceMode: ThemeMode {
        let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
        return scene?.screen.traitCollection.userInterfaceStyle == .dark ? .dark : .light
    }
}

enum HelpLinks {
    static let learn = URL(string: "https://ripit.fit/learn")!
    // Dustin confirmed this address for now (2026-11-07); the web sends feedback through a form, not email.
    static let feedbackEmail = "feedback@ripit.fit"

    static var feedback: URL {
        let subject = "Ripit iOS feedback (\(version))".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return URL(string: "mailto:\(feedbackEmail)?subject=\(subject)")!
    }

    /// "0.1 (1)".
    static var version: String {
        let info = Bundle.main.infoDictionary
        let short = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(short) (\(build))"
    }
}

enum SettingsRoute: Hashable {
    case theme
}

struct SettingsView: View {
    @Environment(SettingsModel.self) private var model
    @Binding var path: [SettingsRoute]

    var body: some View {
        @Bindable var model = model
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                PageTitle("Settings")
                lookBlock
                workoutsBlock
                targetsBlock
                helpBlock
            }
            .padding(16)
        }
        .background(Theme.background)
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: SettingsRoute.self) { _ in ThemePickerView() }
        .alert("Not saved", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK") { model.error = nil }
        } message: {
            Text(model.error ?? "")
        }
    }

    private var settings: AppSettings { model.settings }

    // MARK: Look (LookBlock.tsx)

    private var lookBlock: some View {
        let lightOnly = (try? settings.theme.themeName.isLightOnly()) ?? false
        let dark = settings.theme.mode == .dark
        return FolderBlock(title: "Look", tone: .plain, icon: "eye") {
            NavigationLink(value: SettingsRoute.theme) {
                SettingsRow(icon: "paintpalette", label: "Theme", value: (try? settings.theme.themeName.label()) ?? "", chevron: true)
            }
            .buttonStyle(.plain)
            RowDivider()
            Button {
                model.update { $0.theme.mode = dark ? .light : .dark }
            } label: {
                SettingsRow(icon: dark ? "moon" : "sun.max", label: "Mode",
                            value: lightOnly ? "E-INK is light only" : dark ? "Dark" : "Light")
            }
            .buttonStyle(.plain)
            .disabled(lightOnly)
            .accessibilityHint(lightOnly ? "" : "Switches to \(dark ? "light" : "dark")")
            RowDivider()
            SettingsToggle(icon: "book", label: "E-ink display",
                           hint: "Makes text bolder for e-ink screens",
                           isOn: Binding(get: { settings.einkDisplay }, set: { on in model.update { $0.einkDisplay = on } }))
        }
    }

    // MARK: Workouts (WorkoutsBlock.tsx)

    private var workoutsBlock: some View {
        FolderBlock(title: "Workouts", tone: .plain, icon: "dumbbell") {
            SettingsToggle(label: "Intensity tracking (RIR/RPE)",
                           isOn: Binding(get: { settings.intensityEnabled }, set: { on in model.update { $0.intensityEnabled = on } }))
            if settings.intensityEnabled {
                ChoiceField(label: "Default rating type", hint: "RPE = Rate of Perceived Exertion, RIR = Reps in Reserve",
                            options: [(EffortKind.rpe, "RPE"), (.rir, "RIR")],
                            selection: Binding(get: { settings.defaultIntensityRating },
                                               set: { kind in model.update { $0.defaultIntensityRating = kind } }))
            }
            RowDivider()
            ChoiceField(label: "Weight unit", hint: "New exercises start in it, and Progress shows weights in it.",
                        options: [(WeightUnit.lbs, "lbs"), (.kg, "kg")],
                        selection: Binding(get: { settings.defaultWeightUnit },
                                           set: { unit in model.update { $0.defaultWeightUnit = unit } }))
        }
    }

    // MARK: Training targets

    private var targetsBlock: some View {
        FolderBlock(title: "Training targets", tone: .plain, icon: "target") {
            TargetStepper(target: settings.weeklyWorkoutTarget) { target in model.update { $0.weeklyWorkoutTarget = target } }
        }
    }

    // MARK: Help (HelpBlock.tsx)

    private var helpBlock: some View {
        FolderBlock(title: "Help", tone: .plain, icon: "lifepreserver") {
            Link(destination: HelpLinks.learn) {
                SettingsRow(icon: "book", label: "Learn", hint: "Articles and guides on ripit.fit", chevron: true)
            }
            .buttonStyle(.plain)
            RowDivider()
            Link(destination: HelpLinks.feedback) {
                SettingsRow(icon: "envelope", label: "Send feedback", hint: "Opens Mail", chevron: true)
            }
            .buttonStyle(.plain)
            RowDivider()
            SettingsRow(icon: "info.circle", label: "Version", value: HelpLinks.version)
        }
    }
}

// MARK: - Rows

/// A Settings row: icon, label (with an optional hint under it), a value on the right, a chevron.
private struct SettingsRow: View {
    var icon: String?
    let label: String
    var hint: String?
    var value: String?
    var chevron = false
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4)) : AnyLayout(HStackLayout(spacing: 12))
        HStack(spacing: 12) {
            if let icon { RowIcon(name: icon) }
            layout {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label).font(.ripit(.headline, .bold)).display(1).foregroundStyle(Theme.foreground)
                    if let hint { Text(hint).font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground) }
                }
                .frame(maxWidth: typeSize.isAccessibilitySize ? nil : .infinity, alignment: .leading)
                if let value { Text(value).font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground) }
            }
            if chevron {
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.ripit(.footnote, .bold)).foregroundStyle(Theme.mutedForeground)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, minHeight: Theme.touch + 8, alignment: .leading)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

/// The fixed icon column every row shares, so the labels line up (SettingsBlock.tsx RowIcon).
/// Left out at accessibility sizes, where the label needs the width.
private struct RowIcon: View {
    let name: String
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        if !typeSize.isAccessibilitySize { icon }
    }

    private var icon: some View {
        Image(systemName: name)
            .font(.ripit(.body))
            .foregroundStyle(Theme.mutedForeground)
            .frame(width: 24)
            .accessibilityHidden(true)
    }
}

/// A row that is a switch; the whole row toggles it.
private struct SettingsToggle: View {
    var icon: String?
    let label: String
    var hint: String?
    @Binding var isOn: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            HStack(spacing: 12) {
                if let icon { RowIcon(name: icon) }
                VStack(alignment: .leading, spacing: 2) {
                    Text(label).font(.ripit(.headline, .bold)).display(1).foregroundStyle(Theme.foreground)
                    if let hint { Text(hint).font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground) }
                }
            }
        }
        .tint(Theme.primary)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(minHeight: Theme.touch + 8)
    }
}

/// A label over a square segmented choice, like the web's SegmentedControl (tone "bold").
private struct ChoiceField<Value: Hashable>: View {
    let label: String
    var hint: String?
    let options: [(Value, String)]
    @Binding var selection: Value

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).font(.ripit(.headline, .bold)).display(1).foregroundStyle(Theme.foreground)
            HStack(spacing: 0) {
                ForEach(options, id: \.0) { value, title in
                    let on = value == selection
                    Button { selection = value } label: {
                        Text(title)
                            .font(.ripit(.headline, .bold))
                            .display(1.2)
                            .frame(maxWidth: .infinity, minHeight: Theme.touch)
                            .foregroundStyle(on ? Theme.primaryForeground : Theme.mutedForeground)
                            .background(on ? Theme.primary : Theme.muted)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(on ? [.isSelected] : [])
                }
            }
            .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: Theme.line))
            if let hint { Text(hint).font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground) }
        }
        .padding(16)
    }
}

/// The weekly workout target, 1 to 14, with − and + buttons.
private struct TargetStepper: View {
    let target: Int
    let set: (Int) -> Void
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout(spacing: 12))
        layout {
            VStack(alignment: .leading, spacing: 4) {
                Text("Weekly workout target").font(.ripit(.headline, .bold)).display(1).foregroundStyle(Theme.foreground)
                Text("Workouts a week that keep your Progress streak going (1 to 14).")
                    .font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
            }
            .frame(maxWidth: typeSize.isAccessibilitySize ? nil : .infinity, alignment: .leading)
            HStack(spacing: 0) {
                step("minus", "Fewer", target - 1)
                Text("\(target)")
                    .font(.ripit(.title2, .bold).monospacedDigit())
                    .foregroundStyle(Theme.foreground)
                    .frame(minWidth: 52, minHeight: Theme.touch)
                    .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: 2))
                step("plus", "More", target + 1)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Weekly workout target")
            .accessibilityValue("\(target)")
            .accessibilityAdjustableAction { direction in
                switch direction {
                case .increment: if target < 14 { set(target + 1) }
                case .decrement: if target > 1 { set(target - 1) }
                @unknown default: break
                }
            }
        }
        .padding(16)
    }

    private func step(_ icon: String, _ label: String, _ next: Int) -> some View {
        Button { set(next) } label: {
            Image(systemName: icon)
                .font(.ripit(.headline, .bold))
                .frame(width: Theme.touch, height: Theme.touch)
                .background(Theme.muted)
                .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: Theme.line))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(Theme.foreground)
        .disabled(!(1...14).contains(next))
        .opacity((1...14).contains(next) ? 1 : 0.4)
        .accessibilityLabel(label)
    }
}

// MARK: - Theme picker (ThemePicker.tsx)

/// The 13 themes, each with a swatch of its own colors in the current mode.
struct ThemePickerView: View {
    @Environment(SettingsModel.self) private var model

    var body: some View {
        ScrollViewReader { scroller in
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    FolderBlock(title: "Theme", tone: .plain, icon: "paintpalette") {
                        ForEach(Array(ThemeName.allCases.enumerated()), id: \.element) { i, theme in
                            if i > 0 { RowDivider() }
                            ThemeRow(theme: theme, mode: model.settings.theme.mode,
                                     selected: model.settings.theme.themeName == theme) {
                                model.pickTheme(theme)
                            }
                            .id(theme)
                        }
                    }
                    Text("E-INK has no dark mode; it always shows light.")
                        .font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
                }
                .padding(16)
            }
            // A pick rebuilds the tabs (a new look), so the list comes back at its selected row.
            .onAppear { scroller.scrollTo(model.settings.theme.themeName, anchor: .center) }
        }
        .background(Theme.background)
        .navigationTitle("THEME")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct ThemeRow: View {
    let theme: ThemeName
    let mode: ThemeMode
    let selected: Bool
    let pick: () -> Void

    var body: some View {
        let palette = Palette(ThemePreference(themeName: theme, mode: mode))
        Button(action: pick) {
            HStack(spacing: 12) {
                HStack(spacing: 0) {
                    ForEach(["background", "card", "primary", "secondary", "accent"], id: \.self) { token in
                        Rectangle().fill(palette.color(token)).frame(width: 12, height: 32)
                    }
                }
                .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: 1))
                .accessibilityHidden(true)
                // One line, shrinking rather than breaking a name like "CATPPUCCIN" mid-word.
                Text((try? theme.label()) ?? theme.rawValue)
                    .font(.ripit(.headline, .bold))
                    .display(1)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .foregroundStyle(Theme.foreground)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if selected {
                    Image(systemName: "checkmark").font(.ripit(.headline, .bold)).foregroundStyle(Theme.text(Theme.primary))
                }
            }
            .padding(.horizontal, 16)
            .frame(minHeight: Theme.touch + 8)
            .background(selected ? Theme.muted : .clear)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }
}
