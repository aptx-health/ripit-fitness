// The workout in progress, as the web's one-exercise logger (slice 9b, features/ios-app/one-exercise-logger.feature;
// ExerciseLoggingModal.tsx, AdHocLoggerView.tsx, LoggerBottomBar.tsx): a header with PLAN n/N, the clock,
// FINISH and Exit; one exercise at a time (LoggerPanel); the ‹ Log set › bar; swipe between exercises.
// The rules (next and previous, the bar, swipe, the form after a log) are RipitCore's LoggerNav and
// LoggerRules; this is how they look.

import RipitCore
import SwiftUI
import UIKit

struct WorkoutView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(SettingsModel.self) private var settings
    @Environment(\.accessibilityReduceMotion) private var osReduceMotion
    @State private var currentId: String?
    @State private var forms: [String: EntryForm] = [:]
    /// "+ Extra set" was tapped on these exercises.
    @State private var extraSets: Set<String> = []
    /// Where each exercise's rest stopwatch was closed (its set count then).
    @State private var restClosed: [String: Int] = [:]
    @State private var pad: OpenPad?
    @State private var tab = LoggerTab.log
    @State private var showingPlan = false
    @State private var picker: PickerTarget?
    /// Asked for from the plan list; opens when the list has closed.
    @State private var pendingPicker: PickerTarget?
    @State private var confirmingExit = false
    @State private var confirmingFinish = false
    @State private var finishBlocked = false
    /// The swipe's nudge: 16 pt toward where it went, faded to 0.8 (useSwipeNavigation.ts).
    @State private var nudge: CGFloat = 0
    @State private var logged = 0

    private enum PickerTarget: Identifiable {
        case add
        case swap(ExerciseDetail)
        var id: String { if case .swap(let e) = self { "swap-\(e.id)" } else { "add" } }
    }

    var body: some View {
        let exercises = store.current?.exercises ?? []
        let index = exercises.firstIndex { $0.id == currentId } ?? 0
        let exercise = exercises.indices.contains(index) ? exercises[index] : nil
        dialogs(withSheets(exercises: exercises, index: index, exercise: exercise))
    }

    private func withSheets(exercises: [ExerciseDetail], index: Int, exercise: ExerciseDetail?) -> some View {
        screen(exercises: exercises, index: index, exercise: exercise)
        .background(Theme.background)
        .toolbar(.hidden, for: .navigationBar)
        .bottomBar(fill: Theme.muted) {
            if let exerciseBar = bar(exercises: exercises, index: index, exercise: exercise) { exerciseBar }
        }
        // The bar stays under the keyboard; the logger has no text fields, but the picker does.
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .sensoryFeedback(.impact(weight: .light), trigger: logged)
        .onChange(of: exercises.map(\.id), initial: true) { _, ids in
            if currentId == nil || !ids.contains(currentId!) { currentId = ids.first }
        }
        .onChange(of: currentId) {
            pad = nil
            if tab == .notes { tab = .log }
        }
        // Each exercise's form is filled once, when it first shows; after that it follows the person.
        .onChange(of: exercise?.id, initial: true) {
            if let exercise, forms[exercise.id] == nil { forms[exercise.id] = prefill(exercise) }
        }
        .onAppear(perform: applyDebugHooks)
        // The picker opens once the plan list has gone, never on top of it.
        .sheet(isPresented: $showingPlan, onDismiss: {
            picker = pendingPicker
            pendingPicker = nil
        }) {
            PlanSheet(currentId: currentId,
                      jump: { id in
                          currentId = id
                          showingPlan = false
                      },
                      swap: { openPicker(.swap($0)) },
                      delete: delete,
                      add: { openPicker(.add) })
                .presentationDetents([.large])
                .environment(store)
                .environment(settings)
        }
        .sheet(item: $picker) { target in pickerSheet(target) }
    }

    @ViewBuilder private func screen(exercises: [ExerciseDetail], index: Int, exercise: ExerciseDetail?) -> some View {
        VStack(spacing: 0) {
            header(exercises: exercises, index: index, exercise: exercise)
            if let exercise {
                LoggerPanel(exercise: exercise, planned: store.plannedSets(exercise), unit: unit(exercise),
                            form: formBinding(exercise), pad: $pad, tab: $tab, extraSet: extraSets.contains(exercise.id),
                            restClosedAt: Binding(get: { restClosed[exercise.id] }, set: { restClosed[exercise.id] = $0 }))
                    .id(exercise.id)
                    .padding(.horizontal, 12)
                    .padding(.top, 12)
                    .offset(x: nudge)
                    .opacity(nudge == 0 ? 1 : 0.8)
                    .background(SwipeCatcher { [keypadOpen = pad != nil] dx, dy in
                        swiped(dx: dx, dy: dy, keypadOpen: keypadOpen, exercises: exercises, index: index)
                    })
            } else {
                emptyState
            }
        }
    }

    /// Exit, Finish and error dialogs; their confirm buttons take the accent from the root tint (RipitApp).
    private func dialogs(_ content: some View) -> some View {
        let exercises = store.current?.exercises ?? []
        return content
        .confirmationDialog("Leave this workout?", isPresented: $confirmingExit, titleVisibility: .visible) {
            Button("Discard workout", role: .destructive) { store.discardWorkout() }
            Button("Keep as draft") { store.keepAsDraft() }
        } message: {
            Text("Discarding deletes its logged sets. A draft can be resumed from Quick Actions.")
        }
        .alert("Finish this workout?", isPresented: $confirmingFinish) {
            Button("Cancel", role: .cancel) {}
            Button("Finish") { store.finishWorkout() }
        } message: {
            let sets = exercises.reduce(0) { $0 + $1.sets.count }
            Text("\(sets) \(sets == 1 ? "set" : "sets") logged. It goes into history.")
        }
        .alert("Log a set first, or discard", isPresented: $finishBlocked) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("A workout needs at least one logged set to go into history.")
        }
        .alert("Something went wrong", isPresented: Binding(get: { store.lastError != nil }, set: { if !$0 { store.lastError = nil } })) {
            Button("OK") { store.lastError = nil }
        } message: {
            Text(store.lastError ?? "")
        }
    }

    // MARK: - Header

    /// PLAN n/N · clock · FINISH · ✕ on the secondary color, like ExerciseLoggingHeader.tsx.
    private func header(exercises: [ExerciseDetail], index: Int, exercise: ExerciseDetail?) -> some View {
        let showsFinish = exercise.map { (try? LoggerRules.headerShowsFinish(barInput(exercises: exercises, index: index, exercise: $0))) ?? true } ?? true
        let position = exercises.isEmpty ? "0/0" : "\(index + 1)/\(exercises.count)"
        return HStack(spacing: 8) {
            Button { showingPlan = true } label: {
                ViewThatFits(in: .horizontal) {
                    Label("PLAN \(position)", systemImage: "checklist")
                    Label(position, systemImage: "checklist")
                }
                .font(.ripit(.subheadline, .bold)).display(1.2)
                .lineLimit(1)
                .padding(.horizontal, 10)
                .frame(minHeight: Theme.touch)
                .overlay(Rectangle().strokeBorder(Theme.edge(Theme.secondaryActive), lineWidth: 2))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(exercises.isEmpty ? "Plan, no exercises" : "Plan, exercise \(index + 1) of \(exercises.count)")
            .layoutPriority(1)
            Spacer(minLength: 4)
            if let w = store.current { WorkoutClock(startedAt: w.startedAt, color: Theme.secondaryForeground).lineLimit(1) }
            Spacer(minLength: 4)
            if showsFinish {
                Button { finish() } label: {
                    Text("FINISH").font(.ripit(.subheadline, .bold)).display(1.5).lineLimit(1)
                        .padding(.horizontal, 12)
                        .frame(minHeight: Theme.touch)
                        .background(Theme.success)
                        .foregroundStyle(Theme.successForeground)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Finish workout")
            }
            Button { exit() } label: {
                Image(systemName: "xmark").font(.system(size: 18, weight: .semibold))
                    .frame(width: Theme.touch, height: Theme.touch)
                    .overlay(Rectangle().strokeBorder(Theme.edge(Theme.secondaryActive), lineWidth: 2))
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Exit workout")
        }
        .foregroundStyle(Theme.secondaryForeground)
        // Capped so the row keeps one line at the largest sizes; the Plan label drops its word first.
        .dynamicTypeSize(...DynamicTypeSize.xxLarge)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Theme.secondary.ignoresSafeArea(edges: .top))
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.edge(Theme.secondaryActive)).frame(height: 2) }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "dumbbell").font(.system(size: 40)).foregroundStyle(Theme.mutedForeground)
            Text("Add an exercise to start logging sets.")
                .font(.ripit(.headline))
                .foregroundStyle(Theme.mutedForeground)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(24)
    }

    // MARK: - The bar

    private func barInput(exercises: [ExerciseDetail], index: Int, exercise: ExerciseDetail?) -> LoggerBarInput {
        let planned = exercise.map { store.plannedSets($0).filter { !$0.isWarmup }.count } ?? 0
        let logged = exercise.map { $0.sets.filter { !$0.isWarmup }.count } ?? 0
        return LoggerBarInput(isProgram: store.session != nil, exerciseCount: exercises.count, index: index,
                              plannedWorkingSets: planned, loggedWorkingSets: logged,
                              extraSets: exercise.map { extraSets.contains($0.id) } ?? false,
                              keypadOpen: pad != nil, canLog: exercise.map(canLog) ?? false)
    }

    private func bar(exercises: [ExerciseDetail], index: Int, exercise: ExerciseDetail?) -> LoggerBarView? {
        guard let bar = try? LoggerRules.bar(barInput(exercises: exercises, index: index, exercise: exercise)) else { return nil }
        let form = exercise.flatMap { forms[$0.id] }
        let editing = form?.editingSet != nil
        let detail = form.flatMap { f in exercise.flatMap { try? LoggerRules.pendingSetDetail(reps: f.reps, weight: f.weight, unit: unit($0)) } }
        return LoggerBarView(
            bar: bar, editing: editing, canLog: exercise.map(canLog) ?? false, detail: detail,
            previous: { go(to: (try? LoggerNav.previous(from: index, count: exercises.count)) ?? nil, exercises) },
            next: { go(to: (try? LoggerNav.next(from: index, count: exercises.count)) ?? nil, exercises) },
            log: { if let exercise { log(exercise) } },
            extraSet: { if let exercise { extraSets.insert(exercise.id) } },
            finish: finish,
            add: { picker = .add })
    }

    private func go(to index: Int?, _ exercises: [ExerciseDetail]) {
        guard let index, exercises.indices.contains(index) else { return }
        currentId = exercises[index].id
    }

    // MARK: - Swipe

    /// Judged on release only, like the web's touchstart/touchend: nothing follows the finger.
    private func swiped(dx: Double, dy: Double, keypadOpen: Bool, exercises: [ExerciseDetail], index: Int) {
        let result = (try? LoggerRules.swipe(dx: dx, dy: dy, keypadOpen: keypadOpen)) ?? SwipeResult.none
        let target: Int? = switch result {
        case .next: (try? LoggerNav.next(from: index, count: exercises.count)) ?? nil
        case .previous: (try? LoggerNav.previous(from: index, count: exercises.count)) ?? nil
        case .none: nil
        }
        guard let target else { return }
        if reducedMotion {
            go(to: target, exercises)
            return
        }
        withAnimation(.easeOut(duration: 0.15)) { nudge = result == .next ? -16 : 16 } completion: {
            go(to: target, exercises)
            nudge = 0
        }
    }

    private var reducedMotion: Bool {
        (try? DisplayRules.reducedMotion(einkDisplay: settings.settings.einkDisplay, osReduceMotion: osReduceMotion)) ?? false
    }

    // MARK: - The form

    private func formBinding(_ exercise: ExerciseDetail) -> Binding<EntryForm> {
        Binding(get: { forms[exercise.id] ?? prefill(exercise) }, set: { forms[exercise.id] = $0 })
    }

    private func unit(_ exercise: ExerciseDetail) -> String {
        forms[exercise.id]?.unit
            ?? (try? LoggerRules.newSetUnit(previousSetUnit: exercise.sets.last.flatMap { WeightUnit(rawValue: $0.weightUnit) },
                                            settings.settings).rawValue)
            ?? WeightUnit.lbs.rawValue
    }

    private var effortKind: EffortKind { settings.settings.defaultIntensityRating }

    private func canLog(_ exercise: ExerciseDetail) -> Bool {
        let f = forms[exercise.id] ?? prefill(exercise)
        guard let reps = Int(f.reps), reps > 0, let w = f.weight.isEmpty ? 0 : Double(f.weight), LoggedWeight.isValid(w) else {
            return false
        }
        return (try? LoggerRules.canLog(reps: f.reps, weight: f.weight, isProgram: store.session != nil)) ?? false
    }

    /// The first form for an exercise: a program exercise prefills like the web (this session, then last
    /// time, then the plan); another from its last set, else its plan's next set.
    private func prefill(_ exercise: ExerciseDetail) -> EntryForm {
        let next = store.plannedSets(exercise).first { $0.setNumber > exercise.sets.count }
        var f = EntryForm(warmup: next?.isWarmup ?? false)
        if let p = store.prefill(exerciseId: exercise.id, setNumber: exercise.sets.count + 1) {
            f.weight = p.weight == "0" ? "" : p.weight
            f.reps = p.reps
            f.unit = p.weightUnit
            f.effort = Int(effortKind == .rpe ? p.rpe : p.rir)
            return f
        }
        // A planned "3-5" leaves reps to the person.
        let plannedReps = next.flatMap { Int($0.reps) }
        if let plannedReps { f.reps = "\(plannedReps)" }
        if let last = exercise.sets.last {
            f.weight = last.weight == 0 ? "" : last.weight.formatted(.number.precision(.fractionLength(0...2)).grouping(.never))
            f.reps = plannedReps.map { "\($0)" } ?? "\(last.reps)"
            f.unit = last.weightUnit
        }
        return f
    }

    /// Log set (or Save set while changing one): a light haptic, stay on the exercise, keep the weight, and
    /// take reps and effort from the next planned set (LoggerRules.formAfterLog).
    private func log(_ exercise: ExerciseDetail) {
        var f = forms[exercise.id] ?? prefill(exercise)
        guard canLog(exercise), let reps = Int(f.reps), let weight = f.weight.isEmpty ? 0 : Double(f.weight) else { return }
        let unit = unit(exercise)
        if let id = f.editingSet {
            store.updateSet(id, reps: reps, weight: weight, unit: unit)
            if exercise.sets.first(where: { $0.id == id })?.isWarmup != f.warmup { store.setWarmup(id, f.warmup) }
            forms[exercise.id] = (store.current?.exercises.first { $0.id == exercise.id }).map(prefill)
            return
        }
        let tracking = (try? LoggerRules.effortPicker(settings.settings)) != nil
        // A warm-up saves no effort.
        let effort = f.warmup || !tracking ? nil : f.effort
        store.logSet(exerciseId: exercise.id, reps: reps, weight: weight, unit: unit,
                     rpe: effortKind == .rpe ? effort : nil, rir: effortKind == .rir ? effort : nil, isWarmup: f.warmup)
        logged += 1
        let sets = store.current?.exercises.first { $0.id == exercise.id }?.sets ?? exercise.sets
        let planned = store.plannedSets(exercise)
        let form = SetForm(reps: f.reps, weight: f.weight, unit: unit,
                           rpe: effortKind == .rpe ? f.effort.map(String.init) ?? "" : "",
                           rir: effortKind == .rir ? f.effort.map(String.init) ?? "" : "")
        if let after = try? LoggerRules.formAfterLog(form, planned: planned, loggedWorkingSets: sets.filter { !$0.isWarmup }.count) {
            f.reps = after.reps
            if tracking { f.effort = Int(effortKind == .rpe ? after.rpe : after.rir) }
        }
        f.unit = unit
        f.warmup = planned.first { $0.setNumber > sets.count }?.isWarmup ?? false
        forms[exercise.id] = f
    }

    // MARK: - Plan edits

    private func openPicker(_ target: PickerTarget) {
        pendingPicker = target
        showingPlan = false
    }

    @ViewBuilder private func pickerSheet(_ target: PickerTarget) -> some View {
        NavigationStack {
            switch target {
            case .add:
                ExercisePickerView(query: DebugHooks.pickerQuery ?? "", onAdd: { ids in
                    let before = store.current?.exercises.count ?? 0
                    let current = store.current?.exercises.firstIndex { $0.id == currentId } ?? 0
                    store.addExercises(ids)
                    let exercises = store.current?.exercises ?? []
                    if let i = try? LoggerNav.indexAfterAdd(countBefore: before, added: exercises.count - before, current: current) {
                        go(to: i, exercises)
                    }
                    picker = nil
                })
            case .swap(let exercise):
                ExercisePickerView(onPick: { definitionId in
                    let wasCurrent = exercise.id == currentId
                    if let id = store.swapExercise(exercise.id, to: definitionId), wasCurrent {
                        currentId = id
                        forms[exercise.id] = nil
                    }
                    picker = nil
                })
            }
        }
        .environment(store)
    }

    /// Deleting the current exercise lands on the one before it; deleting another keeps the current one.
    private func delete(_ exercise: ExerciseDetail) {
        let ids = store.current?.exercises.map(\.id) ?? []
        let landing = currentId.flatMap { try? LoggerNav.indexAfterDelete(ids, deleting: exercise.id, current: $0) }
        store.deleteExercise(exercise.id)
        forms[exercise.id] = nil
        extraSets.remove(exercise.id)
        let remaining = store.current?.exercises ?? []
        currentId = landing.flatMap { remaining.indices.contains($0) ? remaining[$0].id : nil } ?? remaining.first?.id
    }

    // MARK: - Finish and exit

    /// An empty workout doesn't go into history: log a set first, or discard it. Otherwise ask first.
    private func finish() {
        guard let w = store.current else { return }
        if w.exercises.allSatisfy({ $0.sets.isEmpty }) {
            finishBlocked = true
        } else {
            confirmingFinish = true
        }
    }

    /// With nothing logged the workout is deleted and the logger closes; otherwise Discard or keep as a draft.
    private func exit() {
        if !store.exitWorkout() { confirmingExit = true }
    }

    private func applyDebugHooks() {
        if DebugHooks.pickerQuery != nil { picker = .add }
        if DebugHooks.flag("demoDiscard") { confirmingExit = true }
        if DebugHooks.flag("demoFinish") { finish() }
        if DebugHooks.flag("demoFinishNow") { store.finishWorkout() }
        if DebugHooks.flag("demoRemove") { showingPlan = true }
        if let tab = DebugHooks.string("demoHelp").flatMap({ LoggerTab(rawValue: $0.capitalized) }) { self.tab = tab }
        if DebugHooks.flag("demoFocusWeight"), let first = store.current?.exercises.first {
            pad = .weight(NumberKeypad(opening: formBinding(first).wrappedValue.weight, decimal: true))
        }
        if DebugHooks.flag("demoUseLastTime"), let first = store.current?.exercises.first,
           let fill = store.lastTime(definitionId: first.definitionId)?.fill {
            var f = prefill(first)
            f.weight = fill.weight == "0" ? "" : fill.weight
            f.reps = fill.reps
            if let u = fill.weightUnit { f.unit = u }
            forms[first.id] = f
        }
    }
}

