'use client'

import { Check, Filter, Search } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import type { AnchorPattern } from '@/lib/exercises/anchor-patterns'
import { ALL_FAUS, FAU_DISPLAY_NAMES, type FAUKey } from '@/lib/fau-volume'
import type { MuscleBalanceSnapshot } from '@/lib/muscle-balance'
import type { AnchorStalenessRow } from '@/lib/recommendations/anchor-staleness'
import type { FauNeed } from '@/lib/recommendations/fau-score'
import { daysSinceLabel } from '@/lib/recommendations/staleness'
import { FilterChoiceSheet } from './FilterChoiceSheet'

// A-Z / Neglected / Recovery reorder the same muscle-group list; 'anchors' is a
// view swap — the sheet lists the user's curated movements by staleness instead.
type FauSort = 'alphabetical' | 'neglected' | 'recovery' | 'anchors'

export type ExerciseDefinition = {
  id: string
  name: string
  primaryFAUs: string[]
  secondaryFAUs: string[]
  equipment: string[]
  instructions?: string
  isSystem?: boolean
  createdBy?: string | null
}

interface ExerciseSearchInterfaceProps {
  onExerciseSelect: (exercise: ExerciseDefinition) => void
  initialQuery?: string
  preloadExercises?: boolean
  onCreateExercise?: (searchQuery: string) => void
  onEditExercise?: (exercise: ExerciseDefinition) => void
  initialFauFilter?: string | null
  muscleBalanceSnapshot?: MuscleBalanceSnapshot
  /**
   * Recovery-aware FAU ranking (#963). When present, the muscle-group sort gains
   * a third "Recovery" mode ordering FAUs by composite need and showing a short
   * reason chip per row. Absent = the mode is not offered (graceful degrade).
   */
  recoveryRanking?: FauNeed[]
  /**
   * Curated "anchor" movements with staleness (#976). When provided (even as an
   * empty array), the view toggle gains an "Anchors" mode that swaps the sheet's
   * muscle-group rows for movement rows sorted by days-since-last-logged; picking
   * one filters the exercise list to that movement's curated ids. Absent = the
   * mode is not offered.
   */
  anchors?: AnchorStalenessRow[]
  plannedFAUVolume?: Partial<Record<FAUKey, number>>
  /**
   * When provided, the picker switches to multi-select mode: cards highlight
   * when their id is in the set, and clicking a card (or its button) toggles
   * selection via onExerciseSelect rather than emitting once and closing.
   */
  selectedIds?: Set<string>
}

const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'smith_machine',
  'bodyweight',
  'resistance_band',
  'kettlebell',
  'other'
]

const EQUIPMENT_DISPLAY_NAMES: Record<string, string> = {
  'barbell': 'Barbell',
  'dumbbell': 'Dumbbell',
  'cable': 'Cable',
  'machine': 'Machine',
  'smith_machine': 'Smith Machine',
  'bodyweight': 'Bodyweight',
  'resistance_band': 'Resistance Band',
  'kettlebell': 'Kettlebell',
  'other': 'Other (specialized equipment)'
}

