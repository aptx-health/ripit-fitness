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
          <button type="button"
            onClick={createProgram}
            disabled={isLoading || !programName.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
          >
            {isLoading ? 'CREATING...' : 'CREATE PROGRAM'}
          </button>
        )}
        {editMode && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Program changes are saved automatically
            </div>
            <button type="button"
              onClick={handleDuplicateProgram}
              disabled={isLoading}
              className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary-hover disabled:opacity-50 doom-button-3d font-semibold uppercase tracking-wider"
            >
              {isLoading ? 'DUPLICATING...' : 'DUPLICATE PROGRAM'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
