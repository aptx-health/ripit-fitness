// Public API for slice 7, Settings and the web's look (features/ios-app/settings-look.feature).
// Shapes were fixed by work item 184 and filled in by 185. The tests in Tests/RipitCoreTests/Settings*Tests.swift and ThemeTokenTests.swift are the
// contract, and Tests/Fixtures/themes/tokens.json holds the web's tokens
// (scripts/ios/theme-tokens-goldens.ts). Change the bodies, not the shapes.
//
// The rules are the web's:
// - Themes (lib/theme.ts): the 13 themes in THEMES order with THEME_LABELS. E-ink is light-only: a
//   stored dark choice reads as light. A new install starts on RIPIT, dark (DEFAULT_THEME).
// - Tokens (app/globals.css): every color token of the [data-theme] blocks, per theme and mode, as
//   the browser resolves them (a dark block that leaves one out keeps the light value; a token no
//   block defines for a theme is absent). Keys drop the "--"; values are the web's text with hex
//   uppercased: "#1A1108", or "16, 185, 129" for the *-rgb tokens.
// - E-ink display (lib/display.ts): per device, off on a new install, any theme. Motion is reduced
//   when it is on or when the OS asks for reduced motion.
// - Workout settings (prisma UserSettings defaults, WorkoutsBlock.tsx, app/api/settings): intensity
//   tracking off, rating type RIR, weight unit lbs, weekly target 3 (a whole number from 1 to 14;
//   anything else is refused and nothing is saved).
// - The logger: no effort picker when tracking is off, the default rating type when on. A new set
//   takes the unit of the set before it in that exercise, else the default unit (the phone keeps its
//   per-set lbs/kg toggle, lead decision in work item 163; the web always uses the settings unit).
//
// Storage and migration (phone only): settings live in UserDefaults. The first load migrates the
// values slices 4 and 5 stored, once, so nobody loses them:
// - "progressUnit" (Progress sheet) becomes the default weight unit; without it, "weightUnit" (the
//   last unit logged) does.
// - "weeklyWorkoutTarget" (Progress sheet) becomes the weekly target when it is 1 to 14.
// - "effortKind" becomes the rating type. An install that has any of these four keys was already
//   showing the effort picker, so tracking starts on, with RPE (the old default) when "effortKind" is
//   missing. A new install gets the web's defaults.
// After that first load the old keys are never read again. A legacy value the phone doesn't know
// (a target of 20, an effortKind of "x") migrates as that setting's default.

import Foundation

// MARK: - Themes

/// The web's 13 themes, in its THEMES order.
public enum ThemeName: String, CaseIterable, Sendable, Codable {
    case ripit, doom, catppuccin, cyber, forest, synthwave, dracula, github, clyde, ninety, blossom, okabe, eink

    /// The picker label (THEME_LABELS): "RIPIT", "SYNTHWAVE '84", "90s KID", "E-INK".
    public func label() throws -> String {
        switch self {
        case .synthwave: "SYNTHWAVE '84"
        case .ninety: "90s KID"
        case .eink: "E-INK"
        default: rawValue.uppercased()
        }
    }

    /// True for themes with no dark mode (E-ink).
    public func isLightOnly() throws -> Bool {
        self == .eink
    }
}

public enum ThemeMode: String, CaseIterable, Sendable, Codable {
    case light, dark
}

public struct ThemePreference: Sendable, Equatable, Codable {
    public var themeName: ThemeName
    public var mode: ThemeMode

    public init(themeName: ThemeName, mode: ThemeMode) {
        self.themeName = themeName
        self.mode = mode
    }

    /// What a new install starts on.
    public static func webDefault() throws -> ThemePreference {
        ThemePreference(themeName: .ripit, mode: .dark)
    }

    /// The preference as it can be shown: a light-only theme is always light.
    public func normalized() throws -> ThemePreference {
        try themeName.isLightOnly() ? ThemePreference(themeName: themeName, mode: .light) : self
    }
}

/// One theme and mode's color tokens.
public struct ThemeTokens: Sendable, Equatable {
    /// Token name without "--" ("primary-foreground") → the web's value ("#FFFFFF", "16, 185, 129").
    public let values: [String: String]

