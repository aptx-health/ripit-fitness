'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import TagInput from '@/components/ui/TagInput';
import EquipmentSelector from './EquipmentSelector';
import FAUSelector from './FAUSelector';
import { clientLogger } from '@/lib/client-logger';

export interface ExerciseDefinition {
  id: string;
  name: string;
  equipment: string[];
  primaryFAUs: string[];
  secondaryFAUs: string[];
  category?: string;
  aliases: string[];
  instructions?: string;
  notes?: string;
}

export interface ExerciseDefinitionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  exerciseId?: string;
  initialName?: string;
  onSuccess?: (exerciseDefinition: ExerciseDefinition) => void;
}

export default function ExerciseDefinitionEditorModal({
  isOpen,
  onClose,
  mode,
  exerciseId,
  initialName = '',
  onSuccess,
}: ExerciseDefinitionEditorModalProps) {
  const [formData, setFormData] = useState({
    name: initialName,
    equipment: [] as string[],
    primaryFAUs: [] as string[],
    secondaryFAUs: [] as string[],
    category: '',
    aliases: [] as string[],
    instructions: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDuplicateName, setIsDuplicateName] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load exercise data for edit mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && exerciseId) {
      setIsLoading(true);
      fetch(`/api/exercise-definitions/${exerciseId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            const exercise = data.data;
            setFormData({
              name: exercise.name,
              equipment: exercise.equipment || [],
              primaryFAUs: exercise.primaryFAUs || [],
              secondaryFAUs: exercise.secondaryFAUs || [],
              category: exercise.category || '',
              aliases: exercise.aliases || [],
              instructions: exercise.instructions || '',
              notes: exercise.notes || '',
            });
            setUsageCount(exercise.usageCount || 0);
          }
        })
        .catch((err) => {
          clientLogger.error('Error loading exercise:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Reset for create mode
      setFormData({
        name: initialName,
        equipment: [],
        primaryFAUs: [],
        secondaryFAUs: [],
        category: '',
        aliases: [],
        instructions: '',
        notes: '',
      });
      setUsageCount(0);
    }
  }, [isOpen, mode, exerciseId, initialName]);

  // Debounced duplicate check
  useEffect(() => {
    if (!formData.name.trim() || formData.name === initialName) {
      setIsDuplicateName(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams({
        name: formData.name,
        ...(mode === 'edit' && exerciseId && { excludeId: exerciseId }),
      });

      fetch(`/api/exercise-definitions/check-duplicate?${params}`)
        .then((res) => res.json())
        .then((data) => {
          setIsDuplicateName(data.success && data.data.exists);
        })
        .catch((err) => {
          clientLogger.error('Error checking duplicate:', err);
        });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.name, initialName, mode, exerciseId]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const endpoint =
        mode === 'create'
          ? '/api/exercise-definitions'
          : `/api/exercise-definitions/${exerciseId}`;

      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          equipment: formData.equipment,
          primaryFAUs: formData.primaryFAUs,
          secondaryFAUs: formData.secondaryFAUs,
          category: formData.category || null,
          aliases: formData.aliases,
          instructions: formData.instructions || null,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          const errorMap: Record<string, string> = {};
          data.details.forEach((detail: { field: string; message: string }) => {
            errorMap[detail.field] = detail.message;
          });
          setErrors(errorMap);
        } else {
          alert(data.error || 'Failed to save exercise');
        }
        return;
      }

      if (onSuccess && data.data) {
        onSuccess(data.data);
      }

      onClose();
    } catch (error) {
      clientLogger.error('Error saving exercise:', error);
      alert('An error occurred while saving the exercise');
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, exerciseId, formData, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    setFormData({
      name: '',
      equipment: [],
      primaryFAUs: [],
      secondaryFAUs: [],
      category: '',
      aliases: [],
      instructions: '',
      notes: '',
    });
    setErrors({});
    setIsDuplicateName(false);
    setUsageCount(0);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const canSubmit =
    !isDuplicateName &&
    !isSubmitting &&
    formData.name.trim() &&
    formData.equipment.length > 0 &&
    formData.primaryFAUs.length > 0;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      className="backdrop-blur-md bg-background/80 flex items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        className="bg-card border-4 border-border w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-[90vw] sm:max-w-4xl sm:my-8 flex flex-col doom-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-border bg-primary text-primary-foreground">
          <h2 className="text-xl font-bold tracking-wide uppercase">
            {mode === 'create' ? 'Create New Exercise' : 'Edit Exercise'}
          </h2>
          <button
            onClick={handleClose}
            className="hover:bg-primary-hover p-2 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <>
              {/* Usage Warning */}
              {mode === 'edit' && usageCount > 0 && (
                <div className="bg-orange-900/20 border-2 border-orange-600 rounded p-4">
                  <p className="text-sm text-orange-200 font-medium">
                    ⚠️ This exercise is used in {usageCount} active workout
                    {usageCount > 1 ? 's' : ''}. Changes will affect future sessions.
                  </p>
                </div>
              )}

              {/* Duplicate Warning */}
              {isDuplicateName && (
                <div className="bg-red-900/20 border-2 border-red-600 rounded p-3">
                  <p className="text-sm text-red-200 font-medium">
                    ⚠️ An exercise with this name already exists.
                  </p>
                </div>
              )}

              {/* Name */}
              <div>
                <label htmlFor="exercise-name" className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Exercise Name *
                </label>
                <input
                  id="exercise-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={100}
                  className={`w-full px-3 py-2 border-2 rounded bg-background text-foreground ${
                    errors.name || isDuplicateName ? 'border-error' : 'border-border focus:border-primary'
                  }`}
                  placeholder="e.g., Bench Press"
                  autoFocus
                />
                {errors.name && <p className="text-sm text-error font-medium mt-1">{errors.name}</p>}
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Required</span>
                  <span className="text-xs text-muted-foreground">{formData.name.length} / 100</span>
                </div>
              </div>

              {/* Category (Optional) */}
              <div>
                <label htmlFor="exercise-category" className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Category
                </label>
                <input
                  id="exercise-category"
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-border rounded bg-background text-foreground focus:border-primary"
                  placeholder="e.g., Compound, Isolation, Accessory"
                />
              </div>

              {/* Aliases - Hidden (Admin only) */}
              {/* <div>
                <label htmlFor="exercise-aliases" className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Aliases
                </label>
                <TagInput
                  value={formData.aliases}
                  onChange={(aliases) => setFormData({ ...formData, aliases })}
                  placeholder="Type alias and press Enter..."
                  maxTags={10}
                  maxLength={50}
                  error={errors.aliases}
                />
                <p className="text-xs text-muted-foreground mt-1">Alternative names for this exercise</p>
              </div> */}

              {/* Equipment */}
              <div>
                <label className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Equipment *
                </label>
                <EquipmentSelector
                  value={formData.equipment}
                  onChange={(equipment) => setFormData({ ...formData, equipment })}
                  error={errors.equipment}
                />
              </div>

              {/* Primary FAUs */}
              <div>
                <label className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Primary Muscle Groups *
                </label>
                <FAUSelector
                  value={formData.primaryFAUs}
                  onChange={(primaryFAUs) => setFormData({ ...formData, primaryFAUs })}
                  variant="primary"
                  error={errors.primaryFAUs}
                />
              </div>

              {/* Secondary FAUs */}
              <div>
                <label className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Secondary Muscle Groups
                </label>
                <FAUSelector
                  value={formData.secondaryFAUs}
                  onChange={(secondaryFAUs) => setFormData({ ...formData, secondaryFAUs })}
                  variant="secondary"
                  excludeFAUs={formData.primaryFAUs}
                  error={errors.secondaryFAUs}
                />
              </div>

              {/* Instructions */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="exercise-instructions" className="block text-sm font-semibold text-foreground uppercase tracking-wide">
                    Instructions
                  </label>
                  <span className="text-xs text-muted-foreground">{formData.instructions.length} / 2000</span>
                </div>
                <textarea
                  id="exercise-instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  maxLength={2000}
                  rows={4}
                  className={`w-full px-3 py-2 border-2 rounded bg-background text-foreground ${
                    errors.instructions ? 'border-error' : 'border-border focus:border-primary'
                  }`}
                  placeholder="How to perform this exercise..."
                />
                {errors.instructions && <p className="text-sm text-error font-medium mt-1">{errors.instructions}</p>}
              </div>

              {/* Notes */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="exercise-notes" className="block text-sm font-semibold text-foreground uppercase tracking-wide">
                    Notes
                  </label>
                  <span className="text-xs text-muted-foreground">{formData.notes.length} / 1000</span>
                </div>
                <textarea
                  id="exercise-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  maxLength={1000}
                  rows={3}
                  className={`w-full px-3 py-2 border-2 rounded bg-background text-foreground ${
                    errors.notes ? 'border-error' : 'border-border focus:border-primary'
                  }`}
                  placeholder="Additional notes or tips..."
                />
                {errors.notes && <p className="text-sm text-error font-medium mt-1">{errors.notes}</p>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t-2 border-border bg-muted/30">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting} doom>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            loading={isSubmitting}
            doom
          >
            {mode === 'create' ? 'Create Exercise' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
