'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

interface ExerciseImageCrossfadeProps {
  /** Image URLs in order: [start, finish]. Supports 0, 1, or 2 images. */
  imageUrls: string[]
  exerciseName: string
  /** Duration each position is held in ms. Default 1200. */
  holdDuration?: number
  /** Crossfade transition duration in ms. Default 300. */
  fadeDuration?: number
  /** Optional label override. Default uses "Exercise demonstration" */
  label?: string
}

const POSITION_LABELS = ['START', 'FINISH'] as const

function resolveUrl(url: string): string {
  return url.startsWith('http') ? url : `https://cdn.ripit.fit/exercise-images/${url}`
}

export default function ExerciseImageCrossfade({
  imageUrls,
  exerciseName,
  holdDuration = 1200,
  fadeDuration = 300,
  label,
}: ExerciseImageCrossfadeProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolved = imageUrls.map(resolveUrl)
  const hasAnimation = resolved.length === 2 && !prefersReducedMotion

  // Cycle between images
  useEffect(() => {
    if (!hasAnimation || paused) return
    timerRef.current = setTimeout(() => {
      setActiveIndex(prev => (prev === 0 ? 1 : 0))
    }, holdDuration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [activeIndex, paused, hasAnimation, holdDuration])

  const togglePause = useCallback(() => {
    if (!hasAnimation) return
    setPaused(p => !p)
  }, [hasAnimation])

  // No images
  if (resolved.length === 0) {
    return (
      <div className="border-2 border-border bg-muted/20">
        <div className="aspect-[4/3] flex items-center justify-center">
          <p className="text-sm text-muted-foreground uppercase tracking-wider">
            More images to come
          </p>
        </div>
        {label && (
          <div className="border-t border-border px-3 py-1.5 bg-card">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
        )}
      </div>
    )
  }

  // Single image — no animation, no labels
  if (resolved.length === 1) {
    return (
      <div className="border-2 border-border">
        <div className="relative aspect-[4/3] bg-muted">
          <Image
            src={resolved[0]}
            alt={`${exerciseName} demonstration`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 600px"
          />
        </div>
        {label && (
          <div className="border-t border-border px-3 py-1.5 bg-card">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
        )}
      </div>
    )
  }

  // Reduced motion — stacked layout with labels
  if (prefersReducedMotion) {
    return (
      <div className="space-y-2">
        {resolved.map((src, i) => (
          <div key={src} className="border-2 border-border">
            <div className="relative aspect-[4/3] bg-muted">
              <Image
                src={src}
                alt={`${exerciseName} - ${POSITION_LABELS[i].toLowerCase()} position`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 600px"
              />
            </div>
            <div className="border-t border-border px-3 py-1.5 bg-card">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">
                {POSITION_LABELS[i]}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Two images — crossfade animation
  return (
    <div className="border-2 border-border">
      <button
        type="button"
        onClick={togglePause}
        className="relative aspect-[4/3] w-full bg-muted cursor-pointer block"
        aria-label={paused ? 'Resume animation' : 'Pause animation'}
      >
        {resolved.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`${exerciseName} - ${POSITION_LABELS[i].toLowerCase()} position`}
            fill
            className="object-cover"
            style={{
              opacity: activeIndex === i ? 1 : 0,
              transition: `opacity ${fadeDuration}ms ease-in-out`,
            }}
            sizes="(max-width: 640px) 100vw, 600px"
          />
        ))}

        {/* Position label pill */}
        <span className="absolute bottom-3 left-3 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary bg-background/80 border border-primary">
          {POSITION_LABELS[activeIndex]}
        </span>

        {/* Pause indicator */}
        {paused && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-14 h-14 flex items-center justify-center bg-background/70 border-2 border-border">
              <svg aria-hidden="true" className="w-6 h-6 text-foreground ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        )}
      </button>
      <div className="border-t border-border px-3 py-1.5 bg-card flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {label || 'Exercise demonstration'}
        </p>
        {/* Dot indicators for current position */}
        <div className="flex gap-1.5">
          {POSITION_LABELS.map((pos, i) => (
            <span
              key={pos}
              className={`w-2 h-2 transition-colors ${
                activeIndex === i ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