    public init(values: [String: String]) {
        self.values = values
    }

    /// A "#RRGGBB" token as 0xRRGGBB; nil for a token that is missing or isn't a hex color.
    public func color(_ name: String) throws -> UInt32? {
        guard let value = values[name], value.hasPrefix("#"), value.count == 7 else { return nil }
        return UInt32(value.dropFirst(), radix: 16)
    }
}

public enum ThemeTable {
    /// The tokens the web shows for this preference (normalized first, so eink dark is eink light).
    public static func tokens(_ preference: ThemePreference) throws -> ThemeTokens {
        let shown = try preference.normalized()
        guard let values = try table()[shown.themeName.rawValue]?[shown.mode.rawValue] else {
            throw RipitCoreError.notFound("theme \(shown.themeName.rawValue) \(shown.mode.rawValue)")
        }
        return ThemeTokens(values: values)
    }

    private struct File: Decodable {
        struct Entry: Decodable { let tokens: [String: String] }
        let themes: [String: [String: Entry]]
    }

    nonisolated(unsafe) private static var cache: [String: [String: [String: String]]]?
    private static let lock = NSLock()

    /// theme → mode → tokens, read once from the bundled theme-tokens.json.
    private static func table() throws -> [String: [String: [String: String]]] {
        lock.lock()
        defer { lock.unlock() }
        if let cache { return cache }
        guard let url = Bundle.module.url(forResource: "theme-tokens", withExtension: "json") else {
            throw RipitCoreError.notFound("theme-tokens.json")
        }
        let file = try JSONDecoder().decode(File.self, from: Data(contentsOf: url))
        let table = file.themes.mapValues { $0.mapValues(\.tokens) }
        cache = table
        return table
    }
}

// MARK: - Display

public enum DisplayRules {
    /// Motion is off when E-ink display is on or the OS asks for reduced motion.
    public static func reducedMotion(einkDisplay: Bool, osReduceMotion: Bool) throws -> Bool {
        einkDisplay || osReduceMotion
    }
}

// MARK: - Settings

public struct AppSettings: Sendable, Equatable {
    public var theme: ThemePreference
    public var einkDisplay: Bool
    public var intensityEnabled: Bool
    public var defaultIntensityRating: EffortKind
    public var defaultWeightUnit: WeightUnit
    public var weeklyWorkoutTarget: Int

    public init(theme: ThemePreference, einkDisplay: Bool, intensityEnabled: Bool,
                defaultIntensityRating: EffortKind, defaultWeightUnit: WeightUnit, weeklyWorkoutTarget: Int) {
        self.theme = theme
        self.einkDisplay = einkDisplay
        self.intensityEnabled = intensityEnabled
        self.defaultIntensityRating = defaultIntensityRating
        self.defaultWeightUnit = defaultWeightUnit
        self.weeklyWorkoutTarget = weeklyWorkoutTarget
    }

    /// A new install: RIPIT dark, E-ink display off, tracking off, RIR, lbs, 3 a week.
    public static func webDefaults() throws -> AppSettings {
        AppSettings(theme: try ThemePreference.webDefault(), einkDisplay: false, intensityEnabled: false,
                    defaultIntensityRating: .rir, defaultWeightUnit: .lbs, weeklyWorkoutTarget: 3)
    }

    /// The weekly targets the web accepts.
    public static let targetRange = 1...14
}

public enum SettingsError: Error, Equatable {
    /// A weekly target that isn't a whole number from 1 to 14.
    case invalidTarget(Int)
}

/// Settings in UserDefaults. Every save is stored at once; a new store on the same defaults (a
/// relaunch) reads it back.
public final class SettingsStore: @unchecked Sendable {
    public init(defaults: UserDefaults) {
        self.defaults = defaults
    }

    private let defaults: UserDefaults

    private enum Key {
        static let stored = "settings.v1.stored"
        static let theme = "settings.v1.themeName"
        static let mode = "settings.v1.themeMode"
        static let eink = "settings.v1.einkDisplay"
        static let intensity = "settings.v1.intensityEnabled"
        static let rating = "settings.v1.defaultIntensityRating"
        static let unit = "settings.v1.defaultWeightUnit"
        static let target = "settings.v1.weeklyWorkoutTarget"
    }

