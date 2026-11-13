// Work item 172: Progress rounds like the web's JavaScript (toFixed(1), Math.round, formatWeight).

import Testing
@testable import RipitCore

@Suite("Rounding like the web")
struct WebRoundingTests {
    @Test("toFixed(1): halves round up, like the web", arguments: [(3.25, "3.3"), (8.25, "8.3"), (7.0, "7.0"), (8.15, "8.2")])
    func toFixedHalfUp(_ x: Double, _ expected: String) {
        #expect(WebRounding.toFixed(x, 1) == expected)
    }

    @Test("toFixed(1): the exact binary value decides (0.35 is 0.3499…), and negatives keep their sign")
    func toFixedExact() {
        #expect(WebRounding.toFixed(0.35, 1) == "0.3")
        #expect(WebRounding.toFixed(-8.25, 1) == "-8.3")
        #expect(WebRounding.toFixed(-0.04, 1) == "-0.0")
    }

    @Test("Math.round: halves go toward +∞, so -14.5 is -14", arguments: [(-14.5, -14), (14.5, 15), (2.5, 3), (-2.6, -3), (0.49, 0)])
    func mathRound(_ x: Double, _ expected: Int) {
        #expect(WebRounding.round(x) == expected)
    }

    @Test("formatWeight: one decimal at most, no trailing .0", arguments: [(275.0, "275"), (102.5, "102.5"), (102.25, "102.3"), (99.96, "100")])
    func oneDecimal(_ x: Double, _ expected: String) {
        #expect(WebRounding.oneDecimal(x) == expected)
    }
}
