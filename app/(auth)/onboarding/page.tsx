'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { clearAttribution, getAttribution } from '@/lib/signup-attribution'

type Step = 'loading' | 'experience' | 'equipment' | 'info' | 'completing'

type ExperienceLevel = 'beginner' | 'experienced'
type EquipmentPreference = 'machines' | 'free_weights_cables'

const INFO_GROUPS = [
  {
    header: 'THE PROGRAM GUIDES YOU',
    bullets: [
      'Tells you what to do each day',
      'Start lighter than feels right -- controlled reps beat heavy and sloppy',
    ],
  },
  {
    header: 'SHARE THE SPACE',
    bullets: [
      'Wipe down what you used',
      'Offer to work in if someone\u2019s waiting',
      'Lower weights -- don\u2019t drop them',
    ],
  },
  {
    header: 'YOU BELONG HERE',
    bullets: [
      'Soreness 1\u20132 days after is normal; sharp pain during is not',
      'Ask gym regulars if you\u2019re unsure -- they like helping',
      'Rest 2\u20133 minutes between heavier lifts',
    ],
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null)
  const [equipmentPreference, setEquipmentPreference] = useState<EquipmentPreference | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [completingProgramName, setCompletingProgramName] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const [copyProgress, setCopyProgress] = useState<string | null>(null)
  const [fadeKey, setFadeKey] = useState(0)

  const changeStep = useCallback((next: Step) => {
    setFadeKey(k => k + 1)
    setStep(next)
  }, [])

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
        changeStep(level === 'beginner' ? 'info' : 'experience')
        return
      }

      const data = await res.json()
      setCompletingProgramName(data.programName || null)

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

            if (statusData.progress?.currentWeek >= 2) {
              ready = true
              break
            }

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
        setCopyFailed(true)
        return
      } else {
        await new Promise(resolve => setTimeout(resolve, 2500))
      }

      window.location.href = data.redirect || '/'
    } catch {
      setError('Network error. Please try again.')
      changeStep(level === 'beginner' ? 'info' : 'experience')
    }
  }, [changeStep])

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) {
          applyQrMode()
          return
        }
        const data = await res.json()
        if (data.settings?.onboardingCompleted) {
          router.replace('/')
          return
        }
        applyQrMode()
      } catch {
        applyQrMode()
      }
    }

    function applyQrMode() {
      const attribution = getAttribution()
      clearAttribution()
      if (attribution.mode === 'experienced') {
        completeOnboarding('experienced')
      } else if (attribution.mode === 'beginner') {
        setExperienceLevel('beginner')
        changeStep('equipment')
      } else {
        changeStep('experience')
      }
    }

    check()
  }, [router, changeStep, completeOnboarding])

  const handleExperienceSelect = (level: ExperienceLevel) => {
    setSelectedCard(level)
    setExperienceLevel(level)

    setTimeout(() => {
      if (level === 'experienced') {
        completeOnboarding(level)
      } else {
        setSelectedCard(null)
        changeStep('equipment')
      }
    }, 200)
  }

  const handleEquipmentSelect = (pref: EquipmentPreference) => {
    setSelectedCard(pref)
    setEquipmentPreference(pref)

    setTimeout(() => {
      setSelectedCard(null)
      changeStep('info')
    }, 200)
  }

  const handleBack = () => {
    if (step === 'equipment') {
      // If QR mode pre-selected beginner, don't go back to experience
      const attribution = getAttribution()
      if (attribution.mode !== 'beginner') {
        changeStep('experience')
      }
    } else if (step === 'info') {
      changeStep('equipment')
    }
  }

  const handleFinish = () => {
    completeOnboarding(experienceLevel!, equipmentPreference!)
  }

  // --- Progress bar math ---
  // QR beginner mode skips experience step: 2 segments instead of 3
  const qrBeginner = getAttribution().mode === 'beginner'
  const totalSegments = qrBeginner ? 2 : 3
  const currentSegment = qrBeginner
    ? (step === 'equipment' ? 0 : step === 'info' ? 1 : 0)
    : (step === 'experience' ? 0 : step === 'equipment' ? 1 : step === 'info' ? 2 : 0)

  const canGoBack = (step === 'equipment' && !qrBeginner) || step === 'info'

  // --- Loading ---
  if (step === 'loading') {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        </div>
      </Shell>
    )
  }

  // --- Completing ---
  if (step === 'completing') {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
          {copyFailed ? (
            <FadeIn key="completing-failed" className="text-center max-w-sm">
              <p className="mb-3 text-lg text-foreground">
                Failed to load the program
              </p>
              <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground">
                Go to the Programs tab and browse available programs.
              </p>
              <button
                type="button"
                onClick={() => { window.location.href = '/programs' }}
                className="w-full min-h-12 bg-success text-sm font-medium uppercase tracking-widest text-success-foreground doom-focus-ring"
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
                    Copying <span className="font-semibold text-success">{completingProgramName}</span> to your profile
                  </p>
                  {copyProgress && (
                    <p className="mt-2 text-sm text-muted-foreground">{copyProgress}</p>
                  )}
                </FadeIn>
              ) : experienceLevel === 'experienced' ? (
                <FadeIn key="completing-experienced" className="text-center max-w-sm">
                  <p className="mb-3 text-lg text-foreground">
                    Taking you to <span className="font-semibold text-success">Programs</span>
                  </p>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
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

  return (
    <Shell>
      {/* Progress segments */}
      <div className="flex gap-[3px] px-6">
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div
            key={i}
            className="h-[5px] flex-1"
            style={{
              backgroundColor: i <= currentSegment
                ? 'var(--success)'
                : 'var(--muted)',
            }}
          />
        ))}
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-auto mt-4 max-w-lg px-6">
          <div className="border border-error/20 bg-error/10 px-4 py-3 text-sm text-error-text">
            {error}
          </div>
        </div>
      )}

      {/* Content area */}
      <FadeIn key={fadeKey} className="flex flex-1 flex-col px-6">
        <div className={`mx-auto w-full max-w-lg flex-1 flex flex-col ${step !== 'info' ? 'justify-center' : ''} pt-8 pb-6`}>
          {/* Back link */}
          {canGoBack && (
            <button
              type="button"
              onClick={handleBack}
              className="mb-6 self-start bg-transparent border-none cursor-pointer p-0 text-[13px] font-medium uppercase tracking-wider text-muted-foreground min-h-12 flex items-center"
              aria-label="Go back"
            >
              &larr; BACK
            </button>
          )}

          {step === 'experience' && (
            <ExperienceScreen
              selected={selectedCard}
              previousChoice={experienceLevel}
              onSelect={handleExperienceSelect}
            />
          )}

          {step === 'equipment' && (
            <EquipmentScreen
              selected={selectedCard}
              previousChoice={equipmentPreference}
              onSelect={handleEquipmentSelect}
            />
          )}

          {step === 'info' && (
            <InfoScreen onFinish={handleFinish} />
          )}
        </div>
      </FadeIn>
    </Shell>
  )
}

