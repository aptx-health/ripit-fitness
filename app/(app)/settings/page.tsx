'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Heart, KeyRound, Lock, MessageSquarePlus, Moon, Palette, Save, Shield, Sun } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import FeedbackModal from '@/components/features/FeedbackModal'
import { useIntensityAccess } from '@/hooks/useIntensityAccess'
import { useThemePreference } from '@/hooks/useThemePreference'
import { useUserSettings } from '@/hooks/useUserSettings'
import { authClient, useSession } from '@/lib/auth-client'
import { THEME_LABELS, THEMES } from '@/lib/theme'

type ConnectedAccounts = {
  email: string
  providers: string[]
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const { settings, isLoading, updateSettings } = useUserSettings()
  const { preference, updateTheme } = useThemePreference()
  const { hasAccess: hasIntensityAccess } = useIntensityAccess()
  const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined
  const isAdmin = userRole === 'admin' || userRole === 'editor'
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')
  const [intensityEnabled, setIntensityEnabled] = useState(false)
  const [intensityRating, setIntensityRating] = useState<'rpe' | 'rir'>('rir')
  const [loggingMode, setLoggingMode] = useState<'full' | 'follow_along'>('full')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccounts | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    if (settings) {
      setWeightUnit(settings.defaultWeightUnit)
      setIntensityEnabled(settings.intensityEnabled)
      setIntensityRating(settings.defaultIntensityRating)
      setLoggingMode(settings.loggingMode || 'full')
    }
  }, [settings])

  useEffect(() => {
    fetch('/api/settings/connected-accounts')
      .then((res) => res.json())
      .then((data) => {
        if (data.email) setConnectedAccounts(data)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)

    try {
      await updateSettings({
        defaultWeightUnit: weightUnit,
        ...(isAdmin ? { intensityEnabled } : {}),
        ...(hasIntensityAccess ? { defaultIntensityRating: intensityRating } : {}),
        loggingMode,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty =
    settings &&
    (weightUnit !== settings.defaultWeightUnit ||
      (isAdmin && intensityEnabled !== settings.intensityEnabled) ||
      (hasIntensityAccess && intensityRating !== settings.defaultIntensityRating) ||
      loggingMode !== (settings.loggingMode || 'full'))

  return (
    <div className="bg-background px-4 sm:px-6 py-8">
      <div className="max-w-md md:max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold">Settings</h1>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Theme + Mode */}
            <div className="flex gap-2">
                {/* Theme selector — 2/3 */}
                <div className="flex-[2]">
                  <span className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Theme
                  </span>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        className="w-full px-4 py-2 border-2 border-border bg-muted text-foreground font-semibold uppercase tracking-wider transition-colors hover:border-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background flex items-center justify-center gap-2"
                      >
                        <Palette className="w-4 h-4" />
                        {preference ? THEME_LABELS[preference.themeName] : '...'}
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="bg-card border-2 border-primary shadow-lg z-50 min-w-[180px]"
                        sideOffset={5}
                        align="start"
                      >
                        {THEMES.map((themeName) => (
                          <DropdownMenu.Item
                            key={themeName}
                            onClick={() =>
                              preference &&
                              updateTheme({ ...preference, themeName })
                            }
                            className={`w-full px-4 py-2.5 text-left text-sm font-semibold uppercase tracking-wider transition-colors cursor-pointer outline-none ${
                              preference?.themeName === themeName
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            {THEME_LABELS[themeName]}
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>

                {/* Light/Dark toggle — 1/3 */}
                <div className="flex-1">
                  <span className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Mode
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      preference &&
                      updateTheme({
                        ...preference,
                        mode: preference.mode === 'dark' ? 'light' : 'dark',
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-border bg-muted text-foreground font-semibold uppercase tracking-wider transition-colors hover:border-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background flex items-center justify-center gap-2"
                  >
                    {preference?.mode === 'dark' ? (
                      <>
                        <Moon className="w-4 h-4" />
                        Dark
                      </>
                    ) : (
                      <>
                        <Sun className="w-4 h-4" />
                        Light
                      </>
                    )}
                  </button>
                </div>
            </div>

            {/* Weight Unit */}
            <div>
              <span
                id="weight-unit-label"
                className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider"
              >
                Default Weight Unit
              </span>
              <fieldset
                className="flex gap-2"
                aria-labelledby="weight-unit-label"
              >
                <button
                  type="button"
                  onClick={() => setWeightUnit('lbs')}
                  className={`flex-1 px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    weightUnit === 'lbs'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-foreground border-border hover:bg-secondary'
                  }`}
                >
                  LBS
                </button>
                <button
                  type="button"
                  onClick={() => setWeightUnit('kg')}
                  className={`flex-1 px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    weightUnit === 'kg'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-foreground border-border hover:bg-secondary'
                  }`}
                >
                  KG
                </button>
              </fieldset>
            </div>

            {/* Intensity Tracking Toggle */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Intensity Tracking (RIR/RPE)
                  </span>
                  {!isAdmin && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Lock size={12} />
                      Premium Feature Coming Soon
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={intensityEnabled}
                  aria-label="Toggle intensity tracking"
                  disabled={!isAdmin}
                  onClick={() => setIntensityEnabled(!intensityEnabled)}
                  className={`relative inline-flex h-7 w-12 min-w-12 items-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    !isAdmin
                      ? 'border-border bg-muted cursor-not-allowed opacity-50'
                      : intensityEnabled
                        ? 'border-primary bg-primary'
                        : 'border-border bg-muted hover:border-primary'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full transition-transform ${
                      intensityEnabled
                        ? 'translate-x-[22px] bg-primary-foreground'
                        : 'translate-x-[2px] bg-muted-foreground'
                    }`}
                  />
                </button>
              </div>

              {/* RPE/RIR Selector — shown when intensity is enabled and user has access */}
              {hasIntensityAccess && intensityEnabled && (
                <div className="mt-3">
                  <span
                    id="intensity-rating-label"
                    className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider"
                  >
                    Default Rating Type
                  </span>
                  <fieldset
                    className="flex gap-2"
                    aria-labelledby="intensity-rating-label"
                  >
                    <button
                      type="button"
                      onClick={() => setIntensityRating('rpe')}
                      className={`flex-1 px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                        intensityRating === 'rpe'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      RPE
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntensityRating('rir')}
                      className={`flex-1 px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                        intensityRating === 'rir'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      RIR
                    </button>
                  </fieldset>
                  <p className="text-sm text-muted-foreground mt-1">
                    RPE = Rate of Perceived Exertion, RIR = Reps in Reserve
                  </p>
                </div>
              )}
            </div>

            {/* Workout Mode */}
            <div>
              <span
                id="workout-mode-label"
                className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider"
              >
                Workout Mode
              </span>
              <fieldset
                className="flex gap-2"
                aria-labelledby="workout-mode-label"
              >
                <button
                  type="button"
                  onClick={() => setLoggingMode('follow_along')}
                  className={`flex-1 px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    loggingMode === 'follow_along'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-foreground border-border hover:bg-secondary'
                  }`}
                >
                  Follow Along
                </button>
                <button
                  type="button"
                  onClick={() => setLoggingMode('full')}
                  className={`flex-1 px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    loggingMode === 'full'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-foreground border-border hover:bg-secondary'
                  }`}
                >
                  Log Sets
                </button>
              </fieldset>
              <p className="text-sm text-muted-foreground mt-1">
                Follow Along guides you through exercises without tracking weights.
              </p>
            </div>

            {/* Save Button */}
            {error && (
              <div className="p-3 bg-error/10 border-2 border-error text-error text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={`w-full md:w-auto md:min-w-[200px] px-4 py-3 border-2 font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${
                saved
                  ? 'bg-success text-white border-success'
                  : 'bg-primary text-primary-foreground border-primary hover:bg-primary-hover'
              }`}
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : saved ? 'Saved' : 'Save'}
            </button>

            {/* Account Section */}
            <div className="pt-4 border-t border-border space-y-4">
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Account
              </span>

              {/* Email */}
              {connectedAccounts?.email && (
                <div className="text-sm text-foreground">
                  <span className="text-muted-foreground">Email: </span>
                  {connectedAccounts.email}
                </div>
              )}

              {/* Connected providers */}
              <div className="space-y-2">
                <span className="block text-sm text-muted-foreground">
                  Connected sign-in methods
                </span>
                <div className="flex flex-wrap gap-2">
                  <ProviderBadge
                    name="Google"
                    connected={connectedAccounts?.providers.includes('google') ?? false}
                  />
                  <ProviderBadge
                    name="Discord"
                    connected={connectedAccounts?.providers.includes('discord') ?? false}
                  />
                </div>
              </div>

              {/* Change Password */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(!showPasswordChange)
                    setPasswordError(null)
                    setPasswordSuccess(false)
                  }}
                  className="px-4 py-2 border-2 border-border bg-muted text-foreground hover:bg-secondary hover:border-primary transition-colors font-semibold uppercase tracking-wider text-sm flex items-center gap-2"
                >
                  <KeyRound size={16} />
                  Change Password
                </button>

                {showPasswordChange && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label htmlFor="currentPassword" className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                        Current Password
                      </label>
                      <input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                      />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                        New Password
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                      />
                    </div>
                    <div>
                      <label htmlFor="confirmNewPassword" className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                        Confirm New Password
                      </label>
                      <input
                        id="confirmNewPassword"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                      />
                    </div>

                    {passwordError && (
                      <div className="p-2 bg-error/10 border-2 border-error text-error text-sm">
                        {passwordError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
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
                          const result = await authClient.changePassword({
                            currentPassword,
                            newPassword,
                            revokeOtherSessions: true,
                          })
                          if (result.error) {
                            setPasswordError(result.error.message || 'Failed to change password')
                          } else {
                            setPasswordSuccess(true)
                            setShowPasswordChange(false)
                          }
                        } catch (err) {
                          setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
                        } finally {
                          setIsChangingPassword(false)
                        }
                      }}
                      disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                      className="w-full md:w-auto md:min-w-[200px] px-4 py-2 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover transition-colors font-semibold uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChangingPassword ? 'Changing...' : 'Update Password'}
                    </button>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="mt-3 p-2 bg-success/10 border-2 border-success text-success text-sm">
                    Password changed successfully
                  </div>
                )}
              </div>
            </div>

            {/* Admin — visible to admin/editor roles only */}
            {isAdmin && (
              <div className="pt-4 border-t border-border space-y-2">
                <span className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Admin
                </span>
                <Link
                  href="/admin"
                  className="w-full md:w-auto md:min-w-[200px] px-4 py-3 bg-muted text-foreground border-2 border-border hover:bg-secondary hover:border-primary transition-colors font-semibold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  <Shield size={18} />
                  Admin Panel
                </Link>
              </div>
            )}

            {/* Feedback & Donate */}
            <div className="pt-4 border-t border-border">
              <span className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Feedback & Support
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(true)}
                  className="flex-1 px-4 py-3 bg-muted text-foreground border-2 border-border hover:bg-secondary hover:border-primary transition-colors font-semibold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  <MessageSquarePlus size={18} />
                  Send Feedback
                </button>
                {process.env.NEXT_PUBLIC_VENMO_HANDLE && (
                <a
                  href={`https://venmo.com/${process.env.NEXT_PUBLIC_VENMO_HANDLE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-3 bg-muted text-foreground border-2 border-border hover:bg-secondary hover:border-primary transition-colors font-semibold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  <Heart size={18} />
                  Support Ripit
                </a>
                )}
              </div>
              <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
            </div>

            {/* Sign Out */}
            <div className="pt-4 border-t border-border">
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="w-full md:w-auto md:min-w-[200px] px-4 py-3 border-2 border-border bg-muted text-foreground hover:bg-secondary hover:border-primary transition-colors font-semibold uppercase tracking-wider text-sm"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ProviderBadge({ name, connected }: { name: string; connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-2 text-sm font-semibold uppercase tracking-wider ${
        connected
          ? 'border-success bg-success/10 text-success'
          : 'border-border bg-muted text-muted-foreground'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-success' : 'bg-muted-foreground'}`}
      />
      {name}
    </span>
  )
}
