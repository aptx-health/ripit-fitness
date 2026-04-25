'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/Button';
import { clientLogger } from '@/lib/client-logger';
import EquipmentSelector from './EquipmentSelector';
import ExerciseInfoPreview from './ExerciseInfoPreview';
import FAUSelector from './FAUSelector';

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
  imageUrls?: string[];
}

export interface ExerciseDefinitionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  exerciseId?: string;
  initialName?: string;
  onSuccess?: (exerciseDefinition: ExerciseDefinition) => void;
  apiBasePath?: string;
}

export default function ExerciseDefinitionEditorModal({
  isOpen,
  onClose,
  mode,
  exerciseId,
  initialName = '',
  onSuccess,
  apiBasePath = '/api/exercise-definitions',
}: ExerciseDefinitionEditorModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [formData, setFormData] = useState({
    name: initialName,
    equipment: [] as string[],
    primaryFAUs: [] as string[],
    secondaryFAUs: [] as string[],
    category: '',
    aliases: [] as string[],
    instructions: '',
    notes: '',
    imageUrls: [] as string[],
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
      fetch(`${apiBasePath}/${exerciseId}`)
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
              imageUrls: exercise.imageUrls || [],
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
        imageUrls: [],
      });
      setUsageCount(0);
    }
    setActiveTab('edit');
  }, [isOpen, mode, exerciseId, initialName, apiBasePath]);

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
          ? apiBasePath
          : `${apiBasePath}/${exerciseId}`;

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
          imageUrls: formData.imageUrls,
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

      const action = mode === 'create' ? 'Created' : 'Updated';
      toast.success(
        `${action}: ${data.data?.name || formData.name}`,
        data.data?.id ? `ID: ${data.data.id}` : undefined
      );

      onClose();
    } catch (error) {
      clientLogger.error('Error saving exercise:', error);
      alert('An error occurred while saving the exercise');
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, exerciseId, formData, onSuccess, onClose, apiBasePath, toast]);

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
      imageUrls: [],
    });
    setErrors({});
    setIsDuplicateName(false);
    setUsageCount(0);
    setActiveTab('edit');
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
      style={{ position: 'fixed', inset: 0, zIndex: 80, pointerEvents: 'auto' }}
      className="backdrop-blur-md bg-background/80 flex items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)', position: 'relative', zIndex: 81 }}
        className="bg-card border-4 border-border w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-[90vw] sm:max-w-4xl sm:my-8 flex flex-col doom-card"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-border bg-primary text-primary-foreground">
          <h2 className="text-xl font-bold tracking-wide uppercase">
            {mode === 'create' ? 'Create New Exercise' : 'Edit Exercise'}
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b-2 border-border">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex-1 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeTab === 'edit'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeTab === 'preview'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : activeTab === 'preview' ? (
            <ExerciseInfoPreview
              imageUrls={formData.imageUrls}
              instructions={formData.instructions}
              primaryFAUs={formData.primaryFAUs}
              secondaryFAUs={formData.secondaryFAUs}
              equipment={formData.equipment}
            />
          ) : (
            <>
              {/* Usage Warning */}
              {mode === 'edit' && usageCount > 0 && (
                <div className="bg-warning-muted border-2 border-warning-border rounded p-4">
                  <p className="text-sm text-warning-text font-medium">
                    ⚠️ This exercise is used {usageCount} time
                    {usageCount > 1 ? 's' : ''} in this program. Changes will affect future sessions.
                  </p>
                </div>
              )}

              {/* Duplicate Warning */}
              {isDuplicateName && (
                <div className="bg-error-muted border-2 border-error-border rounded p-3">
                  <p className="text-sm text-error-text font-medium">
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
                <span className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Equipment *
                </span>
                <EquipmentSelector
                  value={formData.equipment}
                  onChange={(equipment) => setFormData({ ...formData, equipment })}
                  error={errors.equipment}
                />
              </div>

              {/* Primary FAUs */}
              <div>
                <span className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Primary Muscle Groups *
                </span>
                <FAUSelector
                  value={formData.primaryFAUs}
                  onChange={(primaryFAUs) => setFormData({ ...formData, primaryFAUs })}
                  variant="primary"
                  error={errors.primaryFAUs}
                />
              </div>

              {/* Secondary FAUs */}
              <div>
                <span className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Secondary Muscle Groups
                </span>
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
                  <span className="text-xs text-muted-foreground">{formData.instructions.length} / 1000</span>
                </div>
                <textarea
                  id="exercise-instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  maxLength={1000}
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
                  <span className="text-xs text-muted-foreground">{formData.notes.length} / 400</span>
                </div>
                <textarea
                  id="exercise-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  maxLength={400}
                  rows={3}
                  className={`w-full px-3 py-2 border-2 rounded bg-background text-foreground ${
                    errors.notes ? 'border-error' : 'border-border focus:border-primary'
                  }`}
                  placeholder="Additional notes or tips..."
                />
                {errors.notes && <p className="text-sm text-error font-medium mt-1">{errors.notes}</p>}
              </div>

              {/* Image URLs */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="block text-sm font-semibold text-foreground uppercase tracking-wide">
                    Image URLs
                  </span>
                  <span className="text-xs text-muted-foreground">{formData.imageUrls.length} / 10</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Add image URLs for this exercise. Order determines display order in the Info tab.
                </p>

                {formData.imageUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          const urls = [...formData.imageUrls];
                          [urls[index - 1], urls[index]] = [urls[index], urls[index - 1]];
                          setFormData({ ...formData, imageUrls: urls });
                        }}
                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label={`Move image ${index + 1} up`}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === formData.imageUrls.length - 1}
                        onClick={() => {
                          const urls = [...formData.imageUrls];
                          [urls[index], urls[index + 1]] = [urls[index + 1], urls[index]];
                          setFormData({ ...formData, imageUrls: urls });
                        }}
                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label={`Move image ${index + 1} down`}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const urls = [...formData.imageUrls];
                        urls[index] = e.target.value;
                        setFormData({ ...formData, imageUrls: urls });
                      }}
                      className="flex-1 px-3 py-2 border-2 border-border rounded bg-background text-foreground text-sm focus:border-primary"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const urls = formData.imageUrls.filter((_, i) => i !== index);
                        setFormData({ ...formData, imageUrls: urls });
                      }}
                      className="p-1.5 text-muted-foreground hover:text-error transition-colors"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {formData.imageUrls.length < 10 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, imageUrls: [...formData.imageUrls, ''] });
                    }}
                    className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium mt-1"
                  >
                    <Plus size={16} />
                    Add Image URL
                  </button>
                )}
                {errors.imageUrls && <p className="text-sm text-error font-medium mt-1">{errors.imageUrls}</p>}
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
