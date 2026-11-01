'use client'

import Link from 'next/link'
import { type KeyboardEvent, type ReactNode, useRef } from 'react'

/**
 * Paper tabs: the folder-style tab strip from the Training home, for any page.
 * Controlled: the page owns `value` and is told about clicks and arrow keys
 * through `onChange`, so it can keep the tab in its state or the URL. A tablist
 * like SegmentedControl's (arrow keys, Home and End, roving tabIndex). The page
 * renders the panels, with ids `${idPrefix}-panel-${id}`.
 *
 * An optional link tab ("All suggestions") sits after the tabs: a link, not a
 * tab, so it stays out of the arrow-key order.
 */

/**
 * Keyboard focus for a paper tab. The clip-path cuts off any ring drawn outside
 * the tab (doom-focus-ring, the themes' *:focus-visible outline), so the ring is
 * drawn inside: a background line, then a foreground line, which shows on every
 * tab fill (gold, green, brown, tan). Important (!) so it beats the unlayered
 * theme rule `[data-theme="ripit"] *:focus-visible`.
 */
export const PAPER_TAB_FOCUS =
  'focus-visible:outline-none! focus-visible:shadow-[inset_0_0_0_2px_var(--background),inset_0_0_0_4px_var(--foreground)]!'

/** The slanted right edge of every paper tab. */
export const PAPER_TAB_CLIP = { clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%)' }

/** A link tucked beside the tabs as a dimmed second tab: dimmed primary, foreground text so it reads in every theme. */
export const PAPER_LINK_TAB = `-ml-2.5 inline-flex items-center pl-4 pr-5 pt-1.5 pb-1.5 rounded-tl bg-primary/25 text-foreground hover:bg-primary/35 ${PAPER_TAB_FOCUS} text-[13px] font-bold uppercase tracking-wider whitespace-nowrap`

export type PaperTabTone = 'mine' | 'next' | 'coach'

export interface PaperTab {
  id: string
  label: string
  icon?: ReactNode
  count?: number
  /**
   * Accessible label for the count chip, e.g. "2 pinned workouts". Without
   * one the chip is decoration only, so the tab's name stays its label.
   */
  countLabel?: string
}

const SELECTED: Record<PaperTabTone, string> = {
  mine: 'bg-secondary text-secondary-foreground',
  next: 'bg-primary text-primary-foreground',
  coach: 'bg-accent text-accent-foreground',
}
const SELECTED_CHIP: Record<PaperTabTone, string> = {
  mine: 'bg-secondary-foreground text-secondary',
  next: 'bg-primary-foreground text-primary',
  coach: 'bg-accent-foreground text-accent',
}

export default function PaperTabs({
  name,
  idPrefix,
  tone,
  tabs,
  value,
  onChange,
  linkTab,
}: {
  /** The tablist's accessible name. */
  name: string
  idPrefix: string
  tone: PaperTabTone
  tabs: PaperTab[]
  /** The selected tab's id. */
  value: string
  onChange: (id: string) => void
  /** `ariaLabel` names where it goes, e.g. "See all suggestions". */
  linkTab?: { href: string; label: string; ariaLabel?: string }
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  // With no tab matching `value`, the first stays reachable by Tab.
  const focusable = tabs.some((tab) => tab.id === value) ? value : tabs[0]?.id

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? index === last ? 0 : index + 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? index === 0 ? last : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    buttons.current[next]?.focus()
    onChange(tabs[next].id)
  }

  const tablist = (
    <div role="tablist" aria-label={name} className="flex items-end">
      {tabs.map((tab, index) => {
        const isSelected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttons.current[index] = el
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={isSelected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={tab.id === focusable ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`relative inline-flex items-center gap-1.5 whitespace-nowrap pl-3 pr-5 pb-1.5 rounded-tl font-bold uppercase tracking-wider ${PAPER_TAB_FOCUS} ${
              index > 0 ? '-ml-2.5' : ''
            } ${
              isSelected
                ? `z-10 pt-2 text-sm ${SELECTED[tone]}`
                : 'pt-1.5 text-[13px] bg-muted text-muted-foreground shadow-[inset_0_1px_0_var(--border)] hover:text-foreground'
            }`}
            style={PAPER_TAB_CLIP}
          >
            {tab.icon}
            {/* The space keeps "Pinned Workouts" and the chip's label apart in the tab's name. */}
            {tab.label}{' '}
            {tab.count !== undefined && (
              <span
                {...(tab.countLabel ? { role: 'img', 'aria-label': tab.countLabel } : { 'aria-hidden': true })}
                className={`px-1.5 text-xs leading-5 ${isSelected ? SELECTED_CHIP[tone] : 'bg-border text-foreground'}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  if (!linkTab) return tablist

  // The link sits beside the tablist, not in it: a tablist holds only tabs.
  return (
    <div className="flex items-end">
      {tablist}
      <Link href={linkTab.href} aria-label={linkTab.ariaLabel} className={PAPER_LINK_TAB} style={PAPER_TAB_CLIP}>
        {linkTab.label}
      </Link>
    </div>
  )
}
