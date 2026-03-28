'use client'

import { useRouter } from 'next/navigation'
import ArticleEditor from '@/components/admin/ArticleEditor'

export default function NewArticlePage() {
  const router = useRouter()

  return (
    <div>
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-6">New Article</h1>
      <ArticleEditor
        onSave={(article) => {
          router.push(`/admin/articles/${article.id}/edit`)
        }}
        onCancel={() => router.push('/admin/articles')}
      />
    </div>
  )
}
