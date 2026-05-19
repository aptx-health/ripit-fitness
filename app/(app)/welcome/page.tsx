'use client'

import { ArrowRight, CalendarDays, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { PixelDriftBackground } from '@/components/effects/PixelDriftBackground'
import { useToast } from '@/components/ToastProvider'
import { LoadingFrog } from '@/components/ui/loading-frog'
import { trackEvent } from '@/lib/analytics'
import { startFreestyleWorkout } from '@/lib/api/adhoc-workout'
import { clientLogger } from '@/lib/client-logger'

const INTENT_OPTIONS = [
  { value: 'new_to_apps', label: 'New to strength training apps' },
  { value: 'from_another_app', label: 'Coming from another app' },
  { value: 'returning_to_training', label: 'Returning to training after a break' },
  { value: 'just_curious', label: 'Just curious / looking' },
] as const

type IntentValue = (typeof INTENT_OPTIONS)[number]['value']
type Step = 'intent' | 'path'

export default function WelcomePage() {
  const router = useRouter()
  const toast = useToast()
  const mountedAtRef = useRef<number>(Date.now())
  const [step, setStep] = useState<Step>('intent')
  const [intent, setIntent] = useState<IntentValue | null>(null)
  const [startingFreestyle, setStartingFreestyle] = useState(false)

  useEffect(() => {
    mountedAtRef.current = Date.now()
    trackEvent('welcome_viewed')
  }, [])

  const elapsedMs = () => Date.now() - mountedAtRef.current

  async function pickIntent(value: IntentValue) {
    if (intent) return
    setIntent(value)
    trackEvent('welcome_intent', { intent: value, ms_to_choice: elapsedMs() })
    fetch('/api/welcome/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: value }),
    }).catch((err) => clientLogger.error('Failed to save welcome intent', err))
    // Brief beat so the chip's active state is visible, then advance.
    setTimeout(() => setStep('path'), 280)
  }

  function skipIntent() {
    trackEvent('welcome_intent_skipped', { ms_to_choice: elapsedMs() })
    setStep('path')
  }

  async function startFreestyle() {
    if (startingFreestyle) return
    setStartingFreestyle(true)
    trackEvent('welcome_path_freestyle', { ms_to_choice: elapsedMs() })
    try {
      const completion = await startFreestyleWorkout()
      router.push(`/training/adhoc/${completion.id}?new=1`)
    } catch (err) {
      clientLogger.error('Failed to start freestyle workout from welcome', err)
      toast.warning('Could not start workout', 'Try again, or pick a program instead.')
      setStartingFreestyle(false)
    }
  }

  function browsePrograms() {
    trackEvent('welcome_path_program', { ms_to_choice: elapsedMs() })
    router.push('/programs')
  }

  function skipToTraining() {
    trackEvent('welcome_skipped', { ms_to_choice: elapsedMs() })
    router.push('/training')
  }

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)] flex flex-col relative overflow-hidden">
      <PixelDriftBackground />
      <div className="flex-1 max-w-md md:max-w-lg w-full mx-auto px-5 sm:px-6 py-10 flex flex-col relative z-10">
        <header className="flex items-center gap-4 mb-12">
          <LoadingFrog size={44} speed={1.8} />
          <h1 className="text-4xl md:text-5xl font-bold text-foreground doom-title uppercase tracking-wider leading-none">
            Welcome
          </h1>
        </header>

        {step === 'intent' ? (
          <IntentStep intent={intent} onPick={pickIntent} onSkip={skipIntent} />
        ) : (
          <PathStep
            startingFreestyle={startingFreestyle}
            onFreestyle={startFreestyle}
            onPrograms={browsePrograms}
            onSkip={skipToTraining}
          />
        )}
      </div>
      <ScrollHintFade key={step} />
    </div>
  )
}

function ScrollHintFade() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    function update() {
      const docHeight = document.documentElement.scrollHeight
      const scrollBottom = window.innerHeight + window.scrollY
      // Show when there's >40px of content below the current viewport bottom
      setShow(docHeight - scrollBottom > 40)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 h-16 bottom-[80px] md:bottom-0 z-20 transition-opacity duration-300"
      style={{
        opacity: show ? 1 : 0,
        background: 'linear-gradient(to bottom, transparent, var(--background))',
      }}
    />
  )
}

function IntentStep({
  intent,
  onPick,
  onSkip,
}: {
  intent: IntentValue | null
  onPick: (v: IntentValue) => void
  onSkip: () => void
}) {
  return (
    <section className="flex-1 flex flex-col">
      <h2 className="text-lg font-semibold text-foreground mb-6 leading-snug">
        Just one question first: which of these sounds like you?
      </h2>

      <div className="grid grid-cols-1 gap-2.5">
        {INTENT_OPTIONS.map((option) => {
          const active = intent === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onPick(option.value)}
              disabled={intent !== null && !active}
              aria-pressed={active}
              className={`w-full px-4 py-3.5 border-2 text-sm font-semibold uppercase tracking-wider transition-all text-left ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:border-primary disabled:opacity-50'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onSkip}
        disabled={intent !== null}
        className="mt-5 w-full px-4 py-3 bg-transparent border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors flex items-center justify-between gap-3 group disabled:opacity-40"
      >
        <span className="text-xs font-semibold uppercase tracking-widest">
          Prefer not to say
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          Skip
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
        </span>
      </button>
    </section>
  )
}

function PathStep({
  startingFreestyle,
  onFreestyle,
  onPrograms,
  onSkip,
}: {
  startingFreestyle: boolean
  onFreestyle: () => void
  onPrograms: () => void
  onSkip: () => void
}) {
  return (
    <section className="flex-1 flex flex-col">
      <h2 className="text-lg font-semibold text-foreground mb-1">
        How do you want to start?
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Switch anytime from the menu.
      </p>

      <div className="space-y-5">
        <article className="doom-corners bg-card p-5 relative">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-widest mb-3">
            <Zap className="w-3 h-3" strokeWidth={2.5} />
            Quick start
          </div>
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wider mb-2">
            Freestyle a workout
          </h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Pick exercises as you go. Nothing to set up first.
          </p>
          <button
            type="button"
            onClick={onFreestyle}
            disabled={startingFreestyle}
            className="doom-button-3d w-full px-6 py-3 bg-primary text-primary-foreground border-2 border-primary font-bold uppercase tracking-wider text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {startingFreestyle ? 'Starting…' : 'Start now'}
          </button>
        </article>

        <article className="doom-corners bg-card/60 p-5 relative">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-secondary/15 text-secondary text-[10px] font-bold uppercase tracking-widest mb-3">
            <CalendarDays className="w-3 h-3" strokeWidth={2.5} />
            Structured
          </div>
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wider mb-2">
            Follow a program
          </h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Multi-week plans. Activate one and follow day by day.
          </p>
          <button
            type="button"
            onClick={onPrograms}
            className="w-full px-6 py-3 bg-card text-foreground border-2 border-border hover:border-primary transition-colors font-bold uppercase tracking-wider text-sm"
          >
            Browse programs
          </button>
        </article>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="mt-5 w-full px-4 py-3 bg-transparent border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors flex items-center justify-between gap-3 group"
      >
        <span className="text-xs font-semibold uppercase tracking-widest">
          Just looking around
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          Skip to Training
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
        </span>
      </button>
    </section>
  )
}
