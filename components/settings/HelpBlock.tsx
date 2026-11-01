'use client'

import { ChevronRight, Heart, LifeBuoy, MessageSquarePlus } from 'lucide-react'
import { useState } from 'react'
import FeedbackModal from '@/components/features/FeedbackModal'
import { ROW, ROW_LABEL, RowIcon, SettingsBlock } from './SettingsBlock'

/** Help: send feedback, and support the app when a Venmo handle is set. */
export default function HelpBlock() {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const venmo = process.env.NEXT_PUBLIC_VENMO_HANDLE

  return (
    <>
      <SettingsBlock title="Help" icon={<LifeBuoy size={16} />}>
        <button type="button" onClick={() => setFeedbackOpen(true)} className={`${ROW} hover:bg-muted/50`}>
          <RowIcon>
            <MessageSquarePlus size={18} />
          </RowIcon>
          <span className={`${ROW_LABEL} flex-1`}>Send feedback</span>
          <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        </button>
        {venmo && (
          <a href={`https://venmo.com/${venmo}`} target="_blank" rel="noopener noreferrer" className={`${ROW} hover:bg-muted/50`}>
            <RowIcon>
              <Heart size={18} />
            </RowIcon>
            <span className={`${ROW_LABEL} flex-1`}>Support Ripit</span>
            <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
          </a>
        )}
      </SettingsBlock>
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  )
}
