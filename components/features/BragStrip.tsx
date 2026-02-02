'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Settings } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/radix/select'
import { CardioDistanceCategory, CARDIO_CATEGORY_LABELS } from '@/lib/cardio/distance-categories'

type BragStripStats = {
  workoutsThisWeek: number
  workoutsThisMonth: number
  workoutsAllTime: number
  totalVolumeLbs: number
  totalVolumeKg: number
  totalRunningMiles: number
  totalRunningKm: number
  earliestWorkout: string | null
  generatedAt: string
}

type Props = {
  stats: BragStripStats
  displayName: string | null
}

export default function BragStrip({ stats, displayName }: Props) {
  // Cardio distance category state
  const [cardioCategory, setCardioCategory] = useState<CardioDistanceCategory>('running')
  const [cardioDistance, setCardioDistance] = useState({
    miles: stats.totalRunningMiles,
    km: stats.totalRunningKm
  })
  const [isLoadingCardio, setIsLoadingCardio] = useState(false)

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cardioDistanceCategory')
    if (saved && ['running', 'biking', 'rowing', 'swimming', 'all'].includes(saved)) {
      setCardioCategory(saved as CardioDistanceCategory)
    }
  }, [])

  // Fetch cardio distance when category changes
  useEffect(() => {
    async function fetchCardioDistance() {
      setIsLoadingCardio(true)
      try {
        const response = await fetch(`/api/stats/cardio-distance?category=${cardioCategory}`)
        if (response.ok) {
          const data = await response.json()
          setCardioDistance({ miles: data.miles, km: data.km })
        }
      } catch (error) {
        console.error('Failed to fetch cardio distance:', error)
      } finally {
        setIsLoadingCardio(false)
      }
    }

    fetchCardioDistance()
    localStorage.setItem('cardioDistanceCategory', cardioCategory)
  }, [cardioCategory])

  // Format training start date
  const trainingStart = stats.earliestWorkout
    ? new Date(stats.earliestWorkout).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently'

  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US')
  }

  return (
    <div className="max-w-md md:max-w-3xl mx-auto doom-page-enter">
      {/* Trophy Badge Container */}
      <div className="relative doom-noise">
        {/* Top Badge Header with Frog */}
        <div className="relative bg-card border-4 border-primary pt-4 md:pt-10 pb-3 md:pb-6 px-4 md:px-6 doom-corners">
          {/* Frog Logo + Title Side by Side */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* Frog Logo */}
            <div className="flex-shrink-0">
              <Image
                src="/frog-large-transparent.png"
                alt="Ripit Fitness"
                width={64}
                height={64}
                className="object-contain md:w-24 md:h-24"
              />
            </div>

            {/* Title */}
            <div className="flex-1">
              <h1 className="doom-title text-xl md:text-3xl text-primary mb-1 md:mb-2">
                RIPIT FITNESS
              </h1>
              <p className="text-sm md:text-base font-bold text-accent uppercase tracking-wider">
                {displayName ? `${displayName}'S STATS` : 'YOUR STATS'}
              </p>
            </div>
          </div>
        </div>

        {/* Badge Body */}
        <div className="border-x-4 border-primary bg-muted px-3 md:px-6 py-3 md:py-6">
          {/* Workout Counts - Grid (2 columns on mobile and desktop) */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-6">
            {/* This Week */}
            <div className="bg-card border-2 border-border p-3 md:p-5 text-center" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <div className="text-5xl md:text-6xl font-bold text-accent mb-1" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                {stats.workoutsThisWeek}
              </div>
              <div className="text-sm md:text-base font-semibold text-foreground uppercase tracking-wider">
                This Week
              </div>
            </div>

            {/* This Month */}
            <div className="bg-card border-2 border-border p-3 md:p-5 text-center" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <div className="text-5xl md:text-6xl font-bold text-accent mb-1" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                {stats.workoutsThisMonth}
              </div>
              <div className="text-sm md:text-base font-semibold text-foreground uppercase tracking-wider">
                This Month
              </div>
            </div>

            {/* All Time - Spans Both Columns */}
            <div className="col-span-2 bg-card border-2 border-primary p-4 md:p-6 text-center shadow-[0_0_10px_rgba(var(--primary-rgb),0.15)]" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <div className="text-6xl md:text-7xl font-bold text-primary mb-1" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                {stats.workoutsAllTime}
              </div>
              <div className="doom-heading text-base md:text-lg text-foreground">
                Total Workouts
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-3 md:my-6"></div>

          {/* Volume and Running Stats - Grid (2 columns on mobile and desktop) */}
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            {/* Total Volume */}
            <div className="bg-card border-2 border-primary p-3 md:p-6 text-center" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-0.5 md:mb-1" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                {formatNumber(stats.totalVolumeLbs)}
              </div>
              <div className="text-lg md:text-2xl text-foreground mb-1 md:mb-3">
                lbs
              </div>
              <div className="text-sm md:text-base font-semibold text-foreground uppercase tracking-wider mb-0.5 md:mb-1">
                Total Volume
              </div>
              <div className="text-sm md:text-base text-muted-foreground">
                ({formatNumber(stats.totalVolumeKg)} kg)
              </div>
            </div>

            {/* Cardio Distance */}
            <div className="bg-card border-2 border-accent p-3 md:p-6 text-center shadow-[0_0_8px_rgba(var(--accent-rgb),0.1)]" style={{ WebkitTapHighlightColor: 'transparent' }}>
              {/* Distance Stats */}
              <div className="text-4xl md:text-5xl font-bold text-accent mb-0.5 md:mb-1" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                {isLoadingCardio ? '...' : cardioDistance.miles}
              </div>
              <div className="text-lg md:text-2xl text-foreground mb-1 md:mb-3">
                mi
              </div>
              <div className="text-sm md:text-base font-semibold text-foreground uppercase tracking-wider mb-0.5 md:mb-1">
                {CARDIO_CATEGORY_LABELS[cardioCategory]} Distance
              </div>
              <div className="text-sm md:text-base text-muted-foreground">
                ({isLoadingCardio ? '...' : cardioDistance.km} km)
              </div>
            </div>
          </div>
        </div>

        {/* Badge Footer */}
        <div className="bg-card border-4 border-t-0 border-primary px-3 md:px-6 py-4 md:py-8 doom-corners-accent relative">
          <div className="text-center">
            <p className="text-sm md:text-base font-semibold text-foreground uppercase tracking-wider mb-1 md:mb-2">
              Training Since
            </p>
            <p className="doom-heading text-lg md:text-xl text-primary">
              {trainingStart}
            </p>
          </div>

          {/* Cardio Category Selector */}
          <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6">
            <Select value={cardioCategory} onValueChange={(value) => setCardioCategory(value as CardioDistanceCategory)}>
              <SelectTrigger className="h-8 w-8 p-0 border-none bg-transparent hover:bg-muted/50 focus:ring-1 focus:ring-primary flex items-center justify-center rounded">
                <Settings className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="running">{CARDIO_CATEGORY_LABELS.running}</SelectItem>
                <SelectItem value="biking">{CARDIO_CATEGORY_LABELS.biking}</SelectItem>
                <SelectItem value="rowing">{CARDIO_CATEGORY_LABELS.rowing}</SelectItem>
                <SelectItem value="swimming">{CARDIO_CATEGORY_LABELS.swimming}</SelectItem>
                <SelectItem value="all">{CARDIO_CATEGORY_LABELS.all}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
