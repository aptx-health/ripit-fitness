'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useReducer, useState } from 'react'
import { MessageEditor } from '@/components/admin/MessageEditor'
import type { MessageFormData } from '@/components/admin/MessageEditor'

export default function EditMessagePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [message, setMessage] = useState<MessageFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, refresh] = useReducer((x: number) => x + 1, 0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey triggers re-fetch intentionally
  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/messages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((json) => { if (!cancelled) { setMessage(json.data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Message not found'); setLoading(false) } })
    return () => { cancelled = true }
  }, [id, refreshKey])

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>
  if (error) return <div className="text-sm text-red-400">{error}</div>
  if (!message) return null

  return (
    <div>
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-6">Edit Message</h1>
      <MessageEditor
        message={message}
        onSave={() => router.push('/admin/messages')}
        onCancel={() => router.push('/admin/messages')}
        onDelete={() => router.push('/admin/messages')}
        onDuplicate={async () => {
          const res = await fetch(`/api/admin/messages/${id}/duplicate`, { method: 'POST' })
          if (res.ok) {
            const json = await res.json()
            router.push(`/admin/messages/${json.data.id}/edit`)
          }
        }}
      />
    </div>
  )
}
