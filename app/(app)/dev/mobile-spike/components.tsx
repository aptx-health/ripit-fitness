'use client'

import { ChevronUp, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export type Tab = 'training' | 'programs' | 'learn' | 'settings'

export const Z = {
  bottomNav: 40,
  floatingButton: 45,
  modalBackdrop: 50,
  modal: 50,
} as const

// --- Tab content panels ---

export function TabContent({
  tab,
  onOpenModal,
  hasDraft,
  onToggleDraft,
}: {
  tab: Tab
  onOpenModal: () => void
  hasDraft: boolean
  onToggleDraft: () => void
}) {
  switch (tab) {
    case 'training':
      return <TrainingContent onOpenModal={onOpenModal} hasDraft={hasDraft} />
    case 'programs':
      return <ProgramsContent />
    case 'learn':
      return <LearnContent />
    case 'settings':
      return (
        <SettingsContent hasDraft={hasDraft} onToggleDraft={onToggleDraft} />
      )
  }
}

function TrainingContent({
  onOpenModal,
  hasDraft,
}: {
  onOpenModal: () => void
  hasDraft: boolean
}) {
  return (
    <div className="px-4 space-y-3">
      <h1 className="text-lg font-bold">Week 3 — Peak Week</h1>
      <p className="text-sm text-muted-foreground">
        Maximum intensity. Focus on heavy compounds.
      </p>

      {[
        'Day 1: Upper Push',
        'Day 2: Lower',
        'Day 3: Upper Pull',
        'Day 4: Arms & Accessories',
        'Day 5: Full Body',
        'Day 6: Active Recovery',
      ].map((day, i) => (
        <button
          type="button"
          key={i}
          onClick={() => {
            if (hasDraft) {
              alert(
                'You have an active draft workout. Resume or discard it first.'
              )
              return
            }
            onOpenModal()
          }}
          className="w-full text-left p-4 rounded-lg border-2 border-border bg-card hover:border-accent transition-colors"
        >
          <div className="font-semibold">{day}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {4 + i} exercises &middot; ~{45 + i * 5} min
          </div>
        </button>
      ))}

      <div className="pt-4 pb-8 text-xs text-muted-foreground text-center">
        Scroll test: you should be able to see this without it hiding behind
        the bottom nav.
      </div>
    </div>
  )
}

function ProgramsContent() {
  return (
    <div className="px-4 space-y-3">
      <h1 className="text-lg font-bold">Programs</h1>
      {['nSuns 5/3/1 LP', 'GZCLP', 'Starting Strength'].map((name, i) => (
        <div
          key={i}
          className="p-4 rounded-lg border-2 border-border bg-card"
        >
          <div className="font-semibold">{name}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {i === 0 ? 'Active' : 'Archived'} &middot; {4 + i} weeks
          </div>
        </div>
      ))}
    </div>
  )
}

function LearnContent() {
  return (
    <div className="px-4 space-y-4">
      <h1 className="text-lg font-bold">Getting Started with Strength Training</h1>
      <p className="text-sm leading-relaxed">
        Strength training is one of the most effective ways to improve your overall health, build muscle, and increase bone density. Whether you are a complete beginner or returning after a long break, understanding the fundamentals will set you up for long-term success.
      </p>
      <h2 className="text-base font-bold">Why Strength Train?</h2>
      <p className="text-sm leading-relaxed">
        The benefits extend far beyond aesthetics. Regular resistance training improves insulin sensitivity, reduces the risk of cardiovascular disease, strengthens connective tissue, and has been shown to improve mental health outcomes including reduced anxiety and depression symptoms. For older adults, maintaining muscle mass is one of the strongest predictors of independence and quality of life.
      </p>
      <h2 className="text-base font-bold">Choosing Your First Program</h2>
      <p className="text-sm leading-relaxed">
        As a beginner, you want a program built around compound movements — exercises that work multiple muscle groups simultaneously. The squat, bench press, deadlift, overhead press, and barbell row form the foundation of most beginner programs. These movements give you the most training stimulus per unit of time and build functional, transferable strength.
      </p>
      <p className="text-sm leading-relaxed">
        Popular beginner programs include Starting Strength, StrongLifts 5x5, and GZCLP. All three follow a similar philosophy: train 3 days per week, focus on compound lifts, and add weight to the bar each session. This linear progression works because untrained lifters can recover quickly and adapt to increasing loads for several months before needing more advanced programming.
      </p>
      <h2 className="text-base font-bold">Understanding Sets and Reps</h2>
      <p className="text-sm leading-relaxed">
        A rep (repetition) is one complete movement of an exercise. A set is a group of consecutive reps. When you see &ldquo;3x5 @ 135 lbs&rdquo; it means 3 sets of 5 reps at 135 pounds. Rest periods between sets typically range from 2-5 minutes for heavy compound movements and 1-2 minutes for lighter accessory work.
      </p>
      <h2 className="text-base font-bold">RPE and Autoregulation</h2>
      <p className="text-sm leading-relaxed">
        Rate of Perceived Exertion (RPE) is a scale from 1-10 that measures how hard a set felt. An RPE of 10 means you could not have done another rep. RPE 8 means you had about 2 reps left in the tank. Many modern programs use RPE to autoregulate training intensity — instead of prescribing exact weights, they prescribe an effort level, allowing you to adjust based on how you feel that day.
      </p>
      <p className="text-sm leading-relaxed">
        This is particularly useful because your strength fluctuates day to day based on sleep, nutrition, stress, and accumulated fatigue. A weight that felt easy on Monday might feel crushing on Thursday if you slept poorly and skipped meals.
      </p>
      <h2 className="text-base font-bold">Progressive Overload</h2>
      <p className="text-sm leading-relaxed">
        The principle of progressive overload states that to continue making gains, you must gradually increase the demands placed on your body. The simplest form is adding weight to the bar each session. When that stalls, you can increase volume (more sets or reps), improve technique, or manipulate tempo and rest periods.
      </p>
      <p className="text-sm leading-relaxed">
        Beginners can add 5 lbs to upper body lifts and 10 lbs to lower body lifts each session. Intermediate lifters might progress weekly or bi-weekly. Advanced lifters may take months to add meaningful weight. The key is patience — consistent training over years produces remarkable results.
      </p>
      <h2 className="text-base font-bold">Recovery and Nutrition</h2>
      <p className="text-sm leading-relaxed">
        Training is the stimulus; recovery is when you actually get stronger. Sleep 7-9 hours per night. Eat sufficient protein — a common recommendation is 0.7-1g per pound of bodyweight daily. Stay hydrated. Manage stress. These basics matter far more than any supplement or special technique.
      </p>
      <p className="text-sm leading-relaxed">
        If you are not recovering between sessions — you feel consistently run down, your performance is declining, or you are getting injured — you are likely doing too much volume or not eating and sleeping enough. More training is not always better.
      </p>
      <h2 className="text-base font-bold">Common Mistakes</h2>
      <p className="text-sm leading-relaxed">
        Program hopping is the number one mistake beginners make. Pick a program and stick with it for at least 12 weeks before evaluating. No program works if you only follow it for two weeks before switching to something you saw on social media.
      </p>
      <p className="text-sm leading-relaxed">
        Ego lifting — using more weight than you can handle with good form — is the fastest path to injury. Leave your ego at the door. Nobody in the gym cares what you are lifting. They are focused on their own workout.
      </p>
      <div className="pt-4 pb-8 text-xs text-muted-foreground text-center">
        End of article — scroll test: this text should be fully visible above the bottom nav.
      </div>
    </div>
  )
}

function SettingsContent({
  hasDraft,
  onToggleDraft,
}: {
  hasDraft: boolean
  onToggleDraft: () => void
}) {
  const [inputValue, setInputValue] = useState('')

  return (
    <div className="px-4 space-y-4">
      <h1 className="text-lg font-bold">Settings</h1>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="spike-input">
          Text input (test keyboard + bottom nav interaction)
        </label>
        <input
          id="spike-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type here and watch the bottom nav..."
          className="w-full px-3 py-2 rounded-lg border-2 border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
        />
        <p className="text-xs text-muted-foreground">
          On iOS Safari, does the bottom nav get pushed up above the keyboard?
          On Android Chrome, does it overlap or hide correctly?
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="spike-textarea">
          Textarea (longer input test)
        </label>
        <textarea
          id="spike-textarea"
          rows={3}
          placeholder="Test multiline input..."
          className="w-full px-3 py-2 rounded-lg border-2 border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none"
        />
      </div>

      <div className="pt-2 border-t border-border">
        <h2 className="text-sm font-bold mb-2">Test Controls</h2>
        <button
          type="button"
          onClick={onToggleDraft}
          className="px-4 py-2 rounded-lg border-2 border-border bg-card text-sm hover:border-accent transition-colors"
        >
          {hasDraft ? 'Clear draft state' : 'Simulate draft workout'}
        </button>
      </div>

      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
        Spacer block — does this scroll correctly behind bottom nav?
      </div>
    </div>
  )
}

// --- Full-screen modal (workout logging simulation) ---

export function FullScreenModal({
  onClose,
  onMinimize,
}: {
  onClose: () => void
  onMinimize: () => void
}) {
  const [sets, setSets] = useState<string[]>([])
  const [now] = useState(() => Date.now())

  return (
    <div
      className="fixed inset-0 flex flex-col bg-background text-foreground"
      style={{ zIndex: Z.modal }}
    >
      <div
        className="flex items-center justify-between px-4 border-b-2 border-border bg-muted"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
          paddingBottom: '0.75rem',
        }}
      >
        <div>
          <div className="font-bold">Bench Press</div>
          <div className="text-xs text-muted-foreground">
            Exercise 1 of 5 &middot; Day 1: Upper Push
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMinimize}
            className="min-h-10 min-w-10 flex items-center justify-center rounded-lg border-2 border-border hover:border-accent transition-colors"
            aria-label="Minimize workout"
          >
            <ChevronUp className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Exit workout? Your draft will be saved.')) {
                onClose()
              }
            }}
            className="min-h-10 min-w-10 flex items-center justify-center rounded-lg border-2 border-border hover:border-accent transition-colors"
            aria-label="Close workout"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="text-sm text-muted-foreground">
          Prescribed: 5x5 @ 185 lbs
        </div>

        {sets.map((s, i) => (
          <div
            key={i}
            className="p-3 rounded-lg border-2 border-border bg-card text-sm"
          >
            Set {i + 1}: {s}
          </div>
        ))}

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="set-input">
            Log a set (test keyboard inside modal)
          </label>
          <div className="flex gap-2">
            <input
              id="set-input"
              type="text"
              placeholder="e.g. 5 @ 185"
              className="flex-1 px-3 py-2 rounded-lg border-2 border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget
                  if (input.value.trim()) {
                    setSets((prev) => [...prev, input.value.trim()])
                    input.value = ''
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById(
                  'set-input'
                ) as HTMLInputElement
                if (input?.value.trim()) {
                  setSets((prev) => [...prev, input.value.trim()])
                  input.value = ''
                }
              }}
              className="px-4 py-2 rounded-lg bg-accent text-white font-medium text-sm"
            >
              Log
            </button>
          </div>
        </div>

        <div className="pt-4 space-y-2">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Previous Performance
          </div>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="p-2 rounded border border-border text-xs text-muted-foreground"
            >
              {new Date(
                now - (i + 1) * 7 * 24 * 60 * 60 * 1000
              ).toLocaleDateString()}
              : 5x5 @ {175 + i * 2.5} lbs
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-4 py-3 border-t-2 border-border bg-muted"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
        }}
      >
        <button type="button" className="flex-1 py-3 rounded-lg bg-accent text-white font-bold text-sm">
          Log Set
        </button>
        <button type="button" className="flex-1 py-3 rounded-lg bg-success text-white font-bold text-sm">
          Complete
        </button>
      </div>
    </div>
  )
}