export function ExerciseSearchInterface({
  onExerciseSelect,
  initialQuery = '',
  preloadExercises = false,
  onCreateExercise,
  onEditExercise,
  initialFauFilter = null,
  muscleBalanceSnapshot,
  recoveryRanking,
  anchors,
  plannedFAUVolume = {},
  selectedIds,
}: ExerciseSearchInterfaceProps) {
  const isMultiSelect = selectedIds !== undefined
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedFAU, setSelectedFAU] = useState<string | null>(initialFauFilter)
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(preloadExercises)
  const [fauSheetOpen, setFauSheetOpen] = useState(false)
  const [equipmentSheetOpen, setEquipmentSheetOpen] = useState(false)
  const [fauSort, setFauSort] = useState<FauSort>('alphabetical')
  // Anchors view (#976): which curated movement is filtering the list, if any.
  const [selectedAnchorPattern, setSelectedAnchorPattern] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const balanceByFau = useMemo(() => {
    if (!muscleBalanceSnapshot) return new Map<FAUKey, MuscleBalanceSnapshot['items'][number]>()
    return new Map(muscleBalanceSnapshot.items.map((item) => [item.fau, item]))
  }, [muscleBalanceSnapshot])

  const hasRecovery = recoveryRanking !== undefined && recoveryRanking.length > 0
  const recoveryByFau = useMemo(
    () => new Map((recoveryRanking ?? []).map((entry) => [entry.fau, entry])),
    [recoveryRanking],
  )

  // Anchors mode is offered whenever the caller passes the prop (even empty — an
  // empty list renders a "set up" CTA rather than hiding the feature).
  const anchorsAvailable = anchors !== undefined
  const anchorByPattern = useMemo(
    () => new Map((anchors ?? []).map((a) => [a.pattern, a] as const)),
    [anchors],
  )
  const selectedAnchorIds = useMemo(() => {
    if (selectedAnchorPattern === null) return [] as string[]
    return anchorByPattern.get(selectedAnchorPattern as AnchorPattern)?.exerciseIds ?? []
  }, [selectedAnchorPattern, anchorByPattern])

  // A selected sort/view mode can only be active when its data is present; if the
  // prop disappears, fall back so the sheet never produces an empty order/list.
  const effectiveSort: FauSort =
    fauSort === 'recovery' && !hasRecovery
      ? 'neglected'
      : fauSort === 'anchors' && !anchorsAvailable
        ? 'alphabetical'
        : fauSort
  const inAnchorsView = effectiveSort === 'anchors'

  const sortModes = useMemo(
    () =>
      [
        { key: 'alphabetical' as const, label: 'A-Z' },
        { key: 'neglected' as const, label: 'Neglected' },
        ...(hasRecovery ? [{ key: 'recovery' as const, label: 'Recovery' }] : []),
        ...(anchorsAvailable ? [{ key: 'anchors' as const, label: 'Anchors' }] : []),
      ] satisfies Array<{ key: FauSort; label: string }>,
    [hasRecovery, anchorsAvailable],
  )

  const anchorOptions = useMemo(
    () => [
      { value: null, label: 'All configured movements' },
      ...(anchors ?? []).map((a) => ({
        value: a.pattern,
        label: a.displayName,
        // Days-since as a left-aligned "why" line so long copy ("New — never
        // logged") wraps cleanly instead of crowding the right-side badge slot.
        meta: daysSinceLabel(a.lastLoggedDaysAgo),
      })),
    ],
    [anchors],
  )

  const handleSortModeChange = useCallback((mode: FauSort) => {
    setFauSort(mode)
    // Switching dimensions clears the other's filter so stale predicates don't
    // linger: leaving Anchors drops the id filter; entering it drops the FAU one.
    if (mode === 'anchors') setSelectedFAU(null)
    else setSelectedAnchorPattern(null)
  }, [])

  const handleAnchorSelect = useCallback((pattern: string | null) => {
    setSelectedAnchorPattern(pattern)
    if (pattern !== null) setSelectedFAU(null)
  }, [])

  const fauOptions = useMemo(() => {
    const scoreFAU = (fau: FAUKey) => {
      const item = balanceByFau.get(fau)
      if (!item || !muscleBalanceSnapshot) return 0
      const plannedSets = plannedFAUVolume[fau] ?? 0
      const adjustedSets = item.actualSets + plannedSets
      const totalEffectiveSets = muscleBalanceSnapshot.lookback.totalEffectiveSets
      const adjustedShare = totalEffectiveSets > 0 ? adjustedSets / totalEffectiveSets : 0
      return item.targetShare - adjustedShare
    }

    const sortedFaus = [...ALL_FAUS].sort((a, b) => {
      if (effectiveSort === 'recovery' && hasRecovery) {
        const needA = recoveryByFau.get(a)?.need ?? Number.NEGATIVE_INFINITY
        const needB = recoveryByFau.get(b)?.need ?? Number.NEGATIVE_INFINITY
        if (needB !== needA) return needB - needA
      } else if (effectiveSort === 'neglected' && muscleBalanceSnapshot) {
        const byAdjustedDeficit = scoreFAU(b) - scoreFAU(a)
        if (byAdjustedDeficit !== 0) return byAdjustedDeficit
      }
      return (FAU_DISPLAY_NAMES[a] || a).localeCompare(FAU_DISPLAY_NAMES[b] || b)
    })

    return [
      { value: null, label: 'All Muscle Groups' },
      ...sortedFaus.map((fau) => {
        const item = balanceByFau.get(fau)
        const plannedSets = plannedFAUVolume[fau] ?? 0
        const adjustedSets = (item?.actualSets ?? 0) + plannedSets
        const desiredSets =
          item && muscleBalanceSnapshot
            ? item.targetShare * muscleBalanceSnapshot.lookback.totalEffectiveSets
            : null
        const adjustedFulfillment =
          item && desiredSets && desiredSets > 0
            ? Math.min(adjustedSets / desiredSets, 9.99)
            : item?.fulfillment
        return {
          value: fau,
          label: FAU_DISPLAY_NAMES[fau] || fau,
          description:
            item && desiredSets !== null
              ? `${formatSets(adjustedSets)} / ${formatSets(desiredSets)} target sets`
              : undefined,
          badge: item ? `${Math.round((adjustedFulfillment ?? item.fulfillment) * 100)}%` : undefined,
          // In recovery mode the row surfaces its "why" chip instead of the
          // planning-flow "+N planned" hint.
          meta:
            effectiveSort === 'recovery'
              ? recoveryByFau.get(fau)?.reason?.label
              : plannedSets > 0
                ? `+${formatSets(plannedSets)} planned`
                : undefined,
          progress: item ? Math.min(100, (adjustedFulfillment ?? item.fulfillment) * 100) : undefined,
        }
      }),
    ]
  }, [
    balanceByFau,
    effectiveSort,
    hasRecovery,
    muscleBalanceSnapshot,
    plannedFAUVolume,
    recoveryByFau,
  ])
  const equipmentOptions = useMemo(
    () => [
      { value: null, label: 'All Equipment' },
      ...EQUIPMENT_TYPES.map((eq) => ({ value: eq, label: EQUIPMENT_DISPLAY_NAMES[eq] || eq })),
    ],
    [],
  )

  // Auto-focus the search input on devices with a physical keyboard (desktop)
  // but NOT on touch devices, where focusing pops up the on-screen keyboard
  // and obscures the page. Touch users tap the field to bring it up.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersKeyboard = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (prefersKeyboard) {
      searchInputRef.current?.focus()
    }
  }, [])

  const searchExercises = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim())
      }
      if (selectedFAU) {
        params.append('faus', selectedFAU)
      }
      if (selectedEquipment) {
        params.append('equipment', selectedEquipment)
      }
      // Anchors view: restrict to the picked movement's curated exercise ids.
      if (selectedAnchorIds.length > 0) {
        params.append('ids', selectedAnchorIds.join(','))
      }
      params.append('limit', '50')

      const response = await fetch(`/api/exercises/search?${params}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to search exercises')
      }

      const { exercises } = await response.json()
      setExercises(exercises)
    } catch (error) {
      clientLogger.error('Error searching exercises:', error)
      setError(error instanceof Error ? error.message : 'Failed to search exercises')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedFAU, selectedEquipment, selectedAnchorIds])

  // Search when query/filters change (respecting preloadExercises)
  useEffect(() => {
    if (
      preloadExercises ||
      searchQuery.trim() ||
      selectedFAU ||
      selectedEquipment ||
      selectedAnchorIds.length > 0
    ) {
      searchExercises()
    }
  }, [
    searchQuery,
    selectedFAU,
    selectedEquipment,
    selectedAnchorIds,
    preloadExercises,
    searchExercises,
  ])

  const handleFAUSelect = useCallback((fau: string | null) => {
    setSelectedFAU(fau)
  }, [])

  const handleEquipmentSelect = useCallback((equipment: string | null) => {
    setSelectedEquipment(equipment)
  }, [])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search */}
      <div className="px-4 sm:px-6 py-4 border-b-2 border-border flex-shrink-0">
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '3rem' }}
            className="w-full pr-4 py-2 border-2 border-input focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground doom-input"
          />
        </div>

        {/* FAU / Anchors Filter */}
        <div>
          <div className="text-sm font-bold text-foreground mb-2 tracking-wide">
            {inAnchorsView ? 'Filter by Movement:' : 'Filter by Muscle Group:'}
          </div>
          <button
            type="button"
            onClick={() => setFauSheetOpen(true)}
            className="w-full px-4 py-2 border-2 border-input hover:border-primary focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground text-left font-bold"
          >
            {inAnchorsView
              ? selectedAnchorPattern
                ? (anchorByPattern.get(selectedAnchorPattern as AnchorPattern)?.displayName ??
                  'Movement')
                : 'All configured movements'
              : selectedFAU
                ? FAU_DISPLAY_NAMES[selectedFAU]
                : 'All Muscle Groups'}
          </button>
        </div>

        {/* Equipment Filter */}
        <div className="mt-3">
          <div className="text-sm font-bold text-foreground mb-2 tracking-wide">Filter by Equipment:</div>
          <button
            type="button"
            onClick={() => setEquipmentSheetOpen(true)}
            className="w-full px-4 py-2 border-2 border-input hover:border-primary focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground text-left font-bold"
          >
            {selectedEquipment ? EQUIPMENT_DISPLAY_NAMES[selectedEquipment] : 'All Equipment'}
          </button>
        </div>
      </div>

      <FilterChoiceSheet
        open={fauSheetOpen}
        onOpenChange={setFauSheetOpen}
        title={inAnchorsView ? 'Filter by Movement' : 'Filter by Muscle Group'}
        options={inAnchorsView ? anchorOptions : fauOptions}
        selected={inAnchorsView ? selectedAnchorPattern : selectedFAU}
        onSelect={inAnchorsView ? handleAnchorSelect : handleFAUSelect}
        headerContent={
          muscleBalanceSnapshot || anchorsAvailable ? (
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                View
              </div>
              <div
                className="grid border-2 border-border bg-muted/20"
                style={{
                  // All modes share a single row; type shrinks below so up to
                  // four labels ("Neglected") still fit without clipping.
                  gridTemplateColumns: `repeat(${sortModes.length}, minmax(0, 1fr))`,
                }}
              >
                {sortModes.map((mode, index) => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => handleSortModeChange(mode.key)}
                    className={`min-h-10 whitespace-nowrap px-2 text-center text-xs font-bold uppercase tracking-wide transition-colors doom-focus-ring ${
                      index > 0 ? 'border-l-2 border-border' : ''
                    } ${
                      effectiveSort === mode.key
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              {inAnchorsView && (anchors?.length ?? 0) === 0 && (
                <div className="mt-3 border-2 border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                  <p className="mb-2 font-semibold text-foreground">
                    No target movements yet.
                  </p>
                  <p className="mb-2">
                    Pin the compound lifts you want to keep hitting, then this view
                    ranks them by how long it's been.
                  </p>
                  <Link
                    href="/settings/target-movements"
                    className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-primary hover:underline"
                  >
                    Set up Target Movements →
                  </Link>
                </div>
              )}
            </div>
          ) : undefined
        }
      />
      <FilterChoiceSheet
        open={equipmentSheetOpen}
        onOpenChange={setEquipmentSheetOpen}
        title="Filter by Equipment"
        options={equipmentOptions}
        selected={selectedEquipment}
        onSelect={handleEquipmentSelect}
      />

      {/* Results */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-4 min-h-0">
        {error && (
          <div className="bg-error-muted border-2 border-error p-4 mb-4">
            <div className="text-error font-bold">{error}</div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground font-bold tracking-wide">SEARCHING EXERCISES...</div>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-4">
                <Search size={32} className="text-muted-foreground/60" />
                <Filter size={32} className="text-muted-foreground/60" />
              </div>
              <div className="font-bold tracking-wide">
                ENTER A SEARCH TERM OR SELECT A FILTER TO FIND EXERCISES
              </div>
            </div>
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground font-bold tracking-wide">
              NO EXERCISES FOUND MATCHING YOUR SEARCH
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {exercises.map((exercise) => {
              const isSelected = isMultiSelect && selectedIds?.has(exercise.id)
              return (
              <div
                key={exercise.id}
                {...(isMultiSelect && {
                  role: 'button',
                  tabIndex: 0,
                  'aria-pressed': !!isSelected,
                  onClick: () => onExerciseSelect(exercise),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onExerciseSelect(exercise)
                    }
                  },
                })}
                className={`border-2 p-4 transition-all bg-card ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.35)]'
                    : 'border-border hover:border-primary hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]'
                } ${isMultiSelect ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-2 tracking-wide uppercase">{exercise.name}</h3>

                    {exercise.primaryFAUs.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-bold text-muted-foreground">Primary: </span>
                        <span className="text-sm text-foreground">{exercise.primaryFAUs.map(fau => FAU_DISPLAY_NAMES[fau] || fau).join(', ')}</span>
                      </div>
                    )}

                    {exercise.secondaryFAUs.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-bold text-muted-foreground">Secondary: </span>
                        <span className="text-sm text-foreground">{exercise.secondaryFAUs.map(fau => FAU_DISPLAY_NAMES[fau] || fau).join(', ')}</span>
                      </div>
                    )}

                    {exercise.equipment.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-bold text-muted-foreground">Equipment: </span>
                        <span className="text-sm text-foreground">{exercise.equipment.map(eq => EQUIPMENT_LABELS[eq] || eq.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    {onEditExercise && !exercise.isSystem && (
                      <button type="button"
                        onClick={() => onEditExercise(exercise)}
                        className="px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary-hover font-bold uppercase tracking-wider text-sm border-2 border-border transition-colors"
                        title="Edit custom exercise"
                      >
                        Edit
                      </button>
                    )}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); onExerciseSelect(exercise) }}
                      aria-pressed={isMultiSelect ? !!isSelected : undefined}
                      className={
                        isSelected
                          ? 'px-4 py-2 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm border-2 border-primary-active flex items-center gap-1.5'
                          : 'px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover font-bold uppercase tracking-wider text-sm border-2 border-primary-active shadow-[0_3px_0_var(--primary-active),0_5px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_3px_0_var(--primary-active),0_0_20px_rgba(var(--primary-rgb),0.6)] active:translate-y-[3px] active:shadow-[0_0_0_var(--primary-active),0_2px_4px_rgba(0,0,0,0.4)] transition-all'
                      }
                    >
                      {isSelected ? (
                        <>
                          <Check size={16} strokeWidth={3} />
                          Added
                        </>
                      ) : isMultiSelect ? 'Add' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Fixed Footer - Create New Exercise */}
      {onCreateExercise && (
        <div className="border-t-2 border-border bg-muted/30 px-4 sm:px-6 py-3 flex-shrink-0">
          <button type="button"
            onClick={() => onCreateExercise(searchQuery)}
            className="w-full px-4 py-2 bg-accent text-accent-foreground hover:bg-accent-hover font-bold uppercase tracking-wider text-sm border-2 border-accent transition-colors"
          >
            + Create New Exercise
          </button>
        </div>
      )}
    </div>
  )
}

function formatSets(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
