'use client'

import { useState } from 'react'
import {
  BIOLOGICAL_SEXES,
  type BiologicalSex,
} from '@/lib/user-training-profile'
import { BIOLOGICAL_SEX_LABELS } from '../constants'
import { NumberField, PillToggle, SectionLabel } from '../shared'
import type { WizardAnswers } from '../types'

const CM_PER_INCH = 2.54
const KG_PER_LB = 0.45359237

function cmToFtIn(cm: number | null): { ft: string; in: string } {
  if (cm == null) return { ft: '', in: '' }
  const totalInches = cm / CM_PER_INCH
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches - ft * 12)
  return { ft: String(ft), in: String(inches) }
}

function kgToLbs(kg: number | null): string {
  if (kg == null) return ''
  return String(Math.round(kg / KG_PER_LB))
}

export function DemographicsStep({
  answers,
  patchLocal,
}: {
  answers: WizardAnswers
  patchLocal: (partial: Partial<WizardAnswers>) => void
}) {
  // Imperial display state seeded once from the (metric) answers.
  const initialHeight = cmToFtIn(answers.heightCm)
  const [feet, setFeet] = useState(initialHeight.ft)
  const [inches, setInches] = useState(initialHeight.in)
  const [pounds, setPounds] = useState(kgToLbs(answers.weightKg))
  const [year, setYear] = useState(
    answers.birthYear != null ? String(answers.birthYear) : ''
  )

  const commitHeight = (ftStr: string, inStr: string) => {
    const ft = parseFloat(ftStr)
    const inch = parseFloat(inStr)
    if (Number.isNaN(ft) && Number.isNaN(inch)) {
      patchLocal({ heightCm: null })
      return
    }
    const totalInches = (Number.isNaN(ft) ? 0 : ft) * 12 + (Number.isNaN(inch) ? 0 : inch)
    patchLocal({ heightCm: Math.round(totalInches * CM_PER_INCH * 10) / 10 })
  }

  const commitWeight = (lbStr: string) => {
    const lbs = parseFloat(lbStr)
    if (Number.isNaN(lbs)) {
      patchLocal({ weightKg: null })
      return
    }
    patchLocal({ weightKg: Math.round(lbs * KG_PER_LB * 10) / 10 })
  }

  const commitYear = (yearStr: string) => {
    const y = parseInt(yearStr, 10)
    patchLocal({ birthYear: Number.isNaN(y) ? null : y })
  }

  const setSex = (sex: BiologicalSex) => {
    patchLocal({ biologicalSex: answers.biologicalSex === sex ? null : sex })
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <NumberField
          id="birth-year"
          label="Birth year"
          value={year}
          placeholder="e.g. 1990"
          min={1900}
          max={new Date().getFullYear()}
          onChange={(v) => {
            setYear(v)
            commitYear(v)
          }}
        />
      </div>

      <div>
        <SectionLabel>Sex</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {BIOLOGICAL_SEXES.map((sex) => (
            <PillToggle
              key={sex}
              label={BIOLOGICAL_SEX_LABELS[sex]}
              isSelected={answers.biologicalSex === sex}
              onClick={() => setSex(sex)}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Height</SectionLabel>
        <div className="flex gap-3">
          <div className="flex-1">
            <NumberField
              id="height-ft"
              label="Feet"
              value={feet}
              placeholder="5"
              unit="ft"
              min={1}
              max={8}
              onChange={(v) => {
                setFeet(v)
                commitHeight(v, inches)
              }}
            />
          </div>
          <div className="flex-1">
            <NumberField
              id="height-in"
              label="Inches"
              value={inches}
              placeholder="10"
              unit="in"
              min={0}
              max={11}
              onChange={(v) => {
                setInches(v)
                commitHeight(feet, v)
              }}
            />
          </div>
        </div>
      </div>

      <div>
        <NumberField
          id="weight-lbs"
          label="Weight"
          value={pounds}
          placeholder="e.g. 165"
          unit="lbs"
          inputMode="decimal"
          min={20}
          max={1100}
          onChange={(v) => {
            setPounds(v)
            commitWeight(v)
          }}
        />
      </div>
    </div>
  )
}
