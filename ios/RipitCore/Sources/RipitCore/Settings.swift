// Public API for slice 7, Settings and the web's look (features/ios-app/settings-look.feature).
// Shapes were fixed by work item 184; the bodies throw `notImplemented` until slice 7's build fills
// them in. The tests in Tests/RipitCoreTests/Settings*Tests.swift and ThemeTokenTests.swift are the
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
        throw RipitCoreError.notImplemented
    }

    /// True for themes with no dark mode (E-ink).
    public func isLightOnly() throws -> Bool {
        throw RipitCoreError.notImplemented
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
        throw RipitCoreError.notImplemented
    }

    /// The preference as it can be shown: a light-only theme is always light.
    public func normalized() throws -> ThemePreference {
        throw RipitCoreError.notImplemented
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
        throw RipitCoreError.notImplemented
    }
}

public enum ThemeTable {
    /// The tokens the web shows for this preference (normalized first, so eink dark is eink light).
    public static func tokens(_ preference: ThemePreference) throws -> ThemeTokens {
        throw RipitCoreError.notImplemented
    }
}

// MARK: - Display

public enum DisplayRules {
    /// Motion is off when E-ink display is on or the OS asks for reduced motion.
    public static func reducedMotion(einkDisplay: Bool, osReduceMotion: Bool) throws -> Bool {
        throw RipitCoreError.notImplemented
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
        throw RipitCoreError.notImplemented
    }
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

    /// The stored settings, after the one-time migration on the first load. The theme comes back
    /// normalized.
    public func load() throws -> AppSettings {
        throw RipitCoreError.notImplemented
    }

    /// Stores every field. Throws `invalidTarget` and stores nothing when the target is out of range.
    public func save(_ settings: AppSettings) throws {
        throw RipitCoreError.notImplemented
    }
}

// MARK: - Logger

public enum LoggerRules {
    /// The effort picker the logger shows: nil when tracking is off, else the default rating type.
    public static func effortPicker(_ settings: AppSettings) throws -> EffortKind? {
        throw RipitCoreError.notImplemented
    }

    /// The unit a new set starts in: the unit of the set before it in this exercise, else the default.
    public static func newSetUnit(previousSetUnit: WeightUnit?, _ settings: AppSettings) throws -> WeightUnit {
        throw RipitCoreError.notImplemented
    }
}
