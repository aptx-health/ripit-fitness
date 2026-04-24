'use client'

import Image from 'next/image'
import { useState } from 'react'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import { FAU_DISPLAY_NAMES } from '@/lib/fau-volume'

interface ExerciseInfoPreviewProps {
  imageUrls: string[]
  instructions: string
  primaryFAUs: string[]
  secondaryFAUs: string[]
  equipment: string[]
}

/**
 * Preview component that mirrors the Info tab rendering from ExerciseDisplayTabs.
 * Used in the admin exercise editor to preview how exercise info will appear
 * in the workout logger.
 */
export default function ExerciseInfoPreview({
  imageUrls,
  instructions,
  primaryFAUs,
  secondaryFAUs,
  equipment,
}: ExerciseInfoPreviewProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const hasContent =
    imageUrls.length > 0 ||
    instructions.trim() ||
    primaryFAUs.length > 0 ||
    secondaryFAUs.length > 0 ||
    equipment.length > 0

  return (
    <div className="border-2 border-border rounded bg-background p-4">
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Info Tab Preview
      </h4>

      {!hasContent && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No info available for this exercise</p>
        </div>
      )}

      <div className="space-y-6">
        {imageUrls.length > 0 && (
          <div>
            <div className="grid grid-cols-2 gap-3">
              {imageUrls.map((url, i) => {
                const src = url.startsWith('http') ? url : `https://cdn.ripit.fit/exercise-images/${url}`
                return (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setExpandedImage(src)}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                  >
                    <Image
                      src={src}
                      alt={`Exercise image ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {instructions.trim() && (
          <div>
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
              INSTRUCTIONS
            </h4>
            <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">
              {instructions}
            </p>
          </div>
        )}

        {primaryFAUs.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
              PRIMARY MUSCLES
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {primaryFAUs.map((fau) => (
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

        {secondaryFAUs.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
              SECONDARY MUSCLES
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {secondaryFAUs.map((fau) => (
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

        {equipment.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
              EQUIPMENT
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {equipment.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 text-sm font-bold uppercase tracking-wider border border-border text-muted-foreground bg-card"
                >
                  {EQUIPMENT_LABELS[item] || item.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen image viewer */}
      {expandedImage && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200 }}
          className="bg-black/90 flex items-center justify-center"
        >
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            className="absolute inset-0 w-full h-full"
            aria-label="Close image"
          />
          <div className="relative w-[90vw] h-[90vh]">
            <Image
              src={expandedImage}
              alt="Exercise image expanded"
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
        </div>
      )}
    </div>
  )
}
