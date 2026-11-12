// Scenarios "Settings tab" (every change saves right away and stays after relaunch), "Themes" (a new
// install starts on RIPIT, dark; E-ink has no dark) and "Workout settings" (the target moves here from
// the Progress sheet), features/ios-app/settings-look.feature, work item 184.
// Defaults are the web's: lib/theme.ts DEFAULT_THEME, lib/display.ts (E-ink display off), prisma
// UserSettings (intensityEnabled false, defaultIntensityRating "rir", defaultWeightUnit "lbs",
// weeklyWorkoutTarget 3) and the 1-14 target rule in app/api/settings/route.ts.
// The migration reads the keys slices 4 and 5 wrote with @AppStorage: "progressUnit",
// "weeklyWorkoutTarget", "effortKind", and "weightUnit" (the last unit logged).
//
// API used: AppSettings.webDefaults(), SettingsStore(defaults:), load(), save(_:), SettingsError

import Foundation
import Testing
@testable import RipitCore

enum SettingsSupport {
    /// An empty UserDefaults of its own: a new install.
    static func freshDefaults() -> UserDefaults {
        UserDefaults(suiteName: "ripit-settings-test-\(UUID().uuidString)")!
    }

    static let custom = AppSettings(theme: ThemePreference(themeName: .dracula, mode: .light), einkDisplay: true,
                                    intensityEnabled: true, defaultIntensityRating: .rpe, defaultWeightUnit: .kg,
                                    weeklyWorkoutTarget: 5)
}

@Suite("Settings store")
struct SettingsStoreTests {
    @Test("The web's defaults: RIPIT dark, E-ink display off, tracking off, RIR, lbs, 3 a week")
    func webDefaults() throws {
        #expect(try AppSettings.webDefaults() == AppSettings(
            theme: ThemePreference(themeName: .ripit, mode: .dark), einkDisplay: false, intensityEnabled: false,
            defaultIntensityRating: .rir, defaultWeightUnit: .lbs, weeklyWorkoutTarget: 3))
    }

    @Test("A new install loads the web's defaults")
    func newInstall() throws {
        #expect(try SettingsStore(defaults: SettingsSupport.freshDefaults()).load() == AppSettings.webDefaults())
    }

    @Test("A save reads back at once and after a relaunch")
    func saveAndRelaunch() throws {
        let defaults = SettingsSupport.freshDefaults()
        let store = SettingsStore(defaults: defaults)
        try store.save(SettingsSupport.custom)
        #expect(try store.load() == SettingsSupport.custom)
        #expect(try SettingsStore(defaults: defaults).load() == SettingsSupport.custom)
    }

    /// One field changed from the defaults, so a field that isn't stored can't hide behind another.
    static let oneField: [(String, @Sendable (inout AppSettings) -> Void)] = [
        ("theme", { $0.theme = ThemePreference(themeName: .okabe, mode: .dark) }),
        ("mode", { $0.theme.mode = .light }),
        ("einkDisplay", { $0.einkDisplay = true }),
        ("intensityEnabled", { $0.intensityEnabled = true }),
        ("defaultIntensityRating", { $0.defaultIntensityRating = .rpe }),
        ("defaultWeightUnit", { $0.defaultWeightUnit = .kg }),
        ("weeklyWorkoutTarget", { $0.weeklyWorkoutTarget = 14 }),
    ]

    @Test("Each setting is stored on its own", arguments: 0..<7)
    func eachField(_ index: Int) throws {
        let defaults = SettingsSupport.freshDefaults()
        var settings = try AppSettings.webDefaults()
        Self.oneField[index].1(&settings)
        try SettingsStore(defaults: defaults).save(settings)
        #expect(try SettingsStore(defaults: defaults).load() == settings, "\(Self.oneField[index].0)")
    }

    @Test("Saving again replaces the last save")
    func saveTwice() throws {
        let defaults = SettingsSupport.freshDefaults()
        try SettingsStore(defaults: defaults).save(SettingsSupport.custom)
        let back = try AppSettings.webDefaults()
        try SettingsStore(defaults: defaults).save(back)
        #expect(try SettingsStore(defaults: defaults).load() == back)
    }

    @Test("E-ink saved with dark reads as E-ink light; other settings unchanged")
    func einkDarkReadsLight() throws {
        let defaults = SettingsSupport.freshDefaults()
        var settings = SettingsSupport.custom
        settings.theme = ThemePreference(themeName: .eink, mode: .dark)
        try SettingsStore(defaults: defaults).save(settings)
        var expected = settings
        expected.theme.mode = .light
        #expect(try SettingsStore(defaults: defaults).load() == expected)
    }

    @Test("A dark theme other than E-ink stays dark")
    func otherDarkStaysDark() throws {
        let defaults = SettingsSupport.freshDefaults()
        var settings = try AppSettings.webDefaults()
        settings.theme = ThemePreference(themeName: .github, mode: .dark)
        try SettingsStore(defaults: defaults).save(settings)
        #expect(try SettingsStore(defaults: defaults).load().theme == ThemePreference(themeName: .github, mode: .dark))
    }

    @Test("Targets 1 and 14 are kept", arguments: [1, 14])
    func targetEdges(_ target: Int) throws {
        let defaults = SettingsSupport.freshDefaults()
        var settings = try AppSettings.webDefaults()
        settings.weeklyWorkoutTarget = target
        try SettingsStore(defaults: defaults).save(settings)
        #expect(try SettingsStore(defaults: defaults).load().weeklyWorkoutTarget == target)
    }

    @Test("A target outside 1 to 14 is refused and nothing is saved", arguments: [0, 15, -1])
    func targetRefused(_ target: Int) throws {
        let defaults = SettingsSupport.freshDefaults()
        let store = SettingsStore(defaults: defaults)
        try store.save(SettingsSupport.custom)
        var settings = try AppSettings.webDefaults()
        settings.weeklyWorkoutTarget = target
        #expect(throws: SettingsError.invalidTarget(target)) { try store.save(settings) }
        #expect(try SettingsStore(defaults: defaults).load() == SettingsSupport.custom)
    }
}

