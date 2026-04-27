'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { clearAttribution, getAttribution } from '@/lib/signup-attribution'

type Step = 'loading' | 'experience' | 'equipment' | 'info' | 'completing'

type ExperienceLevel = 'beginner' | 'experienced'
type EquipmentPreference = 'machines' | 'free_weights_cables'

const RAISED_SHADOW = 'inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)'

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
              <p style={{ fontSize: 18, color: '#FEF3C7' }} className="mb-3">
                Failed to load the program
              </p>
              <p style={{ fontSize: 15, color: 'rgba(254,243,199,0.75)', lineHeight: 1.5 }} className="mb-6">
                Go to the Programs tab and browse available programs.
              </p>
              <button
                type="button"
                onClick={() => { window.location.href = '/programs' }}
                className="w-full doom-focus-ring"
                style={{
                  height: 48,
                  backgroundColor: '#10B981',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  boxShadow: RAISED_SHADOW,
                }}
              >
                Go to Programs
              </button>
            </FadeIn>
          ) : (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
              {completingProgramName ? (
                <FadeIn key="completing-beginner" className="text-center">
                  <p style={{ fontSize: 18, color: '#FEF3C7' }}>
                    Copying <span className="font-semibold" style={{ color: '#10B981' }}>{completingProgramName}</span> to your profile
                  </p>
                  {copyProgress && (
                    <p className="mt-2" style={{ fontSize: 14, color: 'rgba(254,243,199,0.75)' }}>{copyProgress}</p>
                  )}
                </FadeIn>
              ) : experienceLevel === 'experienced' ? (
                <FadeIn key="completing-experienced" className="text-center max-w-sm">
                  <p style={{ fontSize: 18, color: '#FEF3C7' }} className="mb-3">
                    Taking you to <span className="font-semibold" style={{ color: '#10B981' }}>Programs</span>
                  </p>
                  <p style={{ fontSize: 15, color: 'rgba(254,243,199,0.75)', lineHeight: 1.5 }}>
                    Browse the library and find a program that fits your goals. Use filters to narrow by equipment, level, or focus area.
                  </p>
                </FadeIn>
              ) : (
                <p style={{ fontSize: 18, color: 'rgba(254,243,199,0.75)' }}>Getting things ready...</p>
              )}
            </>
          )}
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* Progress segments — flush to top edge */}
      <div style={{ display: 'flex', gap: 3, padding: '0 24px' }}>
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 5,
              backgroundColor: i <= currentSegment
                ? '#10B981'
                : 'rgba(0,0,0,0.25)',
            }}
          />
        ))}
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-auto mt-4 max-w-lg" style={{ padding: '0 24px' }}>
          <div className="border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Content area */}
      <FadeIn key={fadeKey} className="flex flex-1 flex-col" style={{ padding: '0 24px' }}>
        <div className={`mx-auto w-full max-w-lg flex-1 flex flex-col ${step !== 'info' ? 'justify-center' : ''}`} style={{ paddingTop: 32, paddingBottom: 24 }}>
          {/* Back link */}
          {canGoBack && (
            <button
              type="button"
              onClick={handleBack}
              style={{
                color: 'rgba(254,243,199,0.5)',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                marginBottom: 24,
                alignSelf: 'flex-start',
              }}
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
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{ backgroundColor: 'var(--background)' }}
    >
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
      <h1 style={{ fontSize: 28, fontWeight: 600, color: '#FEF3C7', marginBottom: 8 }}>
        New to strength training?
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: 'rgba(254,243,199,0.75)', marginBottom: 32 }}>
        This shapes your starting point.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
      <h1 style={{ fontSize: 28, fontWeight: 600, color: '#FEF3C7', marginBottom: 8 }}>
        What equipment are you most comfortable with?
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: 'rgba(254,243,199,0.75)', marginBottom: 32 }}>
        We&apos;ll match you with a program that fits.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
      <h1 style={{ fontSize: 32, fontWeight: 600, color: '#FEF3C7', marginBottom: 36 }}>
        Before you start
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {INFO_GROUPS.map((group) => (
          <div key={group.header}>
            <p style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '0.1em',
              color: '#10B981',
              textTransform: 'uppercase',
              fontVariant: 'small-caps',
              marginBottom: 12,
            }}>
              {group.header}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.bullets.map((bullet, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 5,
                      height: 5,
                      backgroundColor: '#10B981',
                      marginTop: 9,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: 'rgba(254,243,199,0.85)',
                  }}>
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
        className="w-full doom-focus-ring"
        style={{
          marginTop: 32,
          height: 48,
          backgroundColor: '#10B981',
          color: '#fff',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          border: 'none',
          cursor: 'pointer',
          boxShadow: RAISED_SHADOW,
        }}
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
      style={{
        width: '100%',
        padding: 20,
        textAlign: 'left',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: isSelected
          ? 'rgba(16,185,129,0.08)'
          : 'rgba(254,243,199,0.04)',
        border: isSelected
          ? '1px solid #10B981'
          : '1px solid rgba(254,243,199,0.12)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 0 rgba(0,0,0,0.30)',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {/* Checkmark */}
      {isSelected && (
        <span style={{
          position: 'absolute',
          top: 12,
          right: 12,
          color: '#10B981',
          fontSize: 16,
          fontWeight: 700,
        }}>
          &#10003;
        </span>
      )}

      <span style={{
        display: 'block',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '0.08em',
        color: '#FEF3C7',
      }}>
        {label}
      </span>

      {description && (
        <span style={{
          display: 'block',
          marginTop: 4,
          fontSize: 14,
          lineHeight: 1.5,
          color: 'rgba(254,243,199,0.75)',
        }}>
          {description}
        </span>
      )}
    </button>
  )
}