// MARK: - The bar's look

/// ‹ · LOG SET "8 reps × 135 lbs" · ›, or + EXTRA SET · NEXT EXERCISE, or ADD EXERCISE (LoggerBottomBar.tsx).
/// Disabled buttons keep their outline and fade their label.
struct LoggerBarView: View {
    let bar: LoggerBar
    /// A logged set is being changed: the main button saves it.
    let editing: Bool
    let canLog: Bool
    let detail: String?
    let previous: () -> Void
    let next: () -> Void
    let log: () -> Void
    let extraSet: () -> Void
    let finish: () -> Void
    let add: () -> Void
    @ScaledMetric(relativeTo: .title3) private var side: CGFloat = 56

    var body: some View {
        HStack(spacing: 8) {
            if let previous = bar.previous {
                chevron("chevron.left", enabled: previous, label: "Previous exercise", action: self.previous)
            }
            if editing {
                logButton
            } else {
                if bar.extraSet {
                    Button(action: extraSet) {
                        Label("Extra set", systemImage: "plus").labelStyle(.titleAndIcon)
                    }
                    .buttonStyle(OutlineButtonStyle())
                    .frame(minHeight: side)
                }
                switch bar.main {
                case .logSet: logButton
                case .nextExercise: filled("Next exercise", action: next)
                case .finish: filled("Finish", action: finish)
                case .addExercise:
                    Button(action: add) { Label("Add exercise", systemImage: "plus") }
                        .buttonStyle(FilledButtonStyle(fill: Theme.accent, foreground: Theme.accentForeground, shadow: nil))
                }
            }
            switch bar.next {
            case .chevron(let enabled): chevron("chevron.right", enabled: enabled, label: "Next exercise", action: next)
            case .nextExercise: labelled("Next", action: next)
            case .finish: labelled("Finish", action: finish)
            case nil: EmptyView()
            }
        }
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        // Capped like the header, so the bar keeps one row and "+ Extra set · Next exercise" fit whole.
        .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    }

