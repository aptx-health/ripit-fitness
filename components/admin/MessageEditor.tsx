'use client'

import { Copy, Save, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CommunityProgramSelector } from '@/components/admin/CommunityProgramSelector'
import { MessageCard } from '@/components/ui/MessageCard'
import { MESSAGE_ICON_NAMES, MESSAGE_ICONS } from '@/lib/icons/message-icons'

export interface SlideData {
  content: string
  icon: string
}

export interface MessageFormData {
  id?: string
  name: string | null
  content: string
  slides?: string | null
  placement: string
  userType: string
  icon: string
  lifecycle: string
  minWorkouts: number | null
  maxWorkouts: number | null
  programTargeting: string | null
  priority: number
  active: boolean
  version?: number
}

interface MessageEditorProps {
  message?: MessageFormData
  onSave: (message: { id: string }) => void
  onCancel: () => void
  onDelete?: () => void
  onDuplicate?: () => void
}

interface PrecedenceResult {
  wouldShow: boolean
  suppressedBy: { id: string; content: string; priority: number } | null
}

export function MessageEditor({ message, onSave, onCancel, onDelete, onDuplicate }: MessageEditorProps) {
  const isEditing = !!message?.id

  const [name, setName] = useState(message?.name ?? '')
  const [content, setContent] = useState(message?.content ?? '')
  const [additionalSlides, setAdditionalSlides] = useState<SlideData[]>(() => {
    if (!message?.slides) return []
    try {
      const parsed = JSON.parse(message.slides)
      if (Array.isArray(parsed) && parsed.length > 1) {
        return parsed.slice(1) // first slide is content+icon
      }
    } catch { /* ignore */ }
    return []
  })
  const [placement, setPlacement] = useState(message?.placement ?? 'training_tab')
  const [userType, setUserType] = useState(message?.userType ?? 'all')
  const [icon, setIcon] = useState(message?.icon ?? 'Lightbulb')
  const [lifecycle, setLifecycle] = useState(message?.lifecycle ?? 'show_always')
  const [minWorkouts, setMinWorkouts] = useState<string>(message?.minWorkouts?.toString() ?? '')
  const [maxWorkouts, setMaxWorkouts] = useState<string>(message?.maxWorkouts?.toString() ?? '')
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(() => {
    if (!message?.programTargeting) return new Set()
    try {
      const parsed = JSON.parse(message.programTargeting)
      return new Set(Array.isArray(parsed) ? parsed : [])
    } catch { return new Set() }
  })
  const [priority, setPriority] = useState<string>(message?.priority?.toString() ?? '0')
  const [active, setActive] = useState(message?.active ?? true)

  const contentRef = useRef<HTMLTextAreaElement>(null)

  const insertAtCursor = (text: string, cursorOffset?: number) => {
    const textarea = contentRef.current
    if (!textarea) {
      setContent((prev) => prev + text)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.slice(start, end)
    const before = content.slice(0, start)
    const after = content.slice(end)

    // If there's selected text and we're inserting a link, wrap it
    if (selected && text === 'link') {
      const linked = `[${selected}](/)`
      setContent(before + linked + after)
      // Place cursor inside the (/) to type the path
      const pathPos = start + selected.length + 3
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = pathPos
        textarea.focus()
      })
      return
    }

    setContent(before + text + after)
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + (cursorOffset ?? text.length)
      textarea.focus()
    })
  }

  const insertIconAtCursor = (iconName: string) => {
    insertAtCursor(`{icon:${iconName}}`)
  }

  // Link dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const linkCursorPos = useRef<{ start: number; end: number }>({ start: 0, end: 0 })

  const openLinkDialog = () => {
    const textarea = contentRef.current
    const start = textarea?.selectionStart ?? content.length
    const end = textarea?.selectionEnd ?? content.length
    const selected = content.slice(start, end)
    linkCursorPos.current = { start, end }
    setLinkLabel(selected || '')
    setLinkUrl('')
    setShowLinkDialog(true)
  }

  /** Strip origin from internal URLs so they become relative paths */
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim()
    // Known internal origins
    const internalOrigins = [
      'https://ripit.fit',
      'https://staging.ripit.fit',
      'http://localhost:3400',
      'http://localhost:3000',
    ]
    for (const origin of internalOrigins) {
      if (trimmed.startsWith(origin)) {
        return trimmed.slice(origin.length) || '/'
      }
    }
    // Already a relative path
    if (trimmed.startsWith('/')) return trimmed
    return trimmed
  }

  const confirmInsertLink = () => {
    const path = normalizeUrl(linkUrl)
    const label = linkLabel.trim() || path
    const markdown = `[${label}](${path})`

    const { start, end } = linkCursorPos.current
    const before = content.slice(0, start)
    const after = content.slice(end)
    setContent(before + markdown + after)
    setShowLinkDialog(false)

    requestAnimationFrame(() => {
      const textarea = contentRef.current
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = start + markdown.length
        textarea.focus()
      }
    })
  }

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Preview simulation state
  const [simUserType, setSimUserType] = useState<string>('beginner')
  const [simWorkoutCount, setSimWorkoutCount] = useState<string>('0')
  const [precedence, setPrecedence] = useState<PrecedenceResult | null>(null)

  // Fetch precedence info when preview is open
  useEffect(() => {
    if (!showPreview || !isEditing) {
      setPrecedence(null)
      return
    }

    let cancelled = false
    const params = new URLSearchParams({
      placement,
      active: 'true',
    })

    fetch(`/api/admin/messages?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        const others = (json.data || []).filter(
          (m: MessageFormData) => m.id !== message?.id
        )

        const workoutCount = parseInt(simWorkoutCount, 10) || 0
        const minW = minWorkouts ? parseInt(minWorkouts, 10) : null
        const maxW = maxWorkouts ? parseInt(maxWorkouts, 10) : null

        // Check if this message would match the simulated state
        const wouldMatchSelf =
          active &&
          (userType === 'all' || userType === simUserType) &&
          (minW === null || workoutCount >= minW) &&
          (maxW === null || workoutCount <= maxW)

        // Find higher-priority messages that also match
        const competingMessages = others.filter((m: MessageFormData) => {
          if (!m.active) return false
          if (m.userType !== 'all' && m.userType !== simUserType) return false
          if (m.minWorkouts !== null && workoutCount < m.minWorkouts) return false
          if (m.maxWorkouts !== null && workoutCount > m.maxWorkouts) return false
          return true
        })

        const higherPriority = competingMessages.find(
          (m: MessageFormData) => m.priority > parseInt(priority, 10)
        )

        if (!wouldMatchSelf) {
          setPrecedence({ wouldShow: false, suppressedBy: null })
        } else if (higherPriority && placement === 'training_tab') {
          setPrecedence({
            wouldShow: false,
            suppressedBy: {
              id: higherPriority.id!,
              content: higherPriority.content,
              priority: higherPriority.priority,
            },
          })
        } else {
          setPrecedence({ wouldShow: true, suppressedBy: null })
        }
      })
      .catch(() => { if (!cancelled) setPrecedence(null) })

    return () => { cancelled = true }
  }, [showPreview, isEditing, placement, userType, simUserType, simWorkoutCount, priority, active, minWorkouts, maxWorkouts, message?.id])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const data: Record<string, unknown> = {
      name: name.trim() || null,
      content,
      placement,
      userType,
      icon,
      lifecycle,
      minWorkouts: minWorkouts ? parseInt(minWorkouts, 10) : null,
      maxWorkouts: maxWorkouts ? parseInt(maxWorkouts, 10) : null,
      programTargeting: selectedProgramIds.size > 0 ? JSON.stringify([...selectedProgramIds]) : null,
      slides: additionalSlides.length > 0
        ? JSON.stringify([{ content, icon }, ...additionalSlides])
        : null,
      priority: parseInt(priority, 10) || 0,
      active,
    }

    try {
      const url = isEditing
        ? `/api/admin/messages/${message.id}`
        : '/api/admin/messages'
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to save')
        return
      }

      onSave(json.data)
    } catch {
      setError('Failed to save message')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isEditing || !onDelete) return
    if (!confirm('Delete this message? This cannot be undone.')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/messages/${message.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Failed to delete')
        return
      }
      onDelete()
    } catch {
      setError('Failed to delete message')
    } finally {
      setDeleting(false)
    }
  }

  const charCount = content.length
  const isLoggerPlacement = placement === 'exercise_logger'
  const charWarning = isLoggerPlacement && charCount > 180

  const previewMessage = {
    id: message?.id ?? 'preview',
    content,
    icon,
    lifecycle,
    version: message?.version ?? 1,
    slides: additionalSlides.length > 0
      ? JSON.stringify([{ content, icon }, ...additionalSlides])
      : null,
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-900/20 border-2 border-red-700 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Form fields */}
      {/* Name (admin-only) */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Internal label (not shown to users)"
          className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Placement */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Placement
          </label>
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value)}
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="training_tab">Training Tab</option>
            <option value="exercise_logger">Exercise Logger</option>
          </select>
        </div>

        {/* User Type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Audience
          </label>
          <select
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Users</option>
            <option value="beginner">Follow-Along Mode (Beginner)</option>
            <option value="experienced">Full Logging Mode (Experienced)</option>
          </select>
        </div>

        {/* Lifecycle */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Lifecycle
          </label>
          <select
            value={lifecycle}
            onChange={(e) => setLifecycle(e.target.value)}
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="show_always">Show Always</option>
            <option value="show_once">Show Once</option>
            <option value="show_until_dismissed">Show Until Dismissed</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Priority
          </label>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">Higher number = shown first</p>
        </div>

        {/* Min Workouts */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Min Workouts
          </label>
          <input
            type="number"
            min="0"
            value={minWorkouts}
            onChange={(e) => setMinWorkouts(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="Any"
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Max Workouts */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Max Workouts
          </label>
          <input
            type="number"
            min="0"
            value={maxWorkouts}
            onChange={(e) => setMaxWorkouts(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="Any"
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">Inclusive (e.g., 3 means shown at 0, 1, 2, and 3 workouts)</p>
        </div>
      </div>

      {/* Program Targeting */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Program Targeting
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Leave all unchecked to show for any program. Select specific programs to target only those users.
        </p>
        <CommunityProgramSelector
          selectedIds={selectedProgramIds}
          onChange={setSelectedProgramIds}
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Content
        </label>
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-1">
          <select
            onChange={(e) => {
              if (e.target.value) {
                insertIconAtCursor(e.target.value)
                e.target.value = ''
              }
            }}
            defaultValue=""
            className="px-2 py-1 bg-input border-2 border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>Insert icon...</option>
            {MESSAGE_ICON_NAMES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={openLinkDialog}
            className="px-2 py-1 bg-input border-2 border-border text-foreground text-xs hover:bg-secondary transition-colors"
          >
            Insert link
          </button>
          <span className="text-xs text-muted-foreground">
            **bold**, *italic*
          </span>
        </div>
        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Message content"
          className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
        <div className="flex justify-end mt-1">
          <p className={`text-xs ${charWarning ? 'text-yellow-400 font-semibold' : 'text-muted-foreground'}`}>
            {charCount} chars{charWarning ? ' (logger tips should be under 180)' : ''}
          </p>
        </div>

        {/* Link dialog */}
        {showLinkDialog && (
          <div className="mt-2 p-3 bg-muted/30 border-2 border-border space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Insert Link</p>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5">URL</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Paste URL or type /path"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && linkUrl.trim()) confirmInsertLink() }}
                className="w-full px-2 py-1.5 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                Full URLs from ripit.fit or localhost are auto-converted to internal links
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5">Label (optional)</label>
              <input
                type="text"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="Link text (defaults to URL path)"
                onKeyDown={(e) => { if (e.key === 'Enter' && linkUrl.trim()) confirmInsertLink() }}
                className="w-full px-2 py-1.5 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmInsertLink}
                disabled={!linkUrl.trim()}
                className="px-3 py-1 bg-primary text-primary-foreground border border-primary text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() => setShowLinkDialog(false)}
                className="px-3 py-1 bg-muted text-muted-foreground border border-border text-xs font-semibold uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Leading Icon */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Leading Icon
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Shown at the start of the message card.
        </p>
        <div className="flex flex-wrap gap-2">
          {MESSAGE_ICON_NAMES.map((name) => {
            const IconComp = MESSAGE_ICONS[name]
            return (
              <button
                type="button"
                key={name}
                onClick={() => setIcon(name)}
                className={`p-2.5 border-2 transition-colors ${
                  icon === name
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
                }`}
                title={name}
              >
                <IconComp size={20} />
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Selected: {icon}</p>
      </div>

      {/* Additional Slides (Carousel) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Additional Slides
            </p>
            <p className="text-xs text-muted-foreground">
              Add slides to make this message a carousel. The content and icon above are slide 1.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdditionalSlides((prev) => [...prev, { content: '', icon }])}
            className="px-3 py-1 bg-muted text-muted-foreground border-2 border-border hover:bg-secondary text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            + Add Slide
          </button>
        </div>

        {additionalSlides.length > 0 && (
          <div className="space-y-3">
            {additionalSlides.map((slide, i) => {
              const slideNum = i + 2 // slide 1 is the main content
              return (
                <div key={i} className="p-3 border-2 border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Slide {slideNum}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAdditionalSlides((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    value={slide.content}
                    onChange={(e) => {
                      setAdditionalSlides((prev) => {
                        const next = [...prev]
                        next[i] = { ...next[i], content: e.target.value }
                        return next
                      })
                    }}
                    rows={2}
                    placeholder="Slide content"
                    className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y text-sm mb-2"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Icon</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MESSAGE_ICON_NAMES.map((iconName) => {
                        const IconComp = MESSAGE_ICONS[iconName]
                        return (
                          <button
                            type="button"
                            key={iconName}
                            onClick={() => {
                              setAdditionalSlides((prev) => {
                                const next = [...prev]
                                next[i] = { ...next[i], icon: iconName }
                                return next
                              })
                            }}
                            className={`p-1.5 border transition-colors ${
                              slide.icon === iconName
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
                            }`}
                            title={iconName}
                          >
                            <IconComp size={14} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Active Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="accent-primary w-4 h-4"
        />
        <span className="text-sm font-semibold text-foreground">Active</span>
      </label>

      {/* Version (read-only on edit) */}
      {isEditing && message?.version && (
        <p className="text-xs text-muted-foreground">
          Version: {message.version}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover font-semibold uppercase tracking-wider text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-muted text-muted-foreground border-2 border-border hover:bg-secondary font-semibold uppercase tracking-wider text-sm transition-colors"
        >
          Cancel
        </button>

        {isEditing && (
          <div className="flex items-center gap-2 ml-auto">
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                className="px-4 py-2 bg-muted text-muted-foreground border-2 border-border hover:bg-secondary font-semibold uppercase tracking-wider text-sm flex items-center gap-2 transition-colors"
              >
                <Copy size={16} />
                Duplicate
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-900/30 text-red-400 border-2 border-red-700 hover:bg-red-900/50 font-semibold uppercase tracking-wider text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Preview Toggle */}
      <div className="border-t-2 border-border pt-6">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm font-semibold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      {showPreview && (
        <div className="space-y-6">
          {/* User State Simulator */}
          <div className="p-4 bg-muted/30 border-2 border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Simulate User State
            </p>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Logging Mode</label>
                <select
                  value={simUserType}
                  onChange={(e) => setSimUserType(e.target.value)}
                  className="px-2 py-1 bg-input border border-border text-foreground text-sm"
                >
                  <option value="beginner">Follow-Along</option>
                  <option value="experienced">Full Logging</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Completed Workouts</label>
                <input
                  type="number"
                  min="0"
                  value={simWorkoutCount}
                  onChange={(e) => setSimWorkoutCount(e.target.value)}
                  className="w-20 px-2 py-1 bg-input border border-border text-foreground text-sm"
                />
              </div>
            </div>

            {/* Precedence Result */}
            {precedence && (
              <div className={`mt-3 text-xs p-2 border ${
                precedence.wouldShow
                  ? 'border-green-700 bg-green-900/20 text-green-400'
                  : 'border-yellow-700 bg-yellow-900/20 text-yellow-400'
              }`}>
                {precedence.wouldShow ? (
                  'This message would be shown for this user state.'
                ) : precedence.suppressedBy ? (
                  <>
                    Suppressed by message with priority {precedence.suppressedBy.priority}:
                    {' "' + precedence.suppressedBy.content.slice(0, 60) + '..."'}
                  </>
                ) : (
                  'This message would not match the simulated user state.'
                )}
              </div>
            )}
          </div>

          {/* Training Tab Preview */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Training Tab Preview
            </p>
            <div className="bg-background border-2 border-border p-4 max-w-md">
              {/* Mock week header */}
              <div className="text-center mb-3">
                <p className="text-sm font-bold uppercase tracking-wider">Week 1 of 4</p>
                <span className="inline-block px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold uppercase mt-1">
                  Machine Starter
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                This is an introductory week with lower intensity so you can acclimate to strength training.
              </p>

              {/* Message card in position */}
              <div className="mb-3">
                <MessageCard message={previewMessage} variant="training_tab" />
              </div>

              {/* Mock workout rows */}
              <div className="border border-border divide-y divide-border">
                <div className="px-3 py-2.5">
                  <p className="text-sm font-bold uppercase tracking-wider">Day 1: Full Body A</p>
                  <p className="text-xs text-muted-foreground">7 exercises</p>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-bold uppercase tracking-wider">Day 2: Full Body B</p>
                  <p className="text-xs text-muted-foreground">7 exercises</p>
                </div>
              </div>
            </div>
          </div>

          {/* Exercise Logger Preview */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Exercise Logger Preview
            </p>
            <div className="bg-[#1a1a1a] border-2 border-border p-4 max-w-md">
              {/* Mock exercise header */}
              <p className="text-base font-bold uppercase tracking-wider text-white mb-3">
                Bench Press
              </p>

              {/* Mock prescribed sets */}
              <div className="space-y-1.5 mb-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3 px-3 py-2 bg-white/5 border border-white/10">
                    <span className="text-xs text-white/40 w-6">Set {n}</span>
                    <span className="text-sm text-white/70">12 reps</span>
                    <span className="text-sm text-white/50">@ 135 lbs</span>
                  </div>
                ))}
              </div>

              {/* Message card in position */}
              <MessageCard
                message={previewMessage}
                variant="exercise_logger"
                tipCount={3}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