// --- Layout ---

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {children}
    </div>
  )
}

function FadeIn({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.animation = 'none'
    void el.offsetHeight
    el.style.animation = ''
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{ animation: 'onboarding-fade-in 0.4s ease-out both', ...style }}
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

// --- Screen 1: Experience ---

function ExperienceScreen({
  selected,
  previousChoice,
  onSelect,
}: {
  selected: string | null
  previousChoice: ExperienceLevel | null
  onSelect: (level: ExperienceLevel) => void
}) {
  return (
    <>
      <h1 className="text-[28px] font-semibold text-foreground mb-2">
        New to strength training?
      </h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground mb-8">
        This shapes your starting point.
      </p>

      <div className="flex flex-col gap-3">
        <SelectionCard
          label="YES, I'M NEW"
          isSelected={selected === 'beginner' || (!selected && previousChoice === 'beginner')}
          onClick={() => onSelect('beginner')}
        />
        <SelectionCard
          label="I HAVE EXPERIENCE"
          isSelected={selected === 'experienced' || (!selected && previousChoice === 'experienced')}
          onClick={() => onSelect('experienced')}
        />
      </div>
    </>
  )
}

// --- Screen 2: Equipment ---

function EquipmentScreen({
  selected,
  previousChoice,
  onSelect,
}: {
  selected: string | null
  previousChoice: EquipmentPreference | null
  onSelect: (pref: EquipmentPreference) => void
}) {
  return (
    <>
      <h1 className="text-[28px] font-semibold text-foreground mb-2">
        What equipment are you most comfortable with?
      </h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground mb-8">
        We&apos;ll match you with a program that fits.
      </p>

      <div className="flex flex-col gap-3">
        <SelectionCard
          label="MACHINES"
          description="Fixed paths, easy to learn. Great for getting started."
          isSelected={selected === 'machines' || (!selected && previousChoice === 'machines')}
          onClick={() => onSelect('machines')}
        />
        <SelectionCard
          label="FREE WEIGHTS & CABLES"
          description="Dumbbells, cable machines, and some barbell work."
          isSelected={selected === 'free_weights_cables' || (!selected && previousChoice === 'free_weights_cables')}
          onClick={() => onSelect('free_weights_cables')}
        />
        <SelectionCard
          label="I'M NOT SURE"
          description="We'll start you on machines -- the easiest way to begin."
          isSelected={false}
          onClick={() => onSelect('machines')}
        />
      </div>
    </>
  )
}

// --- Screen 3: Consolidated Info ---

function InfoScreen({ onFinish }: { onFinish: () => void }) {
  return (
    <>
      <h1 className="text-[32px] font-semibold text-foreground mb-9">
        Before you start
      </h1>

      <div className="flex flex-col gap-8">
        {INFO_GROUPS.map((group) => (
          <div key={group.header}>
            <p className="text-sm font-medium tracking-widest text-success uppercase mb-3"
              style={{ fontVariant: 'small-caps' }}
            >
              {group.header}
            </p>
            <div className="flex flex-col gap-2.5">
              {group.bullets.map((bullet, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span
                    className="inline-block w-[5px] h-[5px] bg-success mt-[9px] shrink-0"
                  />
                  <span className="text-base leading-relaxed text-foreground/85">
                    {bullet}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onFinish}
        className="w-full min-h-12 mt-8 bg-success text-sm font-medium uppercase tracking-widest text-success-foreground doom-focus-ring"
      >
        LET&apos;S GO
      </button>
    </>
  )
}

// --- Shared Components ---

function SelectionCard({
  label,
  description,
  isSelected,
  onClick,
}: {
  label: string
  description?: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={`w-full p-5 text-left cursor-pointer relative transition-colors duration-150 min-h-12 ${
        isSelected
          ? 'bg-success/10 border border-success'
          : 'bg-card border border-border'
      }`}
    >
      {/* Checkmark */}
      {isSelected && (
        <span className="absolute top-3 right-3 text-success text-base font-bold">
          &#10003;
        </span>
      )}

      <span className="block text-sm font-medium tracking-wider text-foreground">
        {label}
      </span>

      {description && (
        <span className="block mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </span>
      )}
    </button>
  )
}
