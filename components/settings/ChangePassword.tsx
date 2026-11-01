'use client'

import { ChevronDown, ChevronRight, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { ROW, ROW_LABEL, RowIcon } from './SettingsBlock'

const FIELD =
  'w-full min-h-12 px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
const FIELD_LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground'

/** Change password: a row that opens the form, which signs other sessions out on success. */
export default function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const submit = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setIsChangingPassword(true)
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
      if (result.error) {
        setPasswordError(result.error.message || 'Failed to change password')
      } else {
        setPasswordSuccess(true)
        setOpen(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open)
          setPasswordError(null)
          setPasswordSuccess(false)
        }}
        className={`${ROW} hover:bg-muted/50`}
      >
        <RowIcon>
          <KeyRound size={18} />
        </RowIcon>
        <span className={`${ROW_LABEL} flex-1`}>Change password</span>
        {open ? (
          <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          <div>
            <label htmlFor="currentPassword" className={FIELD_LABEL}>
              Current Password
            </label>
            <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={FIELD} />
          </div>
          <div>
            <label htmlFor="newPassword" className={FIELD_LABEL}>
              New Password
            </label>
            <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={FIELD} />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className={FIELD_LABEL}>
              Confirm New Password
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className={FIELD}
            />
          </div>

          {passwordError && (
            <p role="alert" className="text-sm text-error">
              {passwordError}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
            className="inline-flex min-h-12 w-full items-center justify-center bg-primary px-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary-hover doom-focus-ring disabled:cursor-not-allowed disabled:opacity-50 md:w-auto md:min-w-[200px]"
          >
            {isChangingPassword ? 'Changing...' : 'Update Password'}
          </button>
        </div>
      )}

      {passwordSuccess && (
        <p role="status" className="px-4 pb-3 text-sm text-success">
          Password changed successfully
        </p>
      )}
    </div>
  )
}

