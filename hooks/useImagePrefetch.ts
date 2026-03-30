'use client'

import { useEffect, useRef } from 'react'
import type { Exercise } from '@/hooks/useProgressiveExercises'

const CDN_BASE = 'https://cdn.ripit.fit/exercise-images/'
const MAX_CONCURRENT = 2

function resolveImageUrl(url: string): string {
  return url.startsWith('http') ? url : `${CDN_BASE}${url}`
}

/**
 * Pre-fetches exercise images in the background so they are cached
 * by the time the user navigates to an exercise's Info tab.
 *
 * - Waits until at least one exercise is loaded before starting
 * - Limits concurrent fetches to avoid saturating slow gym WiFi
 * - Deduplicates URLs so each image is only fetched once
 */
export function useImagePrefetch(loadedExercises: Map<number, Exercise>) {
  const prefetchedUrls = useRef<Set<string>>(new Set())
  const activeCount = useRef(0)
  const queue = useRef<string[]>([])
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // Don't start until at least one exercise is loaded
    if (loadedExercises.size === 0) return

    // Collect new URLs to prefetch
    const newUrls: string[] = []
    for (const exercise of loadedExercises.values()) {
      const imageUrls = exercise.exerciseDefinition?.imageUrls
      if (!imageUrls) continue

      for (const url of imageUrls) {
        const resolved = resolveImageUrl(url)
        if (!prefetchedUrls.current.has(resolved)) {
          prefetchedUrls.current.add(resolved)
          newUrls.push(resolved)
        }
      }
    }

    if (newUrls.length === 0) return

    // Add new URLs to queue
    queue.current.push(...newUrls)

    // Process queue with concurrency limit
    function processNext() {
      if (!mountedRef.current) return
      if (activeCount.current >= MAX_CONCURRENT) return

      const url = queue.current.shift()
      if (!url) return

      activeCount.current++
      const img = new Image()
      img.onload = () => {
        activeCount.current--
        processNext()
      }
      img.onerror = () => {
        activeCount.current--
        processNext()
      }
      img.src = url

      // Start another if we have capacity
      processNext()
    }

    processNext()
  }, [loadedExercises])
}
