// Scenarios "Workout settings" (the logger follows them) and "E-ink display switch" (motion is off),
// features/ios-app/settings-look.feature, work item 184.
// The web: useIntensityAccess (no effort picker when tracking is off), WorkoutsBlock's default rating
// type, SetLoggingForm (sets start in the settings unit), useReducedMotion in lib/display.ts (OS
// reduced motion or E-ink display). The phone keeps its per-set lbs/kg toggle (work item 163), so a
// new set follows the set before it in the same exercise, and the default only starts an exercise.
//
// API used: LoggerRules.effortPicker(_:), LoggerRules.newSetUnit(previousSetUnit:_:),
// DisplayRules.reducedMotion(einkDisplay:osReduceMotion:)

import Foundation
import Testing
@testable import RipitCore

@Suite("Settings rules")
struct SettingsRulesTests {
    static func settings(tracking: Bool, rating: EffortKind, unit: WeightUnit = .lbs) throws -> AppSettings {
        var s = try AppSettings.webDefaults()
        s.intensityEnabled = tracking
        s.defaultIntensityRating = rating
        s.defaultWeightUnit = unit
        return s
    }

    @Test("No effort picker when tracking is off", arguments: [EffortKind.rpe, .rir])
    func pickerOff(_ rating: EffortKind) throws {
        #expect(try LoggerRules.effortPicker(Self.settings(tracking: false, rating: rating)) == nil)
    }

    @Test("The default rating type when tracking is on", arguments: [EffortKind.rpe, .rir])
    func pickerOn(_ rating: EffortKind) throws {
        #expect(try LoggerRules.effortPicker(Self.settings(tracking: true, rating: rating)) == rating)
    }

    @Test("A new exercise's first set uses the default unit", arguments: [WeightUnit.lbs, .kg])
    func firstSetDefault(_ unit: WeightUnit) throws {
        #expect(try LoggerRules.newSetUnit(previousSetUnit: nil, Self.settings(tracking: false, rating: .rir, unit: unit)) == unit)
    }

    @Test("A later set keeps the unit of the set before it")
    func laterSetKeeps() throws {
        #expect(try LoggerRules.newSetUnit(previousSetUnit: .kg, Self.settings(tracking: false, rating: .rir, unit: .lbs)) == .kg)
        #expect(try LoggerRules.newSetUnit(previousSetUnit: .lbs, Self.settings(tracking: false, rating: .rir, unit: .kg)) == .lbs)
    }

    @Test("Motion is off when E-ink display is on or the OS asks", arguments: [
        (false, false, false), (true, false, true), (false, true, true), (true, true, true),
    ])
    func reducedMotion(_ eink: Bool, _ os: Bool, _ reduced: Bool) throws {
        #expect(try DisplayRules.reducedMotion(einkDisplay: eink, osReduceMotion: os) == reduced)
    }
}
