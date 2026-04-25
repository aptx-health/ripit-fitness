'use client'

import Image from 'next/image'
import { useState } from 'react'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'

interface ExerciseDefinition {
  primaryFAUs: string[]
  secondaryFAUs: string[]
  equipment: string[]
  instructions?: string
  imageUrls?: string[]
}

interface ExerciseInfoContentProps {
  exerciseName: string
  exerciseDefinition?: ExerciseDefinition
}

const FAU_DISPLAY_NAMES: Record<string, string> = {
  chest: 'Chest',
  'mid-back': 'Mid Back',
  'lower-back': 'Lower Back',
  'front-delts': 'Front Delts',
  'side-delts': 'Side Delts',
  'rear-delts': 'Rear Delts',
  lats: 'Lats',
  traps: 'Traps',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  adductors: 'Adductors',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  obliques: 'Obliques',
}

export default function ExerciseInfoContent({ exerciseName, exerciseDefinition }: ExerciseInfoContentProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const hasImages = exerciseDefinition?.imageUrls && exerciseDefinition.imageUrls.length > 0
  const hasInstructions = !!exerciseDefinition?.instructions
  const hasPrimaryFAUs = exerciseDefinition?.primaryFAUs && exerciseDefinition.primaryFAUs.length > 0
  const hasSecondaryFAUs = exerciseDefinition?.secondaryFAUs && exerciseDefinition.secondaryFAUs.length > 0
  const hasEquipment = exerciseDefinition?.equipment && exerciseDefinition.equipment.length > 0
  const hasAnyInfo = hasImages || hasInstructions || hasPrimaryFAUs || hasSecondaryFAUs || hasEquipment

  return (
    <>
      <div className="space-y-6">
        {hasImages ? (
          <div>
            <div className="grid grid-cols-2 gap-3">
              {exerciseDefinition!.imageUrls!.map((url, i) => {
                const src = url.startsWith('http') ? url : `https://cdn.ripit.fit/exercise-images/${url}`
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setExpandedImage(src)}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                  >
                    <Image
                      src={src}
                      alt={`${exerciseName} - ${i === 0 ? 'start' : 'end'} position`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 45vw, 300px"
                    />
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 border border-dashed border-border/40 bg-muted/20">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">
              More images to come
            </p>
          </div>
        )}

        {hasInstructions && (
          <div>
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">INSTRUCTIONS</h4>
            <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">
              {exerciseDefinition!.instructions}
            </p>
          </div>
        )}

        {hasPrimaryFAUs && (
          <div>
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">PRIMARY MUSCLES</h4>
            <div className="flex flex-wrap gap-1.5">
              {exerciseDefinition!.primaryFAUs.map((fau) => (
                <span
                  key={fau}
                  className="px-2.5 py-1 text-sm font-bold uppercase tracking-wider border-2 border-primary text-primary bg-primary/10"
                >
                  {FAU_DISPLAY_NAMES[fau] || fau}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasSecondaryFAUs && (
          <div>
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">SECONDARY MUSCLES</h4>
            <div className="flex flex-wrap gap-1.5">
              {exerciseDefinition!.secondaryFAUs.map((fau) => (
                <span
                  key={fau}
                  className="px-2.5 py-1 text-sm font-bold uppercase tracking-wider border border-border text-foreground bg-muted/50"
                >
                  {FAU_DISPLAY_NAMES[fau] || fau}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasEquipment && (
          <div>
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">EQUIPMENT</h4>
            <div className="flex flex-wrap gap-1.5">
              {exerciseDefinition!.equipment.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 text-sm font-bold uppercase tracking-wider border border-border text-muted-foreground bg-card"
                >
                  {EQUIPMENT_LABELS[item] || item.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        {!hasAnyInfo && (
          <div className="flex items-center justify-center h-full py-12">
            <p className="text-base sm:text-lg text-muted-foreground">No info available for this exercise</p>
          </div>
        )}
      </div>

      {expandedImage && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          onClick={() => setExpandedImage(null)}
          onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setExpandedImage(null) }}
        >
          <div className="relative w-[90vw] max-w-lg aspect-square">
            <Image
              src={expandedImage}
              alt={exerciseName}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
        </div>
      )}
    </>
  )
}
