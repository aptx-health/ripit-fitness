'use client'

import { useRouter } from 'next/navigation'
import { MessageEditor } from '@/components/admin/MessageEditor'

export default function NewMessagePage() {
  const router = useRouter()

  return (
    <div>
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-6">New Message</h1>
      <MessageEditor
        onSave={(message) => {
          router.push(`/admin/messages/${message.id}/edit`)
        }}
        onCancel={() => router.push('/admin/messages')}
      />
    </div>
  )
}
