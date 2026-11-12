// The finish summary's wording (work item 180), as components/features/training/WorkoutRollupModal.tsx
// renders it. Rounding copies JavaScript: Math.round is half up (toward +infinity) and toFixed(1)
// rounds the double's exact decimal value half up.

import Foundation

enum RollupFormat {
    static func text(_ r: WorkoutRollup) -> RollupText {
        var tiles: [RollupTile] = []
        if !r.isMinimal {
            if r.totalVolumeLbs > 0 {
                tiles.append(RollupTile(label: "Volume (lbs)", value: volume(r.totalVolumeLbs)))
                tiles.append(RollupTile(label: "Reps", value: grouped(r.totalReps)))
            } else if r.totalReps > 0 {
                tiles.append(RollupTile(label: "Total Reps", value: grouped(r.totalReps)))
            }
            tiles.append(RollupTile(label: "Working Sets", value: String(r.workingSetCount)))
            tiles.append(RollupTile(label: "Exercises", value: String(r.exerciseCount)))
            if let d = r.durationSeconds { tiles.append(RollupTile(label: "Duration", value: duration(d))) }
        }
        return RollupText(
            workoutNumber: "#\(r.lifetimeWorkoutCount)", last7Days: String(r.workoutsLast7Days), tiles: tiles,
            exercises: r.exercises.map(exercise), note: r.isMinimal ? "Marked complete. Nice work." : nil,
            canSave: r.isAdHoc && !r.isMinimal && !r.exercises.isEmpty)
    }

    static func exercise(_ ex: RollupExercise) -> RollupExerciseText {
        var line = "\(ex.workingSets) set\(ex.workingSets == 1 ? "" : "s") · \(ex.reps) rep\(ex.reps == 1 ? "" : "s")"
        if !ex.isBodyweight { line += " · \(volume(ex.volumeLbs)) lbs" }
        let top = ex.topSet.flatMap { ex.isBodyweight ? nil : "top \(weight($0.weight)) × \($0.reps)" }
        return RollupExerciseText(name: ex.name, top: top, line: line, trend: trend(ex))
    }

    static func trend(_ ex: RollupExercise) -> String? {
        guard let vs = ex.vsLastTime else { return nil }
        if !ex.isBodyweight && vs.previousVolumeLbs > 0 {
            let pct = jsRound((ex.volumeLbs - vs.previousVolumeLbs) / vs.previousVolumeLbs * 100)
            if pct > 0 { return "+\(pct)% vs last" }
            if pct < 0 { return "\(pct)% vs last" }
            return "same as last"
        }
        if ex.isBodyweight, let prev = vs.previousTopSet?.reps, prev != 0, ex.reps != prev {
            let delta = ex.reps - prev
            return "\(delta > 0 ? "+" : "")\(delta) reps vs last"
        }
        return nil
    }

    /// "1h 2m", "5m 03s", "45s".
    static func duration(_ seconds: Int) -> String {
        let h = seconds / 3600, m = seconds % 3600 / 60, s = seconds % 60
        if h > 0 { return "\(h)h \(m)m" }
        if m > 0 { return "\(m)m \(s < 10 ? "0" : "")\(s)s" }
        return "\(s)s"
    }

    /// "1,001", or "10.2k" from 10,000.
    static func volume(_ lbs: Double) -> String {
        lbs >= 10_000 ? "\(toFixed1(lbs / 1000))k" : grouped(jsRound(lbs))
    }

    /// "195", or "156.3".
    static func weight(_ w: Double) -> String {
        w == w.rounded() ? String(Int(w)) : toFixed1(w)
    }

    /// JavaScript's Math.round: half up, toward +infinity.
    static func jsRound(_ x: Double) -> Int { Int((x + 0.5).rounded(.down)) }

    /// en-US toLocaleString for a whole number: "1,234".
    static func grouped(_ n: Int) -> String {
        let digits = String(n.magnitude)
        var out = ""
        for (i, c) in digits.enumerated() {
            if i > 0 && (digits.count - i) % 3 == 0 { out.append(",") }
            out.append(c)
        }
        return n < 0 ? "-\(out)" : out
    }

    /// JavaScript's toFixed(1) for x ≥ 0: the exact decimal value rounded half up.
    static func toFixed1(_ x: Double) -> String {
        let exact = String(format: "%.40f", x)
        let parts = exact.split(separator: ".")
        let digits = Array(parts[1])
        var tenths = (Int(parts[0]) ?? 0) * 10 + Int(String(digits[0]))!
        if Int(String(digits[1]))! >= 5 { tenths += 1 }
        return "\(tenths / 10).\(tenths % 10)"
    }
}