    /// The stored settings, after the one-time migration on the first load. The theme comes back
    /// normalized.
    public func load() throws -> AppSettings {
        guard defaults.bool(forKey: Key.stored) else {
            let migrated = try migrated()
            try save(migrated)
            return migrated
        }
        let fallback = try AppSettings.webDefaults()
        let theme = ThemePreference(
            themeName: defaults.string(forKey: Key.theme).flatMap(ThemeName.init) ?? fallback.theme.themeName,
            mode: defaults.string(forKey: Key.mode).flatMap(ThemeMode.init) ?? fallback.theme.mode)
        let target = defaults.object(forKey: Key.target) as? Int
        return AppSettings(
            theme: try theme.normalized(),
            einkDisplay: defaults.bool(forKey: Key.eink),
            intensityEnabled: defaults.bool(forKey: Key.intensity),
            defaultIntensityRating: defaults.string(forKey: Key.rating).flatMap(EffortKind.init) ?? fallback.defaultIntensityRating,
            defaultWeightUnit: defaults.string(forKey: Key.unit).flatMap(WeightUnit.init) ?? fallback.defaultWeightUnit,
            weeklyWorkoutTarget: target.flatMap { AppSettings.targetRange.contains($0) ? $0 : nil } ?? fallback.weeklyWorkoutTarget)
    }

    /// Stores every field. Throws `invalidTarget` and stores nothing when the target is out of range.
    public func save(_ settings: AppSettings) throws {
        guard AppSettings.targetRange.contains(settings.weeklyWorkoutTarget) else {
            throw SettingsError.invalidTarget(settings.weeklyWorkoutTarget)
        }
        defaults.set(settings.theme.themeName.rawValue, forKey: Key.theme)
        defaults.set(settings.theme.mode.rawValue, forKey: Key.mode)
        defaults.set(settings.einkDisplay, forKey: Key.eink)
        defaults.set(settings.intensityEnabled, forKey: Key.intensity)
        defaults.set(settings.defaultIntensityRating.rawValue, forKey: Key.rating)
        defaults.set(settings.defaultWeightUnit.rawValue, forKey: Key.unit)
        defaults.set(settings.weeklyWorkoutTarget, forKey: Key.target)
        // A save also ends the migration window, so a save before the first load isn't overwritten.
        defaults.set(true, forKey: Key.stored)
    }

    /// The first load: the web's defaults, with what slices 4 and 5 stored carried over.
    private func migrated() throws -> AppSettings {
        var settings = try AppSettings.webDefaults()
        let legacy = ["progressUnit", "weightUnit", "weeklyWorkoutTarget", "effortKind"]
        guard legacy.contains(where: { defaults.object(forKey: $0) != nil }) else { return settings }
        let unit = defaults.string(forKey: "progressUnit").flatMap(WeightUnit.init)
            ?? defaults.string(forKey: "weightUnit").flatMap(WeightUnit.init)
        if let unit { settings.defaultWeightUnit = unit }
        if let target = defaults.object(forKey: "weeklyWorkoutTarget") as? Int, AppSettings.targetRange.contains(target) {
            settings.weeklyWorkoutTarget = target
        }
        settings.intensityEnabled = true
        settings.defaultIntensityRating = defaults.string(forKey: "effortKind").flatMap(EffortKind.init) ?? .rpe
        return settings
    }
}

// MARK: - Logger

public enum LoggerRules {
    /// The effort picker the logger shows: nil when tracking is off, else the default rating type.
    public static func effortPicker(_ settings: AppSettings) throws -> EffortKind? {
        settings.intensityEnabled ? settings.defaultIntensityRating : nil
    }

    /// The unit a new set starts in: the unit of the set before it in this exercise, else the default.
    public static func newSetUnit(previousSetUnit: WeightUnit?, _ settings: AppSettings) throws -> WeightUnit {
        previousSetUnit ?? settings.defaultWeightUnit
    }
}
