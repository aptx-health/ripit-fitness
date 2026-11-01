import SaveButton from './SaveButton'

/**
 * Keeps Save in reach on a long sub-page: while there are unsaved changes, a
 * bar sticks to the bottom of the app's scroll container, just above the
 * mobile bottom nav (at the bottom of the window on desktop). Put it last in
 * the page's content. The sticky offset counts from inside #app-scroll's 5rem
 * bottom padding, so -1rem (plus the safe area the nav also adds) lands it
 * about 4px above the 3.75rem nav.
 */
export default function UnsavedChangesBar({
  dirty,
  saving,
  onSave,
}: {
  dirty: boolean
  saving: boolean
  onSave: () => void
}) {
  if (!dirty) return null
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)-1rem)] z-20 mt-6 flex items-center justify-between gap-3 border-2 border-primary bg-card px-4 py-2 shadow-lg md:bottom-4"
    >
      <p className="text-sm font-bold uppercase tracking-wider text-foreground">Unsaved changes</p>
      <SaveButton dirty saving={saving} onClick={onSave} />
    </div>
  )
}