    private var logButton: some View {
        let enabled = editing ? canLog : { if case .logSet(let on) = bar.main { on } else { false } }()
        return Button(action: log) {
            // Centred with or without the second line; the button's minimum height keeps the bar's.
            VStack(spacing: 2) {
                Text(editing ? "SAVE SET" : "LOG SET").font(.ripit(.headline, .bold)).display(1.5)
                if let detail { Text(detail).font(.ripit(.caption).monospacedDigit()) }
            }
            .accessibilityElement(children: .ignore)
            .frame(maxWidth: .infinity, minHeight: side)
            .foregroundStyle(Theme.accentForeground.opacity(enabled ? 1 : 0.45))
            .background(enabled ? Theme.accent : Theme.accent.opacity(0.35))
            .overlay(Rectangle().strokeBorder(Look.isPaper ? Theme.border : .clear, lineWidth: 2))
            .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle())
        .disabled(!enabled)
        .accessibilityLabel(editing ? "Save set" : "Log set")
        .accessibilityValue(detail ?? "")
    }

    /// Finish stays green; Next exercise is a confirm and takes the accent (Dustin 2026-11-11).
    private func filled(_ title: String, action: @escaping () -> Void) -> some View {
        let finish = title == "Finish"
        return Button(action: action) {
            Text(title.uppercased()).font(.ripit(.headline, .bold)).display(1.5)
                .frame(maxWidth: .infinity, minHeight: side)
                .background(finish ? Theme.success : Theme.accent)
                .foregroundStyle(finish ? Theme.successForeground : Theme.accentForeground)
                .overlay(Rectangle().strokeBorder(Look.isPaper ? Theme.border : .clear, lineWidth: 2))
                .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle())
        .accessibilityLabel(finish ? "Finish workout" : title)
    }

