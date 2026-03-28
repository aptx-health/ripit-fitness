'use client'

import TagManager from '@/components/admin/TagManager'

export default function AdminTagsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-6">Tags</h1>
      <TagManager />
    </div>
  )
}
