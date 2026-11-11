// The web's number entry in the logger (slice 9b; NumberKeypad.tsx, RepsStepper.tsx, the RPE/RIR grid):
// no system keyboard. The key rules are RipitCore's NumberKeypad and RepsStepper; this is how they look.
// An open keypad takes over the Log panel, and the bottom bar hides while it is open.

import RipitCore
import SwiftUI

/// Which keypad is open over the Log panel.
enum OpenPad: Equatable {
    case reps(NumberKeypad)
    case weight(NumberKeypad)
    case effort(EffortKind)

    var isEffort: Bool { if case .effort = self { true } else { false } }
}

/// 1–9, CLR, 0, ⌫ under a readout, then Cancel and Done. The weight keypad adds "." in CLR's row.
struct NumberPadView: View {
    @Binding var pad: NumberKeypad
    let title: String
    let unit: String?
    let cancel: () -> Void
    let done: (String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            Text(title.uppercased())
                .font(.ripit(.caption, .bold)).tracking(1)
                .foregroundStyle(Theme.mutedForeground)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.bottom, 6)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(pad.value.isEmpty ? "–" : pad.value)
                    .font(.ripitDisplay(40, relativeTo: .title).monospacedDigit())
                    .foregroundStyle(Theme.foreground)
                if let unit { Text(unit).font(.ripit(.title3)).foregroundStyle(Theme.mutedForeground) }
            }
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .frame(maxWidth: .infinity, minHeight: 64)
            .background(Theme.muted)
            .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: 2))
            .accessibilityElement(children: .combine)
            .accessibilityLabel("\(title) \(pad.value.isEmpty ? "empty" : pad.value) \(unit ?? "")")
            .padding(.bottom, 8)

            let rows: [[KeypadKey]] = [
                [.digit(1), .digit(2), .digit(3)],
                [.digit(4), .digit(5), .digit(6)],
                [.digit(7), .digit(8), .digit(9)],
                [pad.decimal ? .point : .clear, .digit(0), .delete],
            ]
            Grid(horizontalSpacing: 1, verticalSpacing: 1) {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    GridRow {
                        ForEach(Array(row.enumerated()), id: \.offset) { _, key in keyButton(key) }
                    }
                }
            }
            .background(Theme.border)
            if pad.decimal {
                keyButton(.clear).padding(.top, 1)
            }
            HStack(spacing: 8) {
                Button("Cancel", action: cancel).buttonStyle(OutlineButtonStyle())
                Button("Done") { done((try? pad.done()) ?? pad.value) }
                    .buttonStyle(FilledButtonStyle(fill: Theme.success, foreground: Theme.successForeground, shadow: nil))
            }
            .lineLimit(1)
            .padding(.top, 10)
        }
        // Capped so the keys and Cancel / Done keep one line and the pad fits the panel at the largest sizes.
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    }

    private func keyButton(_ key: KeypadKey) -> some View {
        let (label, spoken): (String, String) = switch key {
        case .digit(let d): ("\(d)", "\(d)")
        case .clear: ("CLR", "Clear")
        case .delete: ("⌫", "Delete")
        case .point: (".", "Point")
        }
        let isDigit = if case .digit = key { true } else { false }
        return Button { try? pad.press(key) } label: {
            Group {
                if case .delete = key {
                    Image(systemName: "delete.left")
                } else {
                    Text(label)
                }
            }
            .font(isDigit || key == .point ? .ripit(.title2, .bold).monospacedDigit() : .ripit(.subheadline, .bold))
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(isDigit ? Theme.card : Theme.muted)
            .foregroundStyle(Theme.foreground)
            .contentShape(Rectangle())
        }
        .buttonStyle(KeyPressStyle())
        .accessibilityLabel(spoken)
    }
}

private struct KeyPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.opacity(configuration.isPressed ? 0.6 : 1)
    }
}

/// The web's RPE/RIR grid: each preset with its description, and none.
struct EffortGrid: View {
    let kind: EffortKind
    let value: Int?
    let pick: (Int?) -> Void
    let cancel: () -> Void
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let presets = EffortSetting.presets(kind)
        let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: typeSize.isAccessibilitySize ? 1 : 2)
        VStack(alignment: .leading, spacing: 10) {
            Text(kind.rawValue.uppercased())
                .font(.ripit(.caption, .bold)).tracking(1).foregroundStyle(Theme.mutedForeground)
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(presets, id: \.value) { p in
                    let on = value == Int(p.value)
                    Button { pick(Int(p.value)) } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(kind.rawValue.uppercased()) \(p.label)").font(.ripit(.headline, .bold))
                            Text(p.description).font(.ripit(.caption)).foregroundStyle(on ? Theme.primaryForeground : Theme.mutedForeground)
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(on ? Theme.primary : Theme.muted)
                        .foregroundStyle(on ? Theme.primaryForeground : Theme.foreground)
                        .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: Theme.line))
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
            HStack(spacing: 8) {
                Button("Cancel", action: cancel).buttonStyle(OutlineButtonStyle())
                Button("None") { pick(nil) }.buttonStyle(OutlineButtonStyle())
            }
        }
    }
}

/// − readout +: the readout opens the reps keypad.
struct RepsStepperView: View {
    let reps: String
    let set: (String) -> Void
    let openPad: () -> Void
    @ScaledMetric(relativeTo: .title2) private var side: CGFloat = 56

    var body: some View {
        let canDecrement = (try? RepsStepper.canDecrement(reps)) ?? false
        HStack(spacing: 0) {
            Button { set((try? RepsStepper.decrement(reps)) ?? reps) } label: {
                Image(systemName: "minus").font(.ripit(.title2, .bold))
                    .frame(width: side).frame(maxHeight: .infinity)
                    .background(Theme.muted)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(Theme.foreground.opacity(canDecrement ? 1 : 0.35))
            .disabled(!canDecrement)
            .accessibilityLabel("Fewer reps")
            Button(action: openPad) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(reps.isEmpty ? "–" : reps).font(.ripit(.title, .bold).monospacedDigit())
                    Text("reps").font(.ripit(.subheadline)).foregroundStyle(Theme.mutedForeground)
                }
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.card)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(Theme.foreground)
            .accessibilityLabel("Reps \(reps.isEmpty ? "empty" : reps)")
            .accessibilityHint("Opens the keypad")
            Button { set((try? RepsStepper.increment(reps)) ?? reps) } label: {
                Image(systemName: "plus").font(.ripit(.title2, .bold))
                    .frame(width: side).frame(maxHeight: .infinity)
                    .background(Theme.success.opacity(0.2))
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(Theme.text(Theme.success))
            .accessibilityLabel("More reps")
        }
        .frame(minHeight: side)
        .fixedSize(horizontal: false, vertical: true)
        .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: 2))
    }
}
