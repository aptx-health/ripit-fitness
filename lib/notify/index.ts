import { logger } from '@/lib/logger'
import { type Notify, notify as sendToBark } from './bark'
import { sendProposalToDiscord } from './discord'

export type { Notify, NotifyPayload } from './bark'

const CHANNELS: Array<{ name: string; send: Notify }> = [
  { name: 'discord', send: (payload) => sendProposalToDiscord(payload) },
  { name: 'bark', send: sendToBark },
]

/**
 * Send a proposal notification to every channel in parallel. Each channel
 * skips itself when unconfigured; one channel failing never affects another.
 */
export const notify: Notify = async (payload) => {
  const results = await Promise.allSettled(CHANNELS.map((c) => c.send(payload)))
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      logger.warn({ error: r.reason, channel: CHANNELS[i].name, proposalId: payload.proposalId }, 'Notification channel failed')
    }
  })
}
