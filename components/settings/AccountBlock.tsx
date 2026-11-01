'use client'

import { Link2, LogOut, Mail, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import ChangePassword from './ChangePassword'
import { OUTLINE_BUTTON, RowIcon, SettingsBlock } from './SettingsBlock'

const PROVIDER_LABELS: Record<string, string> = { google: 'Google' }

/**
 * Account: the email (from the server), the sign-in methods connected besides
 * the password, Change password, and one quiet Sign out at the end.
 */
export default function AccountBlock({ email }: { email: string }) {
  // null until loaded. The API leaves out the password ("credential") account
  // from `providers` and says whether there is one in `hasPassword`.
  const [providers, setProviders] = useState<string[] | null>(null)
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    fetch('/api/settings/connected-accounts')
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        return res.json()
      })
      .then((data) => {
        if (!Array.isArray(data.providers)) throw new Error('Unexpected response')
        setProviders(data.providers)
        if (typeof data.hasPassword === 'boolean') setHasPassword(data.hasPassword)
      })
      .catch((err) => {
        clientLogger.error('Failed to load connected accounts', err)
        setLoadFailed(true)
      })
  }, [])

  const methods = loadFailed
    ? "Couldn't load"
    : providers === null
      ? '…'
      : providers.length === 0
        ? hasPassword === false
          ? 'None'
          : 'None besides your password'
        : providers.map((p) => PROVIDER_LABELS[p] ?? p).join(', ')

  return (
    <SettingsBlock title="Account" icon={<UserRound size={16} />}>
      <div className="flex min-h-12 items-center gap-3 px-4 py-3">
        <RowIcon>
          <Mail size={18} />
        </RowIcon>
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{email}</span>
      </div>
      <div className="flex min-h-12 items-center gap-3 px-4 py-3">
        <RowIcon>
          <Link2 size={18} />
        </RowIcon>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-muted-foreground">Connected sign-in methods</span>
          <span className="block text-sm text-foreground">{methods}</span>
        </span>
      </div>
      {/* Without a password (Google only), there is nothing to change. */}
      {hasPassword !== false && <ChangePassword />}
      <form action="/api/auth/signout" method="POST" className="px-4 py-3">
        <button type="submit" className={OUTLINE_BUTTON}>
          <LogOut size={14} aria-hidden="true" />
          Sign out
        </button>
      </form>
    </SettingsBlock>
  )
}
