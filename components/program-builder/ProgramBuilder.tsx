'use client'

import { useState } from 'react'
import { useExerciseActions } from '@/hooks/useExerciseActions'
import { useProgramActions } from '@/hooks/useProgramActions'
import { useProgramWeekState } from '@/hooks/useProgramWeekState'
import { useWorkoutActionModals } from '@/hooks/useWorkoutActionModals'
import { useWorkoutActions } from '@/hooks/useWorkoutActions'
import type { ProgramBuilderProps } from '@/types/program-builder'
import ExerciseSearchModal from '../ExerciseSearchModal'
import FAUVolumeVisualization from '../FAUVolumeVisualization'
import StrengthActivationModal from '../StrengthActivationModal'
import TransformWeekModal from '../TransformWeekModal'
import DuplicateWorkoutModal from './DuplicateWorkoutModal'
import MoveWorkoutModal from './MoveWorkoutModal'
import ProgramDetailsForm from './ProgramDetailsForm'
import WeekCard from './WeekCard'
import WeekNavigation from './WeekNavigation'

export default function ProgramBuilder({ editMode = false, existingProgram, onComplete }: ProgramBuilderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [programId, setProgramId] = useState<string | null>(
    editMode && existingProgram ? existingProgram.id : null
  )

  const weekState = useProgramWeekState({
    editMode,
    existingProgram,
    programId,
    setIsLoading,
    setError,
  })

  const programActions = useProgramActions({
    editMode,
    existingProgramId: existingProgram?.id,
    existingProgramName: existingProgram?.name,
    existingProgramDescription: existingProgram?.description || undefined,
    weeksCache: weekState.weeksCache,
    weeks: weekState.weeks,
    programId,
    setProgramId,
    setWeeks: weekState.setWeeks,
    setIsLoading,
    setError,
    onComplete,
  })

  const workoutActions = useWorkoutActions({
    editMode,
    setWeeksCache: weekState.setWeeksCache,
    setWeeks: weekState.setWeeks,
    updateWeekData: weekState.updateWeekData,
    setIsLoading,
    setError,
  })

  const exerciseActions = useExerciseActions({
    editMode,
    weeksCache: weekState.weeksCache,
    weeks: weekState.weeks,
    setWeeksCache: weekState.setWeeksCache,
    setWeeks: weekState.setWeeks,
    updateWeekData: weekState.updateWeekData,
    setIsLoading,
    setError,
  })

  const workoutModals = useWorkoutActionModals({
    editMode,
    weeksSummary: weekState.weeksSummary,
    setWeeksCache: weekState.setWeeksCache,
    setWeeks: weekState.setWeeks,
    setIsLoading,
    setError,
  })

  const weeksList = editMode ? weekState.weeksSummary : weekState.weeks
  const totalWeeks = weeksList.length
  const currentWeekNumber = weeksList[weekState.currentWeekIndex]?.weekNumber
  const currentWeekData = editMode
    ? (currentWeekNumber ? weekState.weeksCache.get(currentWeekNumber) : null)
    : weekState.weeks[weekState.currentWeekIndex]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <ProgramDetailsForm
          editMode={editMode}
          programId={programId}
          programName={programActions.programName}
          setProgramName={programActions.setProgramName}
          programDescription={programActions.programDescription}
          setProgramDescription={programActions.setProgramDescription}
          isLoading={isLoading}
          createProgram={programActions.createProgram}
          handleDuplicateProgram={programActions.handleDuplicateProgram}
        />

        {error && (
          <div className="bg-error-muted border border-error-border rounded-lg p-4 mb-6">
            <div className="text-error">{error}</div>
          </div>
        )}

        {(programId || editMode) && (
          <div className="bg-card p-3 sm:p-6 doom-noise doom-card">
            <h2 className="text-xl font-semibold text-foreground mb-4 doom-heading">TRAINING WEEKS</h2>

            {totalWeeks === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No weeks created yet</p>
                <button type="button"
                  onClick={() => weekState.addWeek()}
                  disabled={isLoading}
                  className="px-4 py-2 bg-success text-success-foreground hover:bg-success-hover disabled:opacity-50 doom-button-3d font-semibold uppercase tracking-wider"
                >
                  ADD WEEK 1
                </button>
              </div>
            ) : (
              <div className="space-y-6 overflow-visible">
                <WeekNavigation
                  currentWeekIndex={weekState.currentWeekIndex}
                  totalWeeks={totalWeeks}
                  isLoadingWeek={weekState.isLoadingWeek}
                  navigateToWeek={weekState.navigateToWeek}
                />

                {currentWeekData && (
                  <WeekCard
                    key={currentWeekData.id}
                    week={currentWeekData}
                    isLoading={isLoading}
                    deletingWeekId={weekState.deletingWeekId}
                    duplicatingWeekId={weekState.duplicatingWeekId}
                    collapsedWorkouts={weekState.collapsedWorkouts}
                    editingWorkoutId={workoutActions.editingWorkoutId}
                    editingWorkoutName={workoutActions.editingWorkoutName}
                    deletingWorkoutId={workoutActions.deletingWorkoutId}
                    deletingExerciseId={exerciseActions.deletingExerciseId}
                    editingWeekNameId={weekState.editingWeekNameId}
                    editingWeekName={weekState.editingWeekName}
                    editingWeekDescription={weekState.editingWeekDescription}
                    onStartWeekNameEdit={weekState.handleStartWeekNameEdit}
                    onCancelWeekNameEdit={weekState.handleCancelWeekNameEdit}
                    onSaveWeekName={weekState.handleSaveWeekName}
                    onSetEditingWeekName={weekState.setEditingWeekName}
                    onSetEditingWeekDescription={weekState.setEditingWeekDescription}
                    onDuplicateWeek={weekState.handleDuplicateWeek}
                    onDeleteWeek={weekState.handleDeleteWeek}
                    onOpenTransformModal={weekState.handleOpenTransformModal}
                    onAddWorkout={workoutActions.addWorkout}
                    onToggleCollapse={weekState.toggleWorkoutCollapse}
                    onStartWorkoutEdit={workoutActions.handleStartWorkoutEdit}
                    onCancelWorkoutEdit={workoutActions.handleCancelWorkoutEdit}
                    onSaveWorkoutName={workoutActions.handleSaveWorkoutName}
                    onSetEditingWorkoutName={workoutActions.setEditingWorkoutName}
                    onDeleteWorkout={workoutActions.handleDeleteWorkout}
                    onOpenDuplicateModal={(w) => {
                      workoutModals.setSelectedWorkoutForAction(w)
                      workoutModals.setShowDuplicateWorkoutModal(true)
                    }}
                    onOpenSwapModal={(w) => {
                      workoutModals.setSelectedWorkoutForAction(w)
                      workoutModals.setShowSwapWorkoutModal(true)
                    }}
                    onAddExercise={exerciseActions.handleAddExercise}
                    onEditExercise={exerciseActions.handleEditExercise}
                    onDeleteExercise={exerciseActions.handleDeleteExercise}
                    onReorderExercises={exerciseActions.handleReorderExercises}
                  />
                )}

                <button type="button"
                  onClick={() => weekState.addWeek()}
                  disabled={isLoading}
                  className="px-4 py-2 bg-success text-success-foreground hover:bg-success-hover disabled:opacity-50 doom-button-3d font-semibold uppercase tracking-wider"
                >
                  ADD WEEK {totalWeeks + 1}
                </button>
              </div>
            )}

            {totalWeeks > 0 && (
              <div className="mt-6 pt-6 border-t">
                <button type="button"
                  onClick={programActions.handleComplete}
                  className="px-6 py-2 bg-success text-success-foreground hover:bg-success-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
                >
                  {editMode ? 'DONE EDITING' : 'COMPLETE & VIEW PROGRAM'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <FAUVolumeVisualization week={weekState.getCurrentWeekData()} />
      </div>

      <ExerciseSearchModal
        isOpen={exerciseActions.showExerciseModal}
        onClose={exerciseActions.closeExerciseModal}
        onExerciseSelect={exerciseActions.handleExerciseSelect}
        editingExercise={exerciseActions.editingExercise}
      />

      <TransformWeekModal
        isOpen={weekState.showTransformModal}
        onClose={() => weekState.setShowTransformModal(false)}
        weekId={weekState.transformWeekId || ''}
        weekNumber={weekState.transformWeekNumber}
        onTransform={weekState.handleTransformWeek}
      />

      {workoutModals.showDuplicateWorkoutModal && workoutModals.selectedWorkoutForAction && (
        <DuplicateWorkoutModal
          workoutName={workoutModals.selectedWorkoutForAction.name}
          weeksList={weeksList}
          targetWeek={workoutModals.targetWeekForDuplicate}
          setTargetWeek={workoutModals.setTargetWeekForDuplicate}
          isLoading={isLoading}
          onDuplicate={workoutModals.handleDuplicateWorkout}
          onClose={() => {
            workoutModals.setShowDuplicateWorkoutModal(false)
            workoutModals.setSelectedWorkoutForAction(null)
            workoutModals.setTargetWeekForDuplicate('')
          }}
        />
      )}

      {workoutModals.showSwapWorkoutModal && workoutModals.selectedWorkoutForAction && (
        <MoveWorkoutModal
          workoutName={workoutModals.selectedWorkoutForAction.name}
          weeksList={weeksList}
          targetWeek={workoutModals.targetWeekForSwap}
          setTargetWeek={workoutModals.setTargetWeekForSwap}
          isLoading={isLoading}
          onMove={workoutModals.handleSwapWorkout}
          onClose={() => {
            workoutModals.setShowSwapWorkoutModal(false)
            workoutModals.setSelectedWorkoutForAction(null)
            workoutModals.setTargetWeekForSwap('')
          }}
        />
      )}

      {programActions.showActivationModal && programId && (
        <StrengthActivationModal
          programId={programId}
          existingActiveProgram={programActions.existingActiveProgram}
          onClose={() => programActions.setShowActivationModal(false)}
        />
      )}
    </div>
  )
}
