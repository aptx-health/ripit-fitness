'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, ChevronDown, Check, X, Pencil, Trash2, Plus } from 'lucide-react'
import ExerciseDefinitionEditorModal from '@/components/features/exercise-definition/ExerciseDefinitionEditorModal'
import DeleteExerciseDialog from './DeleteExerciseDialog'
import { FAU_DISPLAY_NAMES } from '@/lib/fau-volume'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/radix/popover'

type ExerciseDefinition = {
  id: string
  name: string
  normalizedName: string
  aliases: string[]
  primaryFAUs: string[]
  secondaryFAUs: string[]
  equipment: string[]
  category: string | null
  instructions: string | null
  notes: string | null
  isSystem: boolean
  createdBy: string | null
  userId: string | null
  usageCount: number
  canEdit: boolean
  canDelete: boolean
}

type PaginationData = {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const ITEMS_PER_PAGE = 50

export default function ExerciseAdminTable() {
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedFAUs, setSelectedFAUs] = useState<string[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [systemFilter, setSystemFilter] = useState<'all' | 'system' | 'user'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal states
  const [isCreating, setIsCreating] = useState(false)
  const [editingExercise, setEditingExercise] = useState<ExerciseDefinition | null>(null)
  const [deletingExercise, setDeletingExercise] = useState<ExerciseDefinition | null>(null)

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setCurrentPage(1) // Reset page on search
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Fetch exercises
  const fetchExercises = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set('query', debouncedQuery)
      if (selectedFAUs.length > 0) params.set('faus', selectedFAUs.join(','))
      if (selectedEquipment.length > 0) params.set('equipment', selectedEquipment.join(','))
      if (systemFilter === 'system') params.set('isSystem', 'true')
      if (systemFilter === 'user') params.set('isSystem', 'false')
      params.set('page', currentPage.toString())
      params.set('limit', ITEMS_PER_PAGE.toString())

      const response = await fetch(`/api/admin/exercise-definitions?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch exercises')
      }

      setExercises(data.data)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Error fetching exercises:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch exercises')
    } finally {
      setIsLoading(false)
    }
  }, [debouncedQuery, selectedFAUs, selectedEquipment, systemFilter, currentPage])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  // Handle filter changes
  const handleFAUToggle = (fau: string) => {
    setSelectedFAUs((prev) =>
      prev.includes(fau) ? prev.filter((f) => f !== fau) : [...prev, fau]
    )
    setCurrentPage(1)
  }

  const handleEquipmentToggle = (equipment: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipment) ? prev.filter((e) => e !== equipment) : [...prev, equipment]
    )
    setCurrentPage(1)
  }

  const handleSystemFilterChange = (filter: 'all' | 'system' | 'user') => {
    setSystemFilter(filter)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setDebouncedQuery('')
    setSelectedFAUs([])
    setSelectedEquipment([])
    setSystemFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    debouncedQuery !== '' ||
    selectedFAUs.length > 0 ||
    selectedEquipment.length > 0 ||
    systemFilter !== 'all'

  // Handle create success
  const handleCreateSuccess = () => {
    setIsCreating(false)
    fetchExercises()
  }

  // Handle edit success
  const handleEditSuccess = () => {
    setEditingExercise(null)
    fetchExercises()
  }

  // Handle delete success
  const handleDeleteSuccess = () => {
    setDeletingExercise(null)
    fetchExercises()
  }

  // Format FAUs for display
  const formatFAUs = (faus: string[]) => {
    if (faus.length === 0) return '-'
    return faus.map((fau) => FAU_DISPLAY_NAMES[fau] || fau).join(', ')
  }

  // Format equipment for display
  const formatEquipment = (equipment: string[]) => {
    if (equipment.length === 0) return '-'
    return equipment.map((eq) => EQUIPMENT_LABELS[eq] || eq).join(', ')
  }

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Input + Create Button */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              size={20}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises..."
              className="w-full pl-10 pr-4 py-3 border-2 border-border bg-background text-foreground focus:border-primary outline-none uppercase tracking-wider"
            />
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors uppercase tracking-wider font-semibold doom-button-3d doom-focus-ring flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Exercise</span>
          </button>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* FAU Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="px-4 py-2 border-2 border-border text-foreground hover:border-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring flex items-center gap-2 text-sm">
                Muscles: {selectedFAUs.length > 0 ? `${selectedFAUs.length}` : 'All'}
                <ChevronDown size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {Object.entries(FAU_DISPLAY_NAMES).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleFAUToggle(key)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors doom-focus-ring flex items-center justify-between font-medium"
                  >
                    {label}
                    {selectedFAUs.includes(key) && <Check size={16} className="text-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Equipment Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="px-4 py-2 border-2 border-border text-foreground hover:border-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring flex items-center gap-2 text-sm">
                Equipment: {selectedEquipment.length > 0 ? `${selectedEquipment.length}` : 'All'}
                <ChevronDown size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {Object.entries(EQUIPMENT_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleEquipmentToggle(key)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors doom-focus-ring flex items-center justify-between font-medium"
                  >
                    {label}
                    {selectedEquipment.includes(key) && (
                      <Check size={16} className="text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* System/User Toggle */}
          <div className="flex border-2 border-border">
            <button
              onClick={() => handleSystemFilterChange('all')}
              className={`px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${
                systemFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-primary/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleSystemFilterChange('system')}
              className={`px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors border-l-2 border-border ${
                systemFilter === 'system'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-primary/10'
              }`}
            >
              System
            </button>
            <button
              onClick={() => handleSystemFilterChange('user')}
              className={`px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors border-l-2 border-border ${
                systemFilter === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-primary/10'
              }`}
            >
              User
            </button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1 doom-focus-ring"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        {/* Results count */}
        {pagination && (
          <p className="text-sm text-muted-foreground">
            Showing {exercises.length} of {pagination.totalCount} exercises
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-error/10 border-2 border-error mb-6">
          <p className="text-error font-medium">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 text-center">
          <p className="text-muted-foreground uppercase tracking-wider">Loading...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && exercises.length === 0 && (
        <div className="p-12 text-center bg-card border-2 border-border">
          <p className="text-muted-foreground uppercase tracking-wider">
            No exercises found matching your filters
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && exercises.length > 0 && (
        <div className="border-2 border-border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b-2 border-border">
                <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-foreground">
                  Muscles
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-foreground">
                  Equipment
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold uppercase tracking-wider text-foreground">
                  Uses
                </th>
                <th className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wider text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((exercise) => (
                <tr
                  key={exercise.id}
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-foreground font-medium">
                    {exercise.name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold uppercase tracking-wider ${
                        exercise.isSystem
                          ? 'bg-primary/20 text-primary border border-primary'
                          : 'bg-secondary/20 text-secondary border border-secondary'
                      }`}
                    >
                      {exercise.isSystem ? 'System' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                    {formatFAUs(exercise.primaryFAUs)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                    {formatEquipment(exercise.equipment)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground text-center">
                    {exercise.usageCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingExercise(exercise)}
                        className="p-2 border-2 border-border text-foreground hover:border-primary hover:text-primary transition-colors doom-focus-ring"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingExercise(exercise)}
                        className="p-2 border-2 border-border text-foreground hover:border-error hover:text-error transition-colors doom-focus-ring"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setCurrentPage((prev) => prev - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-4 py-2 border-2 border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring"
            >
              Prev
            </button>

            <span className="px-4 py-2 text-sm text-muted-foreground uppercase tracking-wider">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 border-2 border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <ExerciseDefinitionEditorModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        mode="create"
        onSuccess={handleCreateSuccess}
        apiBasePath="/api/admin/exercise-definitions"
      />

      {/* Edit Modal */}
      {editingExercise && (
        <ExerciseDefinitionEditorModal
          isOpen={true}
          onClose={() => setEditingExercise(null)}
          mode="edit"
          exerciseId={editingExercise.id}
          onSuccess={handleEditSuccess}
          apiBasePath="/api/admin/exercise-definitions"
        />
      )}

      {/* Delete Dialog */}
      {deletingExercise && (
        <DeleteExerciseDialog
          open={true}
          onOpenChange={(open) => !open && setDeletingExercise(null)}
          exerciseId={deletingExercise.id}
          exerciseName={deletingExercise.name}
          isSystem={deletingExercise.isSystem}
          usageCount={deletingExercise.usageCount}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}