    private func labelled(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title.uppercased()).font(.ripit(.subheadline, .bold)).display(1.2)
                .padding(.horizontal, 12)
                .frame(minWidth: side, minHeight: side)
                .background(Theme.card)
                .foregroundStyle(Theme.foreground)
                .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: 2))
                .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle())
        .accessibilityLabel(title == "Next" ? "Next exercise" : "Finish workout")
    }

    private func chevron(_ symbol: String, enabled: Bool, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 20, weight: .bold))
                // A fixed width at every text size, so Log set keeps the room.
                .frame(width: 56, height: side)
                .background(Theme.card)
                .foregroundStyle(Theme.foreground.opacity(enabled ? 1 : 0.3))
                .overlay(Rectangle().strokeBorder(Theme.border, lineWidth: 2))
                .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle())
        .disabled(!enabled)
        .accessibilityLabel(label)
    }
}

private struct PressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.opacity(configuration.isPressed ? 0.8 : 1)
    }
}

/// The swipe, read beside the panel's scrolling and buttons without blocking them: a pan on the window that
/// counts only drags starting inside the panel while nothing is presented over the logger. SwiftUI's own
/// drag gesture never fires here, because the panel's scroll view takes the touch first.
private struct SwipeCatcher: UIViewRepresentable {
    let ended: (Double, Double) -> Void

