'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Heart, KeyRound, MessageSquarePlus, Moon, Palette, Save, Shield, Sun } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import FeedbackModal from '@/components/features/FeedbackModal'
import { useThemePreference } from '@/hooks/useThemePreference'
import { useUserSettings } from '@/hooks/useUserSettings'
import { useSession } from '@/lib/auth-client'
import { THEME_LABELS, THEMES } from '@/lib/theme'

type ConnectedAccounts = {
  email: string
  providers: string[]
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const { settings, isLoading, updateSettings } = useUserSettings()
  const { preference, updateTheme } = useThemePreference()
  const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined
  const isAdmin = userRole === 'admin' || userRole === 'editor'
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')
  const [intensityRating, setIntensityRating] = useState<'rpe' | 'rir'>('rir')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccounts | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  useEffect(() => {
    if (settings) {
      setWeightUnit(settings.defaultWeightUnit)
      setIntensityRating(settings.defaultIntensityRating)
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
        defaultIntensityRating: intensityRating,
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
      intensityRating !== settings.defaultIntensityRating)

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-8">
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

            {/* Intensity Rating */}
            <div>
              <span
                id="intensity-rating-label"
                className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider"
              >
                Default Intensity Rating
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

              {/* Change Password — stub */}
              <button
                type="button"
                disabled
                className="px-4 py-2 border-2 border-border bg-muted text-muted-foreground font-semibold uppercase tracking-wider text-sm flex items-center gap-2 opacity-50 cursor-not-allowed"
              >
                <KeyRound size={16} />
                Change Password
                <span className="text-sm font-normal normal-case tracking-normal ml-1">
                  (coming soon)
                </span>
              </button>
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

            {/* Feedback */}
            <div className="pt-4 border-t border-border">
              <span className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Feedback
              </span>
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="w-full md:w-auto md:min-w-[200px] px-4 py-3 bg-muted text-foreground border-2 border-border hover:bg-secondary hover:border-primary transition-colors font-semibold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
              >
                <MessageSquarePlus size={18} />
                Send Feedback
              </button>
              <p className="text-sm text-muted-foreground mt-1">
                Report bugs, request features, or let us know what you think
              </p>
              <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
            </div>

            {/* Support */}
            <div className="pt-4 border-t border-border">
              <span className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Support
              </span>
              <a
                href="https://venmo.com/dusty-maze"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto md:min-w-[200px] px-4 py-3 bg-muted text-foreground border-2 border-border hover:bg-secondary hover:border-primary transition-colors font-semibold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
              >
                <Heart size={18} />
                Support Ripit
              </a>
              <p className="text-sm text-muted-foreground mt-1">
                Ripit is built by a local developer who loves lifting. If it helps your training, consider buying him a coffee.
              </p>
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
