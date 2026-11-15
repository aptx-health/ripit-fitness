'use client'

import dynamic from 'next/dynamic'

// Client-only and loaded on demand, so the panel's code is fetched only when an
// admin's page renders it. Its saved choices live in localStorage, which the
// server can't read.
const AdminQuickPanel = dynamic(() => import('./AdminQuickPanel'), { ssr: false })

export default function AdminQuickPanelLoader() {
  return <AdminQuickPanel />
}
