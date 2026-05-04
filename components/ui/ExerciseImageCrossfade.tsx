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
}

const POSITION_LABELS = ['START', 'FINISH'] as const

function resolveUrl(url: string): string {
  return url.startsWith('http') ? url : `https://cdn.ripit.fit/exercise-images/${url}`
}

function ImageLoadingSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted animate-pulse z-10">
      <svg
        aria-hidden="true"
        className="w-10 h-10 text-muted-foreground/40 mb-2"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
        />
      </svg>
      <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">
        Loading
      </span>
    </div>
  )
}

export default function ExerciseImageCrossfade({
  imageUrls,
  exerciseName,
  holdDuration = 1200,
  fadeDuration = 300,
}: ExerciseImageCrossfadeProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
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

  const handleImageLoad = useCallback((url: string) => {
    setLoadedImages(prev => {
      if (prev.has(url)) return prev
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }, [])

  // Cycle between images — activeIndex is an intentional trigger to restart the timer after each transition
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeIndex triggers timer restart for cycling animation
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
      </div>
    )
  }

  // Single image — no animation, no labels
  if (resolved.length === 1) {
    return (
      <div className="border-2 border-border">
        <div className="relative aspect-[4/3] bg-muted">
          {!loadedImages.has(resolved[0]) && <ImageLoadingSkeleton />}
          <Image
            src={resolved[0]}
            alt={`${exerciseName} demonstration`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 600px"
            onLoad={() => handleImageLoad(resolved[0])}
          />
        </div>
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
              {!loadedImages.has(src) && <ImageLoadingSkeleton />}
              <Image
                src={src}
                alt={`${exerciseName} - ${POSITION_LABELS[i].toLowerCase()} position`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 600px"
                onLoad={() => handleImageLoad(src)}
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
        {resolved.every(src => !loadedImages.has(src)) && <ImageLoadingSkeleton />}
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
            onLoad={() => handleImageLoad(src)}
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
      <div className="border-t border-border px-3 py-1.5 bg-card flex items-center justify-end">
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
