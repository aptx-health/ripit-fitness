import type { CSSProperties } from 'react'

/**
 * The panel a Library row opens into (My Programs, Workouts): a tinted strip
 * under the row with large buttons that wrap. Spread a button's props onto a
 * <button> or <Link>: `<button {...panelButton('primary')}>`.
 */
export const ROW_PANEL = 'px-4 pb-4 border-t border-border/50 bg-muted/20'
export const ROW_PANEL_BUTTONS = 'flex flex-wrap gap-2 pt-2'

export type PanelTone = 'primary' | 'default' | 'danger'

const BASE = 'flex min-h-12 items-center gap-1.5 px-3 py-2 text-sm font-semibold uppercase tracking-wider doom-focus-ring'
const TONE: Record<PanelTone, string> = {
  primary: 'bg-primary text-primary-foreground disabled:opacity-50',
  default: 'border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50',
  danger: 'border border-error/50 text-error hover:bg-error/10 transition-colors disabled:opacity-50',
}
const SHADOW: Record<PanelTone, CSSProperties> = {
  primary: { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)' },
  default: { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.20), 0 1px 0 rgba(0,0,0,0.30)' },
  danger: { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.20), 0 1px 0 rgba(0,0,0,0.30)' },
}

export function panelButton(tone: PanelTone = 'default'): { className: string; style: CSSProperties } {
  return { className: `${BASE} ${TONE[tone]}`, style: SHADOW[tone] }
}
