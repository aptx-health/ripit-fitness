'use client'

import { Eye, Pencil } from 'lucide-react'
import { useState } from 'react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

/**
 * Split-pane markdown editor with raw text and basic preview.
 * Preview renders a simplified version — full markdown rendering
 * happens on the article detail page.
 */
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
        <div className="min-h-[400px] p-4 bg-card border-2 border-border overflow-auto prose-invert">
          <MarkdownPreview content={value} />
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

function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return <p className="text-muted-foreground italic">Nothing to preview</p>
  }

  // Basic markdown rendering — headings, bold, italic, images, links, code blocks, lists
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType
      elements.push(
        <Tag key={elements.length} className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} pl-6 my-2 space-y-1`}>
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-foreground">
              <InlineMarkdown text={item} />
            </li>
          ))}
        </Tag>
      )
      listItems = []
      listType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={elements.length} className="bg-zinc-900 border border-border p-3 my-2 overflow-x-auto">
            <code className="text-xs text-green-400">{codeLines.join('\n')}</code>
          </pre>
        )
        codeLines = []
        inCodeBlock = false
      } else {
        flushList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    // Check for list items
    const ulMatch = line.match(/^[-*]\s+(.+)/)
    const olMatch = line.match(/^\d+\.\s+(.+)/)

    if (ulMatch) {
      if (listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(ulMatch[1])
      continue
    }

    if (olMatch) {
      if (listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(olMatch[1])
      continue
    }

    flushList()

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-lg font-bold mt-4 mb-2 text-foreground">{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-xl font-bold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-bold mt-6 mb-3 text-foreground">{line.slice(2)}</h1>)
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-3" />)
    } else {
      elements.push(
        <p key={i} className="text-sm text-foreground leading-relaxed">
          <InlineMarkdown text={line} />
        </p>
      )
    }
  }
  flushList()

  return <div>{elements}</div>
}

function InlineMarkdown({ text }: { text: string }) {
  // Process: images, links, bold, italic, inline code
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining) {
    // Image: ![alt](url)
    const imgMatch = remaining.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (imgMatch && imgMatch.index !== undefined) {
      if (imgMatch.index > 0) {
        parts.push(<span key={key++}>{processInline(remaining.slice(0, imgMatch.index))}</span>)
      }
      parts.push(
        // biome-ignore lint/performance/noImgElement: markdown preview renders user-provided URLs
        <img key={key++} src={imgMatch[2]} alt={imgMatch[1]} className="max-w-full h-auto my-2 border border-border" />
      )
      remaining = remaining.slice(imgMatch.index + imgMatch[0].length)
      continue
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch && linkMatch.index !== undefined) {
      if (linkMatch.index > 0) {
        parts.push(<span key={key++}>{processInline(remaining.slice(0, linkMatch.index))}</span>)
      }
      parts.push(
        <a key={key++} href={linkMatch[2]} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length)
      continue
    }

    parts.push(<span key={key++}>{processInline(remaining)}</span>)
    break
  }

  return <>{parts}</>
}

function processInline(text: string): React.ReactNode {
  // Bold: **text**
  // Italic: *text*
  // Inline code: `text`
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/)
    .map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-zinc-800 px-1 py-0.5 text-xs text-green-400">{part.slice(1, -1)}</code>
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic">{part.slice(1, -1)}</em>
      }
      return part
    })
}
