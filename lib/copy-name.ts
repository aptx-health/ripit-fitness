/**
 * Generates a unique copy name by appending " (Copy)" or " (Copy N)"
 * Used for duplicating programs, workouts, etc.
 */
export function generateCopyName(originalName: string, existingNames: string[]): string {
  const baseName = originalName.replace(/\s*\(Copy\s*\d*\)$/, '').trim()

  // Try "Name (Copy)" first
  const candidateName = `${baseName} (Copy)`
  if (!existingNames.includes(candidateName)) {
    return candidateName
  }

  // Find the next available copy number
  let copyNumber = 2
  while (existingNames.includes(`${baseName} (Copy ${copyNumber})`)) {
    copyNumber++
  }

  return `${baseName} (Copy ${copyNumber})`
}
