import { logger } from '@/lib/logger'
import { clean } from './text'

export interface NotifyPayload {
  proposalId: string
  title: string
  body: string
  url: string
}

export type Notify = (payload: NotifyPayload) => Promise<void>

const MAX_TITLE = 80
const MAX_BODY = 300
const TIMEOUT_MS = 5000

/**
 * Send a Bark push (https://bark.day.app). BARK_URL is the device URL,
 * e.g. https://api.day.app/<device-key>. Unset BARK_URL skips the push.
 * Errors are logged and never thrown.
 */
export const notify: Notify = async (payload) => {
  const barkUrl = process.env.BARK_URL
  if (!barkUrl) {
    logger.debug({ proposalId: payload.proposalId }, 'BARK_URL not set, skipping notification')
    return
  }

  try {
    const res = await fetch(barkUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        title: clean(payload.title, MAX_TITLE),
        body: clean(payload.body, MAX_BODY),
        url: payload.url,
        group: 'ripit-proposals',
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      logger.warn({ proposalId: payload.proposalId, status: res.status }, 'Bark notification rejected')
      return
    }
    logger.debug({ proposalId: payload.proposalId }, 'Bark notification sent')
  } catch (error) {
    logger.warn({ error, proposalId: payload.proposalId }, 'Bark notification failed')
  }
}
