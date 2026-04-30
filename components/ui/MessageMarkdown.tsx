'use client'

import Link from 'next/link'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { MESSAGE_ICONS } from '@/lib/icons/message-icons'

const ICON_PATTERN = /\{icon:(\w+)\}/g

/**
 * Replace {icon:Name} tokens with <msg-icon> placeholder elements
 * that rehype-raw will pass through to our custom component.
 */
function preprocessIcons(content: string): string {
  return content.replace(ICON_PATTERN, (_match, name) => {
    if (MESSAGE_ICONS[name]) {
      return `<msg-icon name="${name}"></msg-icon>`
    }
    return ''
  })
}

function MsgIcon({ name }: { name?: string }) {
  const Icon = name ? MESSAGE_ICONS[name] : null
  if (!Icon) return null
  return (
    <Icon
      size={16}
      strokeWidth={1.8}
      className="inline-block align-text-bottom mx-0.5 text-current"
      aria-hidden="true"
    />
  )
}

const mdComponents: Record<string, React.ComponentType<React.PropsWithChildren<Record<string, unknown>>>> = {
  p: ({ children }: { children?: React.ReactNode }) => {
    return <p className="mb-1.5 last:mb-0">{children}</p>
  },
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => {
    if (href?.startsWith('/')) {
      return (
        <Link
          href={href}
          className="text-primary hover:text-primary/80 font-semibold underline underline-offset-2"
          {...props}
        >
          {children}
        </Link>
      )
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 font-semibold underline underline-offset-2"
        {...props}
      >
        {children}
      </a>
    )
  },
  'msg-icon': (props: Record<string, unknown>) => {
    const name = (props as { name?: string }).name
    return <MsgIcon name={name} />
  },
}

const allowedElements = ['p', 'strong', 'em', 'a', 'br', 'msg-icon']

interface MessageMarkdownProps {
  content: string
  className?: string
}

export function MessageMarkdown({ content, className }: MessageMarkdownProps) {
  const processed = preprocessIcons(content)

  return (
    <span className={className}>
      <ReactMarkdown
        components={mdComponents}
        allowedElements={allowedElements}
        unwrapDisallowed
        rehypePlugins={[rehypeRaw]}
      >
        {processed}
      </ReactMarkdown>
    </span>
  )
}
