// Logging help on the workout screen (slice 5, features/ios-app/logging-help.feature): the workout
// clock, each exercise's rest timer, the "Last time" line, effort (RPE/RIR) and warm-up controls.
// Clocks count from stored times (the workout's start, the latest set's createdAt), so they keep
// true time across backgrounding and relaunch.

import RipitCore
import SwiftUI

/// RPE or RIR. There is no Settings screen yet (slice 7 moves it there), so the logger has a toggle.
enum EffortSetting {
    static let key = "effortKind"

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
                .font(.headline.monospacedDigit())
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
                Image(systemName: "timer").font(.caption.weight(.bold))
                Text((try? LoggingClock.restText(seconds)) ?? "").font(.subheadline.monospacedDigit().weight(.semibold))
            }
            .fixedSize()
            .padding(.horizontal, 10)
            .frame(minHeight: 32)
            .background(Theme.primary.opacity(0.15), in: Capsule())
            .foregroundStyle(Theme.primary)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Rest \(seconds / 60) minutes \(seconds % 60) seconds")
        }
    }
}

/// RPE or RIR for the logger; a small segmented switch.
struct EffortKindToggle: View {
    @AppStorage(EffortSetting.key) private var kind: EffortKind = .rpe

    var body: some View {
        Picker("Effort", selection: $kind) {
            Text("RPE").tag(EffortKind.rpe)
            Text("RIR").tag(EffortKind.rir)
        }
        .pickerStyle(.segmented)
        .frame(width: 120, height: Theme.touch)
        .accessibilityLabel("Effort scale")
    }
}

/// "Last time: 155 lbs × 5 × 2 @ RPE 8 · Tue Nov 3". Tapping fills the next set.
struct LastTimeLine: View {
    let last: LastTime
    let fill: (Prefill) -> Void

    var body: some View {
        Button { if let f = last.fill { fill(f) } } label: {
            HStack(spacing: 8) {
                Image(systemName: "clock.arrow.circlepath").foregroundStyle(Theme.primary)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text("LAST TIME").font(.caption2.weight(.bold)).tracking(1).foregroundStyle(Theme.mutedForeground)
                        Text(Format.day(last.completedAt)).font(.caption2).foregroundStyle(Theme.mutedForeground)
                    }
                    Text(last.summary ?? "Warm-ups only")
                        .font(.subheadline.monospacedDigit().weight(.semibold))
                        .foregroundStyle(last.summary == nil ? Theme.mutedForeground : Theme.foreground)
                }
                Spacer(minLength: 0)
                if last.fill != nil {
                    Text("Use").font(.caption.weight(.bold)).foregroundStyle(Theme.primary)
                }
            }
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: Theme.touch, alignment: .leading)
            .background(Theme.primary.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
            .overlay(alignment: .leading) { Rectangle().fill(Theme.primary).frame(width: 3) }
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(last.fill == nil)
        .accessibilityLabel("Last time, \(Format.day(last.completedAt)): \(last.summary ?? "warm-ups only")")
        .accessibilityHint(last.fill == nil ? "" : "Fills the next set")
    }
}

/// Pick an effort from the web's presets, or none.
struct EffortMenu: View {
    let kind: EffortKind
    @Binding var value: Int?

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
                Image(systemName: "chevron.up.chevron.down").font(.caption2).foregroundStyle(Theme.mutedForeground)
            }
            .font(.subheadline.weight(.semibold))
            .padding(.horizontal, 12)
            .frame(minWidth: 88, minHeight: Theme.touch)
            .background(Theme.muted, in: RoundedRectangle(cornerRadius: 8))
            .foregroundStyle(Theme.foreground)
        }
        .accessibilityLabel("\(kind.rawValue.uppercased()) \(value.map { EffortSetting.label(kind, $0) } ?? "none")")
    }
}

/// Marks the next set (or the set being changed) as a warm-up.
struct WarmupToggle: View {
    @Binding var isOn: Bool

    var body: some View {
        Button { isOn.toggle() } label: {
            HStack(spacing: 6) {
                Image(systemName: isOn ? "checkmark.square.fill" : "square")
                Text("Warm-up")
            }
            .font(.subheadline.weight(.semibold))
            .padding(.horizontal, 12)
            .frame(minHeight: Theme.touch)
            .background(isOn ? Theme.accent.opacity(0.2) : Theme.muted, in: RoundedRectangle(cornerRadius: 8))
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
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Theme.accent.opacity(0.25), in: RoundedRectangle(cornerRadius: 4))
                    .accessibilityLabel("Warm-up")
            }
        }
        .font(.subheadline.monospacedDigit())
        .foregroundStyle(Theme.mutedForeground)
    }
}