@Suite("Settings migration")
struct SettingsMigrationTests {
    /// A phone that ran slices 4-6 with these @AppStorage values.
    static func legacy(_ values: [String: Any]) -> UserDefaults {
        let defaults = SettingsSupport.freshDefaults()
        for (key, value) in values { defaults.set(value, forKey: key) }
        return defaults
    }

    static func expected(_ change: (inout AppSettings) -> Void) throws -> AppSettings {
        var settings = try AppSettings.webDefaults()
        change(&settings)
        return settings
    }

    @Test("Progress unit and target, and effortKind, carry over")
    func everything() throws {
        let defaults = Self.legacy(["progressUnit": "kg", "weeklyWorkoutTarget": 5, "effortKind": "rir"])
        #expect(try SettingsStore(defaults: defaults).load() == Self.expected {
            $0.defaultWeightUnit = .kg; $0.weeklyWorkoutTarget = 5; $0.intensityEnabled = true; $0.defaultIntensityRating = .rir
        })
    }

    @Test("effortKind RPE alone: tracking on with RPE, the rest web defaults")
    func effortOnly() throws {
        let defaults = Self.legacy(["effortKind": "rpe"])
        #expect(try SettingsStore(defaults: defaults).load() == Self.expected {
            $0.intensityEnabled = true; $0.defaultIntensityRating = .rpe
        })
    }

    @Test("Only a logged unit: it becomes the default unit, and tracking stays on with RPE as before")
    func loggedUnitOnly() throws {
        let defaults = Self.legacy(["weightUnit": "kg"])
        #expect(try SettingsStore(defaults: defaults).load() == Self.expected {
            $0.defaultWeightUnit = .kg; $0.intensityEnabled = true; $0.defaultIntensityRating = .rpe
        })
    }

    @Test("The Progress unit wins over the last logged unit")
    func progressUnitWins() throws {
        let defaults = Self.legacy(["progressUnit": "lbs", "weightUnit": "kg"])
        #expect(try SettingsStore(defaults: defaults).load().defaultWeightUnit == .lbs)
        let other = Self.legacy(["progressUnit": "kg", "weightUnit": "lbs"])
        #expect(try SettingsStore(defaults: other).load().defaultWeightUnit == .kg)
    }

    @Test("Only a Progress target: kept, tracking on with RPE")
    func targetOnly() throws {
        let defaults = Self.legacy(["weeklyWorkoutTarget": 14])
        #expect(try SettingsStore(defaults: defaults).load() == Self.expected {
            $0.weeklyWorkoutTarget = 14; $0.intensityEnabled = true; $0.defaultIntensityRating = .rpe
        })
    }

    @Test("Legacy values the phone doesn't know migrate as defaults")
    func badLegacy() throws {
        let defaults = Self.legacy(["weeklyWorkoutTarget": 20, "effortKind": "x", "progressUnit": "stone"])
        #expect(try SettingsStore(defaults: defaults).load() == Self.expected {
            $0.intensityEnabled = true; $0.defaultIntensityRating = .rpe
        })
        let zero = Self.legacy(["weeklyWorkoutTarget": 0])
        #expect(try SettingsStore(defaults: zero).load().weeklyWorkoutTarget == 3)
    }

    @Test("The migrated values stay after a relaunch")
    func migratedThenRelaunch() throws {
        let defaults = Self.legacy(["progressUnit": "kg", "weeklyWorkoutTarget": 6, "effortKind": "rir"])
        let first = try SettingsStore(defaults: defaults).load()
        #expect(try SettingsStore(defaults: defaults).load() == first)
        #expect(first.weeklyWorkoutTarget == 6)
    }

    @Test("It runs once: later changes win over the old keys, even if the old keys change again")
    func runsOnce() throws {
        let defaults = Self.legacy(["progressUnit": "kg", "effortKind": "rir", "weeklyWorkoutTarget": 5])
        let store = SettingsStore(defaults: defaults)
        var settings = try store.load()
        settings.defaultWeightUnit = .lbs
        settings.intensityEnabled = false
        settings.weeklyWorkoutTarget = 2
        try store.save(settings)
        // The old screens' keys are written again (an old view still holds @AppStorage).
        defaults.set("kg", forKey: "progressUnit")
        defaults.set("kg", forKey: "weightUnit")
        defaults.set("rpe", forKey: "effortKind")
        defaults.set(9, forKey: "weeklyWorkoutTarget")
        #expect(try SettingsStore(defaults: defaults).load() == settings)
    }

    @Test("A new install that later logs a set isn't migrated afterwards")
    func newInstallStaysNew() throws {
        let defaults = SettingsSupport.freshDefaults()
        let first = try SettingsStore(defaults: defaults).load()
        defaults.set("kg", forKey: "weightUnit")
        #expect(try SettingsStore(defaults: defaults).load() == first)
        #expect(first == (try AppSettings.webDefaults()))
    }
}
