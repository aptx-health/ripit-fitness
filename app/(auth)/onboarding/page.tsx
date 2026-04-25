'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CURRENT_WAIVER_VERSION, WAIVER_TEXT } from '@/lib/constants/waiver'

type Step = 'loading' | 'waiver' | 'experience' | 'equipment' | 'primer' | 'completing'

type ExperienceLevel = 'beginner' | 'experienced'
type EquipmentPreference = 'machines' | 'free_weights_cables'

const RAISED_SHADOW = 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)'
const RAISED_SHADOW_SECONDARY = 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.25), 0 1px 0 rgba(0,0,0,0.30)'

const PRIMER_PAGES = [
  {
    title: 'Just follow along',
    lines: [
      'Your program tells you exactly what to do each day: which exercises, how many sets, how many reps. No planning required.',
      'Start lighter than you think. Controlled reps at moderate effort beat heavy weight with sloppy form. Your first week, pick weights that feel almost too easy -- you\'ll dial it in.',
    ],
  },
  {
    title: 'Respect the space',
    lines: [
      'Grab a wipe and clean any bench, pad, or handle you used. It takes five seconds and everyone notices.',
      'If someone\'s waiting, offer to let them work in between your sets. It\'s the gym equivalent of holding the door.',
      'Take calls outside if you can. But keep your rest -- step off the equipment if you need to send a long text.',
      'Lower weights back to the rack -- don\'t drop them. It\'s loud, it wears on equipment, and it startles everyone around you.',
    ],
  },
  {
    title: 'You belong here',
    lines: [
      'Everyone in the gym started somewhere. Nobody is watching you as closely as you think. If you\'re unsure how a machine works, ask someone -- gym regulars genuinely like helping.',
      'Feeling sore a day or two after your first workout is completely normal. Sharp pain during a lift is not -- stop, lower the weight, or skip that exercise.',
      'Rest 2-3 minutes between the big lifts. There\'s no rush.',
    ],
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')
  const [primerPage, setPrimerPage] = useState(0)
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null)
  const [equipmentPreference, setEquipmentPreference] = useState<EquipmentPreference | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [completingProgramName, setCompletingProgramName] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const [copyProgress, setCopyProgress] = useState<string | null>(null)

  // Fade-in key: changes on every step/page transition
  const [fadeKey, setFadeKey] = useState(0)

  const changeStep = (next: Step) => {
    setFadeKey(k => k + 1)
    setStep(next)
  }

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) {
          changeStep('waiver')
          return
        }
        const data = await res.json()
        if (data.settings?.onboardingCompleted) {
          router.replace('/')
          return
        }
        changeStep('waiver')
      } catch {
        changeStep('waiver')
      }
    }
    check()
  }, [router])

  const completeOnboarding = useCallback(async (
    level: ExperienceLevel,
    equipment?: EquipmentPreference
  ) => {
    setStep('completing')
    setError(null)
    setCopyFailed(false)
    setCopyProgress(null)

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experienceLevel: level,
          ...(equipment && { equipmentPreference: equipment }),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Something went wrong. Please try again.')
        changeStep(level === 'beginner' ? 'primer' : 'experience')
        return
      }

      const data = await res.json()
      setCompletingProgramName(data.programName || null)

      // For beginners with a program being cloned, poll for completion
      if (level === 'beginner' && data.programId) {
        const TIMEOUT_MS = 20000
        const POLL_INTERVAL_MS = 1500
        const start = Date.now()
        let ready = false

        while (Date.now() - start < TIMEOUT_MS) {
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

          try {
            const statusRes = await fetch(`/api/programs/${data.programId}/copy-status`)
            if (!statusRes.ok) continue

            const statusData = await statusRes.json()

            if (statusData.status === 'ready') {
              ready = true
              break
            }

            if (statusData.status === 'failed') {
              setCopyFailed(true)
              return
            }

            // Week 1 is done when the worker moves to week 2+
            if (statusData.progress?.currentWeek >= 2) {
              ready = true
              break
            }

            // Show progress to the user
            if (statusData.progress) {
              setCopyProgress(
                `Week ${statusData.progress.currentWeek} of ${statusData.progress.totalWeeks}`
              )
            }
          } catch {
            // Network error on poll, keep trying
          }
        }

        if (!ready) {
          setCopyFailed(true)
          return
        }
      } else if (level === 'beginner') {
        // Beginner but clone failed to enqueue (e.g. Redis down) — show failure
        setCopyFailed(true)
        return
      } else {
        // Experienced users — brief transition
        await new Promise(resolve => setTimeout(resolve, 2500))
      }

      window.location.href = data.redirect || '/'
    } catch {
      setError('Network error. Please try again.')
      changeStep(level === 'beginner' ? 'primer' : 'experience')
    }
  }, [])

  const handleWaiverAccept = async () => {
    setError(null)
    try {
      const res = await fetch('/api/waiver/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiverVersion: CURRENT_WAIVER_VERSION }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to accept waiver')
        return
      }

      changeStep('experience')
    } catch {
      setError('Network error. Please try again.')
    }
  }

  const handleExperience = (level: ExperienceLevel) => {
    setExperienceLevel(level)
    if (level === 'experienced') {
      completeOnboarding(level)
    } else {
      changeStep('equipment')
    }
  }

  const handleEquipment = (pref: EquipmentPreference) => {
    setEquipmentPreference(pref)
    setPrimerPage(0)
    setFadeKey(k => k + 1)
    setStep('primer')
  }

  const handlePrimerNext = () => {
    setPrimerPage(p => p + 1)
    setFadeKey(k => k + 1)
  }

  const handlePrimerBack = () => {
    setPrimerPage(p => p - 1)
    setFadeKey(k => k + 1)
  }

  const handlePrimerFinish = () => {
    completeOnboarding(experienceLevel!, equipmentPreference!)
  }

  const handleBack = () => {
    if (step === 'equipment') changeStep('experience')
    else if (step === 'primer' && primerPage > 0) handlePrimerBack()
    else if (step === 'primer' && primerPage === 0) changeStep('equipment')
  }

  const canGoBack = step === 'equipment' || step === 'primer'

  // Full-screen loading states
  if (step === 'loading') {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        </div>
      </Shell>
    )
  }

  if (step === 'completing') {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
          {copyFailed ? (
            <FadeIn key="completing-failed" className="text-center max-w-sm">
              <p className="text-lg text-foreground mb-3">
                Failed to load the program
              </p>
              <p className="text-base text-muted-foreground mb-6">
                Go to the Programs tab and browse available programs.
              </p>
              <button
                type="button"
                onClick={() => { window.location.href = '/programs' }}
                className="bg-primary px-6 h-11 text-sm font-medium uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active doom-focus-ring"
                style={{ boxShadow: RAISED_SHADOW }}
              >
                Go to Programs
              </button>
            </FadeIn>
          ) : (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
              {completingProgramName ? (
                <FadeIn key="completing-beginner" className="text-center">
                  <p className="text-lg text-foreground">
                    Copying <span className="font-semibold text-primary">{completingProgramName}</span> to your profile
                  </p>
                  {copyProgress && (
                    <p className="mt-2 text-sm text-muted-foreground">{copyProgress}</p>
                  )}
                </FadeIn>
              ) : experienceLevel === 'experienced' ? (
                <FadeIn key="completing-experienced" className="text-center max-w-sm">
                  <p className="text-lg text-foreground mb-3">
                    Taking you to <span className="font-semibold text-primary">Programs</span>
                  </p>
                  <p className="text-base text-muted-foreground">
                    Browse the library and find a program that fits your goals. Use filters to narrow by equipment, level, or focus area.
                  </p>
                </FadeIn>
              ) : (
                <p className="text-lg text-muted-foreground">Getting things ready...</p>
              )}
            </>
          )}
        </div>
      </Shell>
    )
  }

  const totalDots = step === 'equipment' || step === 'primer' ? 6 : 2
  const currentDot =
    step === 'waiver' ? 0 :
    step === 'experience' ? 1 :
    step === 'equipment' ? 2 :
    step === 'primer' ? 3 + primerPage : 0

  return (
    <Shell>
      {/* Progress bar */}
      <div className="px-6 pt-6">
        <div className="mx-auto flex max-w-lg items-center gap-1.5">
          {Array.from({ length: totalDots }).map((_, i) => (
            <div
              key={i}
              className={`h-[5px] flex-1 transition-all duration-500`}
              style={{
                backgroundColor: i <= currentDot
                  ? 'var(--primary)'
                  : 'rgba(0,0,0,0.25)',
                boxShadow: i <= currentDot
                  ? undefined
                  : 'inset 0 1px 0 rgba(0,0,0,0.20)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-auto mt-4 max-w-lg px-6">
          <div className="border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Step content — centered vertically, fades in */}
      <FadeIn key={fadeKey} className="flex flex-1 flex-col px-6 pt-12 pb-4">
        <div className="mx-auto w-full max-w-lg flex-1">
          {step === 'waiver' && <WaiverContent />}
          {step === 'experience' && <ExperienceContent />}
          {step === 'equipment' && <EquipmentContent onSelect={handleEquipment} />}
          {step === 'primer' && <PrimerContent page={primerPage} />}
        </div>
      </FadeIn>

      {/* Bottom action bar — fixed to bottom, PWA safe */}
      <div
        className="bg-secondary px-6"
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.25)',
        }}
      >
        <div className="mx-auto max-w-lg py-3">
          <div className="flex items-center gap-2.5">
            {canGoBack && (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 h-11 text-sm font-medium uppercase tracking-wider text-secondary-foreground transition-colors doom-focus-ring"
                style={{ backgroundColor: 'rgba(0,0,0,0.35)', boxShadow: RAISED_SHADOW_SECONDARY }}
              >
                Back
              </button>
            )}
            <div className="flex-1">
              {step === 'waiver' && (
                <WaiverAction onAccept={handleWaiverAccept} />
              )}
              {step === 'experience' && (
                <ExperienceActions onSelect={handleExperience} />
              )}
              {step === 'equipment' && (
                <p className="h-11 flex items-center justify-center text-sm uppercase tracking-wider text-secondary-foreground/60">Pick one above</p>
              )}
              {step === 'primer' && (
                <div className="flex flex-col gap-2.5">
                  <PrimerAction
                    isLast={primerPage === PRIMER_PAGES.length - 1}
                    onNext={handlePrimerNext}
                    onFinish={handlePrimerFinish}
                  />
                  {primerPage < PRIMER_PAGES.length - 1 && (
                    <button
                      type="button"
                      onClick={handlePrimerFinish}
                      className="w-full h-11 text-sm font-medium uppercase tracking-wider text-secondary-foreground/60 transition-colors hover:text-secondary-foreground doom-focus-ring"
                    >
                      Skip tips
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}

// --- Layout ---

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(234,88,12,0.06), transparent)',
        }}
      />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        {children}
      </div>
    </div>
  )
}

function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Force reflow so the animation replays
    el.style.animation = 'none'
    void el.offsetHeight
    el.style.animation = ''
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{ animation: 'onboarding-fade-in 0.4s ease-out both' }}
    >
      <style>{`
        @keyframes onboarding-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {children}
    </div>
  )
}

// --- Step Content (body area, scrollable) ---

function WaiverContent() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
        Before we begin
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Version {CURRENT_WAIVER_VERSION}
      </p>
      <div className="max-h-[50vh] overflow-y-auto border border-border/40 bg-card/60 p-5 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {WAIVER_TEXT}
      </div>
    </>
  )
}

function ExperienceContent() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
        New to strength training?
      </h1>
      <p className="text-base text-muted-foreground">
        This helps us set up the right experience for you.
      </p>
    </>
  )
}

function EquipmentContent({ onSelect }: { onSelect: (pref: EquipmentPreference) => void }) {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
        What equipment are you most comfortable with?
      </h1>
      <p className="mb-8 text-base text-muted-foreground">
        We&apos;ll match you with a program that fits.
      </p>

      <div className="flex flex-col gap-4">
        <ChoiceCard
          title="Machines"
          description="Fixed paths, easy to learn. Great for getting started."
          onClick={() => onSelect('machines')}
        />
        <ChoiceCard
          title="Free weights & cables"
          description="Dumbbells, cable machines, and some barbell work."
          onClick={() => onSelect('free_weights_cables')}
        />
        <ChoiceCard
          title="I'm not sure"
          description="We'll start you on machines -- the easiest way to begin."
          onClick={() => onSelect('machines')}
          subtle
        />
      </div>
    </>
  )
}

function PrimerContent({ page }: { page: number }) {
  const data = PRIMER_PAGES[page]

  return (
    <>
      <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
        {data.title}
      </h2>

      <div className="space-y-4">
        {data.lines.map((line, i) => (
          <p key={i} className="text-base leading-relaxed text-muted-foreground">
            {line}
          </p>
        ))}
      </div>

    </>
  )
}

// --- Bottom Actions ---

function WaiverAction({ onAccept }: { onAccept: () => void }) {
  const [accepting, setAccepting] = useState(false)

  const handleAccept = async () => {
    setAccepting(true)
    await onAccept()
    setAccepting(false)
  }

  return (
    <button
      type="button"
      onClick={handleAccept}
      disabled={accepting}
      className="w-full h-11 bg-primary text-sm font-medium uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 doom-focus-ring"
      style={{ boxShadow: RAISED_SHADOW }}
    >
      {accepting ? 'Submitting...' : 'I Agree'}
    </button>
  )
}

function ExperienceActions({ onSelect }: { onSelect: (level: ExperienceLevel) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => onSelect('beginner')}
        className="w-full h-11 bg-primary text-sm font-medium uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active doom-focus-ring"
        style={{ boxShadow: RAISED_SHADOW }}
      >
        Yes, I&apos;m new
      </button>
      <button
        type="button"
        onClick={() => onSelect('experienced')}
        className="w-full h-11 bg-secondary text-sm font-medium uppercase tracking-wider text-secondary-foreground transition-colors doom-focus-ring"
        style={{ boxShadow: RAISED_SHADOW_SECONDARY }}
      >
        I have experience
      </button>
    </div>
  )
}

function PrimerAction({
  isLast,
  onNext,
  onFinish,
}: {
  isLast: boolean
  onNext: () => void
  onFinish: () => void
}) {
  return (
    <button
      type="button"
      onClick={isLast ? onFinish : onNext}
      className="w-full h-11 bg-primary text-sm font-medium uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active doom-focus-ring"
      style={{ boxShadow: RAISED_SHADOW }}
    >
      {isLast ? "Let's go" : 'Next'}
    </button>
  )
}

function ChoiceCard({
  title,
  description,
  onClick,
  subtle,
}: {
  title: string
  description: string
  onClick: () => void
  subtle?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full border p-5 text-left transition-all ${
        subtle
          ? 'border-border/30 hover:border-border hover:bg-card/50'
          : 'border-border bg-card hover:border-primary/40'
      }`}
      style={{
        boxShadow: subtle
          ? undefined
          : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 0 rgba(0,0,0,0.30)',
      }}
    >
      <p className={`text-base font-semibold uppercase tracking-wider transition-colors ${
        subtle
          ? 'text-muted-foreground group-hover:text-foreground'
          : 'text-foreground group-hover:text-primary'
      }`}>
        {title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
    </button>
  )
}
