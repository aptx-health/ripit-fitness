import { Loader2, Save } from 'lucide-react'

/**
 * A sub-page's Save, for SubpageHeader's action slot: a quiet outline button
 * that turns primary while there are unsaved changes.
 */
export default function SaveButton({ dirty, saving, onClick }: { dirty: boolean; saving: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      data-dirty={dirty}
      className={`inline-flex min-h-12 items-center justify-center gap-1.5 px-4 text-sm font-semibold uppercase tracking-wider doom-focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        dirty
          ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
          : 'border border-border text-foreground hover:bg-muted'
      }`}
    >
      {saving ? <Loader2 size={14} aria-hidden="true" className="animate-spin" /> : <Save size={14} aria-hidden="true" />}
      {saving ? 'Saving…' : 'Save'}
      {dirty && !saving && <span className="sr-only"> (unsaved changes)</span>}
    </button>
  )
}
