'use client'

import { type ReactNode, useEffect, useState } from 'react'
import PaperTabs, { type PaperTab } from '@/components/ui/PaperTabs'

/**
 * A Training block with paper tabs (PaperTabs) that switch its content, with
 * every panel rendered and the unselected ones hidden, so switching needs no
 * fetch.
 *
 * The choice is remembered per device in localStorage and read after mount,
 * so the server render and hydration agree. A remembered tab is only used when
 * it has content or the other tabs don't, so it never opens an empty panel
 * while another has something to show.
 */

export interface BlockTab extends PaperTab {
  icon: ReactNode
  hasContent: boolean
  panel: ReactNode
}

export type BlockTone = 'mine' | 'next'

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

  return (
    <section aria-label={name}>
      <PaperTabs
        name={name}
        idPrefix={idPrefix}
        tone={tone}
        tabs={tabs.map(({ id, label, icon, count, countLabel }) => ({ id, label, icon, count, countLabel }))}
        value={selected}
        onChange={choose}
      />
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
