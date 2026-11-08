// Scenario "Themes" (features/ios-app/settings-look.feature, work item 184).
// Compares the phone's theme table with Tests/Fixtures/themes/tokens.json: what headless Chrome
// resolved from app/globals.css after the web's own normalizePreference and applyTheme
// (scripts/ios/theme-tokens-goldens.ts), for all 13 themes in light and dark.
//
// API used: ThemeName (allCases, label(), isLightOnly()), ThemePreference (webDefault(),
// normalized()), ThemeTable.tokens(_:), ThemeTokens.color(_:)

import Foundation
import Testing
@testable import RipitCore

enum ThemeGolden {
    struct Bad: Error, CustomStringConvertible { let description: String }

    static let url = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("Fixtures/themes/tokens.json")

    static func json() throws -> [String: Any] {
        guard let top = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any] else {
            throw Bad(description: "tokens.json is not an object")
        }
        return top
    }

    static func entry(_ theme: String, _ mode: String) throws -> [String: Any] {
        guard let themes = try json()["themes"] as? [String: Any], let byMode = themes[theme] as? [String: Any],
              let entry = byMode[mode] as? [String: Any] else { throw Bad(description: "no \(theme) \(mode)") }
        return entry
    }

    static func tokens(_ theme: String, _ mode: String) throws -> [String: String] {
        guard let tokens = try entry(theme, mode)["tokens"] as? [String: String] else { throw Bad(description: "no tokens") }
        return tokens
    }

    static func preference(_ raw: Any?) throws -> ThemePreference {
        guard let p = raw as? [String: String], let name = ThemeName(rawValue: p["themeName"] ?? ""),
              let mode = ThemeMode(rawValue: p["mode"] ?? "") else { throw Bad(description: "bad preference \(String(describing: raw))") }
        return ThemePreference(themeName: name, mode: mode)
    }

    /// Every theme × mode, as the golden names them.
    static let cases: [(String, String)] = ThemeName.allCases.flatMap { t in ThemeMode.allCases.map { (t.rawValue, $0.rawValue) } }
}

@Suite("Theme tokens")
struct ThemeTokenTests {
    @Test("The golden loads: 13 themes, both modes, RIPIT dark is #1A1108")
    func goldenLoads() throws {
        let order = try ThemeGolden.json()["order"] as? [String]
        #expect(order?.count == 13)
        for (t, m) in ThemeGolden.cases { #expect(try ThemeGolden.tokens(t, m).count >= 40, "\(t) \(m)") }
        #expect(try ThemeGolden.tokens("ripit", "dark")["background"] == "#1A1108")
    }

    @Test("The phone's themes are the web's 13, in the web's order")
    func order() throws {
        let order = try ThemeGolden.json()["order"] as? [String]
        #expect(ThemeName.allCases.map(\.rawValue) == order)
    }

    @Test("Labels match the web's picker", arguments: ThemeName.allCases)
    func label(_ theme: ThemeName) throws {
        let labels = try ThemeGolden.json()["labels"] as? [String: String]
        #expect(try theme.label() == labels?[theme.rawValue])
    }

    @Test("Only E-ink is light-only", arguments: ThemeName.allCases)
    func lightOnly(_ theme: ThemeName) throws {
        let lightOnly = try ThemeGolden.json()["lightOnly"] as? [String] ?? []
        #expect(try theme.isLightOnly() == lightOnly.contains(theme.rawValue))
    }

    @Test("A new install starts on RIPIT, dark")
    func webDefault() throws {
        let expected = try ThemeGolden.preference(try ThemeGolden.json()["defaultTheme"])
        #expect(expected == ThemePreference(themeName: .ripit, mode: .dark))
        #expect(try ThemePreference.webDefault() == expected)
    }

    @Test("A preference reads as the web shows it (E-ink dark reads as light)", arguments: ThemeGolden.cases)
    func normalized(_ theme: String, _ mode: String) throws {
        let stored = ThemePreference(themeName: ThemeName(rawValue: theme)!, mode: ThemeMode(rawValue: mode)!)
        let shown = try ThemeGolden.preference(try ThemeGolden.entry(theme, mode)["shown"])
        #expect(try stored.normalized() == shown)
    }

    @Test("Every token equals the web's, for every theme and mode", arguments: ThemeGolden.cases)
    func tokens(_ theme: String, _ mode: String) throws {
        let expected = try ThemeGolden.tokens(theme, mode)
        let pref = ThemePreference(themeName: ThemeName(rawValue: theme)!, mode: ThemeMode(rawValue: mode)!)
        let actual = try ThemeTable.tokens(pref).values
        let missing = Set(expected.keys).subtracting(actual.keys).sorted()
        let extra = Set(actual.keys).subtracting(expected.keys).sorted()
        let wrong = expected.keys.sorted().filter { actual[$0] != nil && actual[$0] != expected[$0] }
            .map { "\($0): web \(expected[$0]!), phone \(actual[$0]!)" }
        #expect(missing.isEmpty, "\(theme) \(mode) missing \(missing)")
        #expect(extra.isEmpty, "\(theme) \(mode) has tokens the web doesn't define: \(extra)")
        #expect(wrong.isEmpty, "\(theme) \(mode) \(wrong)")
    }

    @Test("E-ink dark shows exactly E-ink light's tokens")
    func einkDarkIsLight() throws {
        let dark = try ThemeTable.tokens(ThemePreference(themeName: .eink, mode: .dark))
        let light = try ThemeTable.tokens(ThemePreference(themeName: .eink, mode: .light))
        #expect(dark == light)
        #expect(dark.values["background"] == "#FFFFFF")
    }

    @Test("Hex tokens read as 0xRRGGBB colors; others read as nil")
    func colors() throws {
        let ripitDark = try ThemeTable.tokens(ThemePreference(themeName: .ripit, mode: .dark))
        #expect(try ripitDark.color("background") == 0x1A1108)
        #expect(try ripitDark.color("primary") == 0x10B981)
        #expect(try ripitDark.color("primary-rgb") == nil)
        #expect(try ripitDark.color("no-such-token") == nil)
        let eink = try ThemeTable.tokens(ThemePreference(themeName: .eink, mode: .light))
        #expect(try eink.color("foreground") == 0x000000)
        #expect(try eink.color("warning") == 0xFFE600)
    }

    @Test("Every hex token in the golden parses to its own value", arguments: ThemeGolden.cases)
    func everyColorParses(_ theme: String, _ mode: String) throws {
        let tokens = ThemeTokens(values: try ThemeGolden.tokens(theme, mode))
        for (name, value) in tokens.values where value.hasPrefix("#") {
            #expect(try tokens.color(name) == UInt32(value.dropFirst(), radix: 16), "\(theme) \(mode) \(name)")
        }
    }
}
