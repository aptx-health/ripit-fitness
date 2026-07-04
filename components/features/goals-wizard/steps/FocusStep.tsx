'use client'

import { FauImportanceEditor } from '../../training-focus/FauImportanceEditor'
import type { WizardAnswers } from '../types'

export function FocusStep({
  answers,
  patchLocal,
}: {
  answers: WizardAnswers
  patchLocal: (partial: Partial<WizardAnswers>) => void
}) {
  return (
    <FauImportanceEditor
      value={{
        fauImportance: answers.fauImportance,
        fauImportancePreset: answers.fauImportancePreset,
      }}
      onChange={(next) => patchLocal(next)}
    />
  )
}
