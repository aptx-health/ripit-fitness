/**
 * Golden file for the iOS slice 9b tests (work item 203, features/ios-app/one-exercise-logger.feature).
 *
 * Records what the web's own code does, for the rules that can be run on their own:
 *   components/workout-logging/inputs/NumberKeypad.tsx   the weight and reps keypad (rendered, keys clicked)
 *   components/workout-logging/inputs/RepsStepper.tsx    the reps − / + stepper (rendered, buttons clicked)
 *   hooks/useSwipeNavigation.ts                         the swipe classifier (touch start and end)
 *   components/workout-logging/LoggerBottomBar.tsx      pendingSetDetail, Log set's second line
 *   lib/workout-logging/plan-summary.ts                 planFormValues, the form after a set is logged;
 *                                                       AdHocLoggerView.tsx:115-120 (withPlan) applies it
 *                                                       to the form and keeps the weight and unit
 *   @dnd-kit/sortable arrayMove                         the plan list's reorder (WorkoutPlanEditor.tsx)
 *
 * Regenerate (from the repo root, Docker running for the shared test setup):
 *   npx vitest run --config scripts/ios/vitest.goldens.config.ts scripts/ios/logger.goldens.ts
 * It writes ios/RipitCore/Tests/Fixtures/logger/logger.json. Deterministic: run it twice and
 * `git diff` shows nothing. The Swift tests (Logger*Tests) are locked; unlock them if a golden
 * changes on purpose.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { arrayMove } from '@dnd-kit/sortable'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { createElement, useState } from 'react'
import { describe, it } from 'vitest'
import { NumberKeypad } from '@/components/workout-logging/inputs/NumberKeypad'
import { RepsStepper } from '@/components/workout-logging/inputs/RepsStepper'
import { pendingSetDetail } from '@/components/workout-logging/LoggerBottomBar'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import { type PlannedSet, planFormValues } from '@/lib/workout-logging/plan-summary'

const OUT = join(process.cwd(), 'ios/RipitCore/Tests/Fixtures/logger')

// ---- Keypad: start from a value, press keys, record the value after each key.

type Key = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'CLR' | 'DEL'

const KEYPAD_CASES: { label: string; start: string; keys: Key[] }[] = [
  { label: 'first digit replaces a prefilled value', start: '135', keys: ['2', '2', '5'] },
  { label: 'first digit on an empty value', start: '', keys: ['8'] },
  { label: 'first key 0 replaces with 0', start: '135', keys: ['0'] },
  { label: '0 then 0 stays 0', start: '', keys: ['0', '0', '0'] },
  { label: '0 then a digit replaces the 0', start: '', keys: ['0', '7', '5'] },
  { label: 'CLR empties, then digits append', start: '135', keys: ['CLR', '4', '5'] },
  { label: 'CLR on an empty value', start: '', keys: ['CLR', '1'] },
  { label: 'DEL first clears a prefilled value', start: '135', keys: ['DEL', '9'] },
  { label: 'DEL after typing removes the last digit', start: '135', keys: ['1', '8', '5', 'DEL', 'DEL'] },
  { label: 'DEL on empty stays empty', start: '', keys: ['5', 'DEL', 'DEL'] },
  { label: 'up to 999 is accepted', start: '', keys: ['9', '9', '9'] },
  { label: 'over 999 is refused, keeps the value', start: '', keys: ['9', '9', '9', '1'] },
  { label: '1000 is refused', start: '', keys: ['1', '0', '0', '0'] },
  { label: 'refused key, then DEL and a digit', start: '', keys: ['5', '0', '0', '0', 'DEL', '1'] },
  { label: 'CLR then 0 then digit', start: '45', keys: ['CLR', '0', '3'] },
]

function keypadRun(start: string, keys: Key[]): string[] {
  function Harness() {
    const [value, setValue] = useState(start)
    return createElement('div', null,
      createElement('output', { 'data-testid': 'value' }, value),
      createElement(NumberKeypad, { value, onChange: setValue, onCollapse: () => {}, onCancel: () => {}, label: 'WEIGHT (LBS)' }))
  }
  render(createElement(Harness))
  const values: string[] = []
  for (const key of keys) {
    const button = key === 'DEL'
      ? screen.getAllByRole('button').find((b) => b.querySelector('svg') && b.textContent === '')!
      : screen.getByRole('button', { name: key })
    act(() => { fireEvent.click(button) })
    values.push(screen.getByTestId('value').textContent ?? '')
  }
  cleanup()
  return values
}

// ---- Reps stepper: start from a value, press − or +, record the value and whether − is enabled.

const STEPPER_CASES: { label: string; start: string; presses: ('+' | '-')[] }[] = [
  { label: '+ from empty is 1', start: '', presses: ['+', '+'] },
  { label: '− from empty does nothing', start: '', presses: ['-'] },
  { label: '− from 1 empties', start: '1', presses: ['-', '+'] },
  { label: '− and + from 8', start: '8', presses: ['-', '-', '+', '+', '+'] },
  { label: '+ has no upper bound', start: '999', presses: ['+', '+'] },
  { label: '0 can only go up', start: '0', presses: ['-', '+'] },
]

function stepperRun(start: string, presses: ('+' | '-')[]) {
  function Harness() {
    const [value, setValue] = useState(start)
    return createElement('div', null,
      createElement('output', { 'data-testid': 'value' }, value),
      createElement(RepsStepper, { value, onChange: setValue }))
  }
  render(createElement(Harness))
  const minus = () => screen.getByRole('button', { name: 'Decrease reps' }) as HTMLButtonElement
  const steps: { value: string; canDecrement: boolean }[] = []
  const startCanDecrement = !minus().disabled
  for (const p of presses) {
    const button = p === '+' ? screen.getByRole('button', { name: 'Increase reps' }) : minus()
    act(() => { fireEvent.click(button) })
    steps.push({ value: screen.getByTestId('value').textContent ?? '', canDecrement: !minus().disabled })
  }
  cleanup()
  return { startCanDecrement, steps }
}

// ---- Swipe: dx and dy from touch start to end, with and without a keypad open.

const SWIPES: [number, number][] = [
  [-200, 0], [200, 0], [-50, 0], [50, 0], [-49, 0], [49, 0], [-40, 0], [0, 0],
  [-100, 75], [-100, 76], [100, -75], [100, -76], [-50, 37.5], [-50, 38], [0, 200], [-30, 300],
  [-60, -10], [120, 40],
]

function swipeRun(dx: number, dy: number, enabled: boolean): 'next' | 'previous' | 'none' {
  let result: 'next' | 'previous' | 'none' = 'none'
  const { result: hook, unmount } = renderHook(() =>
    useSwipeNavigation({ enabled, onSwipeLeft: () => { result = 'next' }, onSwipeRight: () => { result = 'previous' } }))
  const at = (x: number, y: number) => ({ clientX: x, clientY: y })
  act(() => {
    hook.current.onTouchStart({ touches: [at(200, 400)] } as unknown as React.TouchEvent)
    hook.current.onTouchEnd({ changedTouches: [at(200 + dx, 400 + dy)] } as unknown as React.TouchEvent)
  })
  unmount()
  return result
}

// ---- Log set's second line.

const DETAILS: { reps: string; weight: string; weightUnit: string }[] = [
  { reps: '8', weight: '135', weightUnit: 'lbs' },
  { reps: '1', weight: '60', weightUnit: 'kg' },
  { reps: '5', weight: '0', weightUnit: 'lbs' },
  { reps: '12', weight: '', weightUnit: 'lbs' },
  { reps: '', weight: '135', weightUnit: 'lbs' },
  { reps: '0', weight: '95', weightUnit: 'lbs' },
  { reps: '10', weight: '132.5', weightUnit: 'kg' },
]

// ---- The form after a set is logged: the next planned working set's reps and effort; weight and unit kept.

type Form = { reps: string; weight: string; weightUnit: string; rpe: string; rir: string }

const PLAN_A: PlannedSet[] = [
  { setNumber: 1, reps: '10', rpe: null, rir: null, isWarmup: true },
  { setNumber: 2, reps: '5', rpe: 7, rir: null },
  { setNumber: 3, reps: '8-12', rpe: 8, rir: null },
  { setNumber: 4, reps: '15+', rpe: null, rir: 2 },
  { setNumber: 5, reps: 'AMRAP', rpe: null, rir: null },
]
const PLAN_B: PlannedSet[] = [
  { setNumber: 2, reps: '6', rpe: null, rir: 1 },
  { setNumber: 1, reps: '6', rpe: null, rir: 3 },
]

const FORM: Form = { reps: '7', weight: '185', weightUnit: 'lbs', rpe: '9', rir: '4' }

const AFTER_LOG: { label: string; plan: string; prescribed: PlannedSet[]; loggedWorking: number; form: Form }[] = [
  { label: 'the second working set: a range takes its high end, with RPE', plan: 'A', prescribed: PLAN_A, loggedWorking: 1, form: FORM },
  { label: '"15+" and an RIR target', plan: 'A', prescribed: PLAN_A, loggedWorking: 2, form: FORM },
  { label: 'AMRAP: no reps, effort left alone', plan: 'A', prescribed: PLAN_A, loggedWorking: 3, form: FORM },
  { label: 'plan done: the form is kept', plan: 'A', prescribed: PLAN_A, loggedWorking: 4, form: FORM },
  { label: 'past the plan: the form is kept', plan: 'A', prescribed: PLAN_A, loggedWorking: 9, form: FORM },
  { label: 'warm-ups are not the plan: first working set', plan: 'A', prescribed: PLAN_A, loggedWorking: 0, form: FORM },
  { label: 'plan sorted by set number', plan: 'B', prescribed: PLAN_B, loggedWorking: 1, form: { ...FORM, weightUnit: 'kg' } },
  { label: 'no plan: the form is kept', plan: 'none', prescribed: [], loggedWorking: 1, form: FORM },
]

function afterLog(form: Form, prescribed: PlannedSet[], loggedWorking: number): Form {
  // AdHocLoggerView.tsx:115-120, withPlan: the plan's values over the form; the weight and unit stay.
  const values = planFormValues(prescribed, loggedWorking)
  return values ? { ...form, ...values } : form
}

// ---- Reorder.

const IDS = ['a', 'b', 'c', 'd', 'e']
const MOVES: [number, number][] = [[3, 0], [0, 4], [1, 2], [2, 1], [4, 0], [2, 2]]

describe('iOS logger golden', () => {
  it('writes logger.json', () => {
    const golden = {
      keypad: KEYPAD_CASES.map((c) => ({ ...c, values: keypadRun(c.start, c.keys) })),
      stepper: STEPPER_CASES.map((c) => ({ ...c, ...stepperRun(c.start, c.presses) })),
      swipe: SWIPES.flatMap(([dx, dy]) => [false, true].map((keypadOpen) => ({
        dx, dy, keypadOpen, result: swipeRun(dx, dy, !keypadOpen),
      }))),
      pendingSetDetail: DETAILS.map((d) => ({ ...d, detail: pendingSetDetail(d) ?? null })),
      afterLog: AFTER_LOG.map((c) => ({
        label: c.label, plan: c.plan, loggedWorking: c.loggedWorking, form: c.form,
        expected: afterLog(c.form, c.prescribed, c.loggedWorking),
      })),
      plans: {
        A: PLAN_A.map((s) => ({ ...s, isWarmup: s.isWarmup ?? false })),
        B: PLAN_B.map((s) => ({ ...s, isWarmup: s.isWarmup ?? false })),
        none: [],
      },
      move: MOVES.map(([from, to]) => ({ ids: IDS, from, to, result: arrayMove(IDS, from, to) })),
    }
    mkdirSync(OUT, { recursive: true })
    writeFileSync(join(OUT, 'logger.json'), `${JSON.stringify(golden, null, 2)}\n`)
  })
})
