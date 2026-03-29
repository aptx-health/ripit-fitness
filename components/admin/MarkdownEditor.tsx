'use client'

import { Eye, Pencil } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false)

  const wordCount = value.trim().split(/\s+/).filter(Boolean).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Body (Markdown)
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {wordCount} words / ~{readTime} min read
          </span>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {showPreview ? <Pencil size={12} /> : <Eye size={12} />}
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {showPreview ? (
        <div className="min-h-[400px] p-4 bg-card border-2 border-border overflow-auto prose-learn">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Nothing to preview</p>
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your article content in markdown..."
          className="w-full min-h-[400px] px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-y"
        />
      )}
    </div>
  )
}