// --- Debug overlay ---

export function DebugOverlay({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState({
    viewport: '',
    safeAreas: '',
    standalone: false,
    userAgent: '',
  })

  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport
      setInfo({
        viewport: `${window.innerWidth}x${window.innerHeight}${vv ? ` (visual: ${Math.round(vv.width)}x${Math.round(vv.height)})` : ''}`,
        safeAreas:
          typeof getComputedStyle !== 'undefined'
            ? `top:${getComputedStyle(document.documentElement).getPropertyValue('--sat') || 'n/a'} bottom:${getComputedStyle(document.documentElement).getPropertyValue('--sab') || 'n/a'}`
            : 'n/a',
        standalone:
          'standalone' in window.navigator &&
          (window.navigator as Navigator & { standalone: boolean }).standalone,
        userAgent: `${navigator.userAgent.slice(0, 60)}...`,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 bg-black/90 text-green-400 text-[10px] font-mono p-2 leading-relaxed"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        zIndex: 100,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-1 right-2 text-white text-xs"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        [x]
      </button>
      <div>Viewport: {info.viewport}</div>
      <div>Safe areas: {info.safeAreas}</div>
      <div>Standalone (PWA): {info.standalone ? 'YES' : 'no'}</div>
      <div className="truncate">UA: {info.userAgent}</div>
      <div className="mt-1 text-yellow-300">
        Z-index: nav={Z.bottomNav} float={Z.floatingButton} modal={Z.modal}
      </div>
    </div>
  )
}
