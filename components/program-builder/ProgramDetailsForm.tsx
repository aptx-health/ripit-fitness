import { Button } from '@/components/ui/Button'

type ProgramDetailsFormProps = {
  editMode: boolean
  programId: string | null
  programName: string
  setProgramName: (name: string) => void
  programDescription: string
  setProgramDescription: (desc: string) => void
  isLoading: boolean
  createProgram: () => void
  handleDuplicateProgram: () => void
}

export default function ProgramDetailsForm({
  editMode,
  programId,
  programName,
  setProgramName,
  programDescription,
  setProgramDescription,
  isLoading,
  createProgram,
  handleDuplicateProgram,
}: ProgramDetailsFormProps) {
  return (
    <div className="bg-card p-6 mb-6 doom-noise doom-card">
      <h2 className="text-xl font-semibold text-foreground mb-4 doom-heading">
        {editMode ? 'EDIT PROGRAM DETAILS' : 'PROGRAM DETAILS'}
      </h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="programName" className="block text-sm font-medium text-foreground mb-1 doom-label">
            PROGRAM NAME *
          </label>
          <input
            id="programName"
            type="text"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder="Enter program name"
            className="w-full doom-input"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="programDescription" className="block text-sm font-medium text-foreground mb-1 doom-label">
            DESCRIPTION (OPTIONAL)
          </label>
          <textarea
            id="programDescription"
            value={programDescription}
            onChange={(e) => setProgramDescription(e.target.value)}
            placeholder="Describe your program goals and approach"
            rows={3}
            className="w-full doom-input"
            disabled={isLoading}
          />
        </div>

        <div className="text-sm text-muted-foreground">
          <strong>Type:</strong> Strength Training
        </div>

        {!editMode && !programId && (
          <Button
            type="button"
            variant="primary"
            doom
            onClick={createProgram}
            disabled={isLoading || !programName.trim()}
            className="uppercase tracking-wider"
          >
            {isLoading ? 'CREATING...' : 'CREATE PROGRAM'}
          </Button>
        )}
        {editMode && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Program changes are saved automatically
            </div>
            <Button
              type="button"
              variant="secondary"
              doom
              onClick={handleDuplicateProgram}
              disabled={isLoading}
              className="uppercase tracking-wider"
            >
              {isLoading ? 'DUPLICATING...' : 'DUPLICATE PROGRAM'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
