import { logger } from '@/lib/logger'

type DiscordEmbed = {
  title: string
  description: string
  color?: number
  fields?: Array<{ name: string; value: string; inline?: boolean }>
  timestamp?: string
}

export function sendDiscordNotification(embed: DiscordEmbed): void {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    logger.warn('DISCORD_WEBHOOK_URL not set, skipping notification')
    return
  }

  // Fire and forget — don't block the caller
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{ ...embed, timestamp: embed.timestamp ?? new Date().toISOString() }],
    }),
  }).catch((error) => {
    logger.error({ error }, 'Failed to send Discord notification')
  })
}
