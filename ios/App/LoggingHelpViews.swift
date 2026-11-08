// Logging help on the workout screen (slice 5, features/ios-app/logging-help.feature): the workout
// clock, each exercise's rest timer, the "Last time" line, effort (RPE/RIR) and warm-up controls.
// Clocks count from stored times (the workout's start, the latest set's createdAt), so they keep
// true time across backgrounding and relaunch.

import RipitCore
import SwiftUI

/// RPE or RIR presets and labels. Which one the logger shows comes from Settings (slice 7).
enum EffortSetting {
    /// The choices the phone offers. RPE is whole numbers only (6 to 10); the web's half steps don't
    /// fit LoggedSet.rpe, an integer (lead decision on work item 174).
    static func presets(_ kind: EffortKind) -> [IntensityPreset] {
        let all = (try? IntensityPresets.presets(kind)) ?? []
        return kind == .rpe ? all.filter { $0.value == $0.value.rounded() } : all
    }

    static func label(_ kind: EffortKind, _ value: Int) -> String {
        presets(kind).first { Int($0.value) == value }?.label ?? "\(value)"
    }
}

/// How long the workout has been running: "05:30", then "1:02:03".
struct WorkoutClock: View {
    let startedAt: Date

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let seconds = (try? LoggingClock.elapsedSeconds(from: startedAt, to: context.date)) ?? 0
            Text((try? LoggingClock.workoutText(seconds)) ?? "")
                .font(.ripit(.headline).monospacedDigit())
                .foregroundStyle(Theme.foreground)
                .accessibilityLabel("Workout time \(Duration.seconds(seconds).formatted(.units(allowed: [.hours, .minutes, .seconds])))")
        }
    }
}

/// An exercise's rest timer, counting up from its latest set in this workout.
struct RestTimerChip: View {
    let timer: RestTimer

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let seconds = (try? LoggingClock.elapsedSeconds(from: timer.startedAt, to: context.date)) ?? 0
            HStack(spacing: 4) {
                Image(systemName: "timer").font(.ripit(.caption, .bold))
                Text((try? LoggingClock.restText(seconds)) ?? "").font(.ripit(.subheadline, .semibold).monospacedDigit())
            }
            .fixedSize()
            .padding(.horizontal, 10)
            .frame(minHeight: 32)
            .background(Theme.primary.opacity(0.15), in: Rectangle())
            .foregroundStyle(Theme.primary)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Rest \(seconds / 60) minutes \(seconds % 60) seconds")
        }
    }
}

/// "Last time: 155 lbs × 5 × 2 @ RPE 8 · Tue Nov 3". Tapping fills the next set.
struct LastTimeLine: View {
    let last: LastTime
    let fill: (Prefill) -> Void
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        Button { if let f = last.fill { fill(f) } } label: {
            Group {
                // At accessibility text sizes everything stacks: label, date, summary, then "Use".
                if typeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) { icon; label }
                        date
                        summary
                        if last.fill != nil { use }
                    }
                    .padding(.vertical, 8)
                } else {
                    HStack(spacing: 8) {
                        icon
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) { label; date }
                            summary
                        }
                        Spacer(minLength: 0)
                        if last.fill != nil { use }
                    }
                }
            }
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: Theme.touch, alignment: .leading)
            .background(Theme.primary.opacity(0.08), in: Rectangle())
            .overlay(alignment: .leading) { Rectangle().fill(Theme.primary).frame(width: 3) }
            .clipShape(Rectangle())
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(last.fill == nil)
        .accessibilityLabel("Last time, \(Format.day(last.completedAt)): \(last.summary ?? "warm-ups only")")
        .accessibilityHint(last.fill == nil ? "" : "Fills the next set")
    }

    private var icon: some View { Image(systemName: "clock.arrow.circlepath").foregroundStyle(Theme.primary) }
    private var label: some View {
        Text("LAST TIME").font(.ripit(.caption2, .bold)).tracking(1).foregroundStyle(Theme.mutedForeground)
    }
    private var date: some View { Text(Format.day(last.completedAt)).font(.ripit(.caption2)).foregroundStyle(Theme.mutedForeground) }
    private var summary: some View {
        Text(last.summary ?? "Warm-ups only")
            .font(.ripit(.subheadline, .semibold).monospacedDigit())
            .foregroundStyle(last.summary == nil ? Theme.mutedForeground : Theme.foreground)
    }
    private var use: some View { Text("Use").font(.ripit(.caption, .bold)).foregroundStyle(Theme.primary) }
}

/// Pick an effort from the web's presets, or none.
struct EffortMenu: View {
    let kind: EffortKind
    @Binding var value: Int?
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        Menu {
            Button("None") { value = nil }
            ForEach(EffortSetting.presets(kind), id: \.value) { p in
                Button {
                    value = Int(p.value)
                } label: {
                    Text("\(kind.rawValue.uppercased()) \(p.label)")
                    Text(p.description)
                }
            }
        } label: {
            HStack(spacing: 4) {
                Text(kind.rawValue.uppercased()).foregroundStyle(Theme.mutedForeground)
                Text(value.map { EffortSetting.label(kind, $0) } ?? "–").monospacedDigit()
                Image(systemName: "chevron.up.chevron.down").font(.ripit(.caption2)).foregroundStyle(Theme.mutedForeground)
            }
            .font(.ripit(.subheadline, .semibold))
            .padding(.horizontal, 12)
            // Full width on its own line at accessibility text sizes (see ExerciseLogger).
            .frame(minWidth: 88, maxWidth: typeSize.isAccessibilitySize ? .infinity : nil, minHeight: Theme.touch,
                   alignment: .leading)
            .background(Theme.muted, in: Rectangle())
            .foregroundStyle(Theme.foreground)
        }
        .accessibilityLabel("\(kind.rawValue.uppercased()) \(value.map { EffortSetting.label(kind, $0) } ?? "none")")
    }
}

/// Marks the next set (or the set being changed) as a warm-up.
struct WarmupToggle: View {
    @Binding var isOn: Bool
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        Button { isOn.toggle() } label: {
            HStack(spacing: 6) {
                Image(systemName: isOn ? "checkmark.square.fill" : "square")
                Text("Warm-up")
            }
            .font(.ripit(.subheadline, .semibold))
            .padding(.horizontal, 12)
            .frame(maxWidth: typeSize.isAccessibilitySize ? .infinity : nil, minHeight: Theme.touch, alignment: .leading)
            .background(isOn ? Theme.accent.opacity(0.2) : Theme.muted, in: Rectangle())
            .foregroundStyle(isOn ? Theme.foreground : Theme.mutedForeground)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Warm-up set")
        .accessibilityValue(isOn ? "On" : "Off")
    }
}

/// "W" for a warm-up and "@ RPE 8" / "@ RIR 2" for effort, after a set's weight and reps.
struct SetTags: View {
    let rpe: Int?
    let rir: Int?
    let isWarmup: Bool

    var body: some View {
        HStack(spacing: 6) {
            if let rir {
                Text("@ RIR \(EffortSetting.label(.rir, rir))")
            } else if let rpe {
                Text("@ RPE \(rpe)")
            }
            if isWarmup {
                Text("W")
                    .font(.ripit(.caption, .bold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Theme.accent.opacity(0.25), in: Rectangle())
                    .accessibilityLabel("Warm-up")
            }
        }
        .font(.ripit(.subheadline).monospacedDigit())
        .foregroundStyle(Theme.mutedForeground)
    }
}
