'use client'

import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { PAPER_TAB_FOCUS } from './SectionTab'

/**
 * A Training block with paper tabs that switch its content: a tablist like
 * SegmentedControl's (arrow keys, Home and End), with every panel rendered and
 * the unselected ones hidden, so switching needs no fetch.
 *
 * The choice is remembered per device in localStorage and read after mount,
 * so the server render and hydration agree. A remembered tab is only used when
 * it has content or the other tabs don't, so it never opens an empty panel
 * while another has something to show.
 */

export interface BlockTab {
  id: string
  label: string
  icon: ReactNode
  count?: number
  /** Accessible label for the count chip, e.g. "2 pinned workouts". */
  countLabel?: string
  hasContent: boolean
  panel: ReactNode
}

export type BlockTone = 'mine' | 'next'

const SELECTED: Record<BlockTone, string> = {
  mine: 'bg-secondary text-secondary-foreground',
  next: 'bg-primary text-primary-foreground',
}
const SELECTED_CHIP: Record<BlockTone, string> = {
  mine: 'bg-secondary-foreground text-secondary',
  next: 'bg-primary-foreground text-primary',
}
const BOX: Record<BlockTone, string> = {
  mine: 'border-2 border-secondary bg-card',
  next: 'border-2 border-primary bg-card',
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Private mode or blocked storage: the choice just isn't remembered.
  }
}

export default function TabbedBlock({
  name,
  idPrefix,
  storageKey,
  tone,
  tabs,
  defaultTab,
}: {
  /** The block's region name, e.g. "Workouts". */
  name: string
  idPrefix: string
  storageKey: string
  tone: BlockTone
  tabs: BlockTab[]
  defaultTab: string
}) {
  const [selected, setSelected] = useState(defaultTab)
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  // After mount: a remembered tab, unless it is empty while another has content.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    const stored = readStored(storageKey)
    const tab = tabs.find((t) => t.id === stored)
    if (!tab) return
    const otherHasContent = tabs.some((t) => t.id !== tab.id && t.hasContent)
    if (tab.hasContent || !otherHasContent) setSelected(tab.id)
    // Only on mount: later changes come from the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const choose = (id: string) => {
    setSelected(id)
    writeStored(storageKey, id)
  }

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
    choose(tabs[next].id)
  }

  return (
    <section aria-label={name}>
      <div role="tablist" className="flex items-end">
        {tabs.map((tab, index) => {
          const isSelected = tab.id === selected
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
              tabIndex={isSelected ? 0 : -1}
              onClick={() => choose(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`relative inline-flex items-center gap-1.5 whitespace-nowrap pl-3 pr-5 pb-1.5 rounded-tl font-bold uppercase tracking-wider ${PAPER_TAB_FOCUS} ${
                index > 0 ? '-ml-2.5' : ''
              } ${
                isSelected
                  ? `z-10 pt-2 text-sm ${SELECTED[tone]}`
                  : 'pt-1.5 text-[13px] bg-muted text-muted-foreground shadow-[inset_0_1px_0_var(--border)] hover:text-foreground'
              }`}
              style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%)' }}
            >
              {tab.icon}
              {/* The space keeps "Pinned Workouts" and the chip's label apart in the tab's name. */}
              {tab.label}{' '}
              {tab.count !== undefined && (
                <span
                  role="img"
                  aria-label={tab.countLabel}
                  className={`px-1.5 text-xs leading-5 ${isSelected ? SELECTED_CHIP[tone] : 'bg-border text-foreground'}`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${idPrefix}-panel-${tab.id}`}
          aria-labelledby={`${idPrefix}-tab-${tab.id}`}
          hidden={tab.id !== selected}
          className={BOX[tone]}
        >
          {tab.panel}
        </div>
      ))}
    </section>
  )
}