    func makeUIView(context: Context) -> CatcherView {
        let view = CatcherView()
        view.isUserInteractionEnabled = false
        view.ended = ended
        return view
    }

    func updateUIView(_ view: CatcherView, context: Context) { view.ended = ended }

    final class CatcherView: UIView, UIGestureRecognizerDelegate {
        var ended: ((Double, Double) -> Void)?
        private lazy var pan: UIPanGestureRecognizer = {
            let pan = UIPanGestureRecognizer(target: self, action: #selector(panned))
            pan.cancelsTouchesInView = false
            pan.delaysTouchesBegan = false
            pan.delegate = self
            return pan
        }()

        override func didMoveToWindow() {
            super.didMoveToWindow()
            pan.view?.removeGestureRecognizer(pan)
            window?.addGestureRecognizer(pan)
        }

        override func gestureRecognizerShouldBegin(_ g: UIGestureRecognizer) -> Bool {
            guard bounds.contains(g.location(in: self)) else { return false }
            // The logger is itself presented; a sheet over it (plan, picker, dialogs) is one more.
            return window?.rootViewController?.presentedViewController?.presentedViewController == nil
        }

        func gestureRecognizer(_ g: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }

        @objc private func panned(_ g: UIPanGestureRecognizer) {
            guard g.state == .ended else { return }
            let t = g.translation(in: self)
            ended?(t.x, t.y)
        }
    }
}
