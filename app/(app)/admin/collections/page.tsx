'use client'

import CollectionBuilder from '@/components/admin/CollectionBuilder'

export default function AdminCollectionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-6">Collections</h1>
      <CollectionBuilder />
    </div>
  )
}
