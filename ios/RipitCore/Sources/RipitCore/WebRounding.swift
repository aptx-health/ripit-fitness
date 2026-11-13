// Rounding as the web's JavaScript does it (work item 172), so Progress shows the same text as
// ripit.fit. Foundation's number formatting rounds half to even, and Swift's `rounded()` rounds
// half away from zero; JavaScript does neither.

import Foundation

public enum WebRounding {
    /// `Math.round`: the nearest integer, halves toward +∞ (2.5 → 3, -14.5 → -14).
    public static func round(_ x: Double) -> Int {
        let floor = x.rounded(.down)
        return Int(x - floor >= 0.5 ? floor + 1 : floor)
    }

    /// `x.toFixed(digits)`: the exact binary value rounded half up in magnitude, sign kept
    /// (3.25 → "3.3", 8.25 → "8.3", -8.25 → "-8.3", 0.35 → "0.3" because 0.35 is really 0.3499…).
    public static func toFixed(_ x: Double, _ digits: Int) -> String {
        guard x.isFinite else { return "\(x)" }
        // printf writes the double's exact decimal digits, which Decimal holds without loss.
        var exact = Decimal(string: String(format: "%.30f", abs(x)), locale: Locale(identifier: "en_US_POSIX")) ?? 0
        var rounded = Decimal()
        NSDecimalRound(&rounded, &exact, digits, .plain)
        let body = String(format: "%.\(digits)f", NSDecimalNumber(decimal: rounded).doubleValue)
        return x < 0 ? "-" + body : body   // JS keeps the sign: (-0.04).toFixed(1) is "-0.0"
    }

    /// The web's formatWeight: `Math.round(w * 10) / 10` printed without a trailing ".0" (275, 102.5).
    public static func oneDecimal(_ x: Double) -> String {
        let tenths = round(x * 10)
        return tenths % 10 == 0 ? "\(tenths / 10)" : toFixed(Double(tenths) / 10, 1)
    }
}
