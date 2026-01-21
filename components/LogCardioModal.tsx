'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  EQUIPMENT_LABELS,
  INTENSITY_ZONE_LABELS,
  METRIC_LABELS,
  METRIC_UNITS,
  getMetricsForEquipment,
  getPrimaryMetrics,
  getSecondaryMetrics,
  getAllMetrics,
  type CardioEquipment,
  type IntensityZone,
  type CardioMetric,
  INITIAL_CARDIO_FORM_STATE,
  validateCardioSessionForm,
  formStateToRequest,
  type CardioSessionFormState
} from '@/lib/cardio'
import { LoadingFrog } from '@/components/ui/loading-frog'

type Props = {
  isOpen: boolean
  onClose: () => void
  prescribedSessionId?: string
  prescribedData?: {
    name: string
    equipment: CardioEquipment
    targetDuration: number
    intensityZone?: IntensityZone
  }
}

export default function LogCardioModal({
  isOpen,
  onClose,
  prescribedSessionId,
  prescribedData
}: Props) {
  const router = useRouter()
  const [formState, setFormState] = useState<CardioSessionFormState>(INITIAL_CARDIO_FORM_STATE)
  const [activeMetrics, setActiveMetrics] = useState<CardioMetric[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showMetricSelector, setShowMetricSelector] = useState(false)

  // Pre-fill form if prescribed data provided
  useEffect(() => {
    if (prescribedData) {
      setFormState(prev => ({
        ...prev,
        name: prescribedData.name,
        equipment: prescribedData.equipment,
        duration: prescribedData.targetDuration.toString(),
        intensityZone: prescribedData.intensityZone || null
      }))
    }
  }, [prescribedData])

  // Load metrics when equipment changes
  useEffect(() => {
    if (formState.equipment) {
      loadMetricsForEquipment(formState.equipment)
    }
  }, [formState.equipment])

  const loadMetricsForEquipment = async (equipment: CardioEquipment) => {
    try {
      const response = await fetch(`/api/cardio/metrics/${equipment}`)
      const data = await response.json()

      if (data.success) {
        setActiveMetrics(data.metrics)
      } else {
        // Fallback to defaults
        const metrics = getMetricsForEquipment(equipment)
        setActiveMetrics(metrics)
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
      // Fallback to defaults
      const metrics = getMetricsForEquipment(equipment)
      setActiveMetrics(metrics)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate form
    const validation = validateCardioSessionForm(formState)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsLoading(true)

    try {
      const requestBody = formStateToRequest(formState)

      // Add prescribedSessionId if logging from program
      if (prescribedSessionId) {
        requestBody.prescribedSessionId = prescribedSessionId
      }

      const response = await fetch('/api/cardio/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (data.success) {
        router.refresh()
        onClose()
        // Reset form
        setFormState(INITIAL_CARDIO_FORM_STATE)
      } else {
        setErrors({ submit: data.error || 'Failed to log session' })
      }
    } catch (error) {
      console.error('Error logging cardio:', error)
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMetricToggle = (metric: CardioMetric) => {
    if (metric === 'duration') return // Duration always required

    setActiveMetrics(prev =>
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    )
  }

  const handleSavePreferences = async () => {
    if (!formState.equipment) return

    try {
      await fetch('/api/cardio/metrics/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment: formState.equipment,
          metrics: activeMetrics
        })
      })
      setShowMetricSelector(false)
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  const handleResetToDefaults = async () => {
    if (!formState.equipment) return

    try {
      await fetch(`/api/cardio/metrics/preferences/${formState.equipment}`, {
        method: 'DELETE'
      })

      // Reload default metrics
      const metrics = getMetricsForEquipment(formState.equipment)
      setActiveMetrics(metrics)
      setShowMetricSelector(false)
    } catch (error) {
      console.error('Error resetting preferences:', error)
    }
  }

  if (!isOpen) return null

  const primaryMetrics = formState.equipment ? getPrimaryMetrics(formState.equipment) : []
  const secondaryMetrics = formState.equipment ? getSecondaryMetrics(formState.equipment) : []
  const allMetrics = getAllMetrics()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border-2 border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto doom-noise doom-corners">
        {/* Header */}
        <div className="bg-primary p-4 border-b-2 border-primary-muted-dark">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-primary-foreground doom-heading">
              {prescribedData ? 'LOG WORKOUT' : 'LOG CARDIO SESSION'}
            </h2>
            <button
              onClick={onClose}
              className="text-primary-foreground hover:text-foreground transition"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Equipment Selection */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2 doom-label">
              EQUIPMENT *
            </label>
            <select
              value={formState.equipment || ''}
              onChange={(e) => setFormState(prev => ({ ...prev, equipment: e.target.value as CardioEquipment }))}
              className="doom-input w-full"
              disabled={!!prescribedData?.equipment}
            >
              <option value="">SELECT EQUIPMENT</option>
              {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.equipment && (
              <p className="text-error-text text-sm mt-1">{errors.equipment}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2 doom-label">
              SESSION NAME *
            </label>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Morning Run"
              className="doom-input w-full"
            />
            {errors.name && (
              <p className="text-error-text text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Show metrics only when equipment selected */}
          {formState.equipment && (
            <>
              {/* Modify Fields Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMetricSelector(!showMetricSelector)}
                  className="text-sm text-primary hover:text-primary-hover doom-link flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  MODIFY FIELDS
                </button>
              </div>

              {/* Metric Selector Modal */}
              {showMetricSelector && (
                <div className="bg-muted border border-border p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-foreground doom-heading">
                    CUSTOMIZE METRICS
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {allMetrics.map(metric => (
                      <label
                        key={metric}
                        className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-card transition ${
                          metric === 'duration' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={activeMetrics.includes(metric) || metric === 'duration'}
                          onChange={() => handleMetricToggle(metric)}
                          disabled={metric === 'duration'}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-foreground">
                          {METRIC_LABELS[metric]}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleResetToDefaults}
                      className="px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary-hover doom-button-3d text-sm uppercase tracking-wider"
                    >
                      RESET TO DEFAULTS
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePreferences}
                      className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d text-sm uppercase tracking-wider"
                    >
                      SAVE
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Metrics */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground doom-label border-b border-border pb-2">
                  PRIMARY FIELDS
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {primaryMetrics.filter(m => activeMetrics.includes(m)).map(metric => (
                    <MetricInput
                      key={metric}
                      metric={metric}
                      value={formState[metric as keyof CardioSessionFormState] as string}
                      onChange={(value) => setFormState(prev => ({ ...prev, [metric]: value }))}
                      error={errors[metric]}
                    />
                  ))}
                </div>
              </div>

              {/* Secondary Metrics */}
              {secondaryMetrics.filter(m => activeMetrics.includes(m)).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground doom-label border-b border-border pb-2">
                    SECONDARY FIELDS
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {secondaryMetrics.filter(m => activeMetrics.includes(m)).map(metric => (
                      <MetricInput
                        key={metric}
                        metric={metric}
                        value={formState[metric as keyof CardioSessionFormState] as string}
                        onChange={(value) => setFormState(prev => ({ ...prev, [metric]: value }))}
                        error={errors[metric]}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Context Fields */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground doom-label border-b border-border pb-2">
                  CONTEXT
                </h3>

                {/* Intensity Zone */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2 doom-label">
                    INTENSITY ZONE
                  </label>
                  <select
                    value={formState.intensityZone || ''}
                    onChange={(e) => setFormState(prev => ({ ...prev, intensityZone: e.target.value as IntensityZone || null }))}
                    className="doom-input w-full"
                  >
                    <option value="">SELECT ZONE</option>
                    {Object.entries(INTENSITY_ZONE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interval Structure */}
                {activeMetrics.includes('intervalStructure') && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2 doom-label">
                      INTERVAL STRUCTURE
                    </label>
                    <input
                      type="text"
                      value={formState.intervalStructure}
                      onChange={(e) => setFormState(prev => ({ ...prev, intervalStructure: e.target.value }))}
                      placeholder="8x30s/90s"
                      className="doom-input w-full"
                    />
                  </div>
                )}

                {/* Notes */}
                {activeMetrics.includes('notes') && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2 doom-label">
                      NOTES
                    </label>
                    <textarea
                      value={formState.notes}
                      onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Weather, how you felt, etc."
                      rows={3}
                      className="doom-input w-full resize-none"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-error-muted border border-error-border p-4">
              <p className="text-error-text text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-border text-foreground hover:bg-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isLoading || !formState.equipment}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              {isLoading ? 'SAVING...' : 'LOG SESSION'}
            </button>
          </div>
        </form>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-60">
          <div className="bg-card p-6 rounded-lg text-center min-w-[300px]">
            <div className="mb-3 flex justify-center">
              <LoadingFrog size={64} speed={0.8} />
            </div>
            <p className="text-foreground">Saving session...</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper component for metric inputs
function MetricInput({
  metric,
  value,
  onChange,
  error
}: {
  metric: CardioMetric
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  const label = METRIC_LABELS[metric]
  const unit = METRIC_UNITS[metric]
  const isRequired = metric === 'duration'

  // Determine input type based on metric
  const getInputType = () => {
    if (metric === 'avgPace') return 'text'
    if (metric === 'distance') return 'number'
    return 'number'
  }

  const getPlaceholder = () => {
    if (metric === 'avgPace') return '8:30'
    return ''
  }

  const getStep = () => {
    if (metric === 'distance') return '0.01'
    return '1'
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-2 doom-label">
        {label} {isRequired && '*'} {unit && `(${unit})`}
      </label>
      <input
        type={getInputType()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={getPlaceholder()}
        step={getStep()}
        min="0"
        className="doom-input w-full"
      />
      {error && (
        <p className="text-error-text text-sm mt-1">{error}</p>
      )}
    </div>
  )
}
