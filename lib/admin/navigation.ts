import {
  BarChart3,
  Bell,
  Dumbbell,
  FileText,
  Library,
  type LucideIcon,
  MessageSquare,
  Palette,
  SlidersHorizontal,
  Tags,
  Trophy,
  UserPlus,
} from 'lucide-react'

export type NavTier = 1 | 2 | 3

export type NavGroup = 'Learn Content' | 'Training' | 'App'

export interface WorkbenchCounts {
  exercises: number
  feedbackUnresolved: number
  articles: number
  tags: number
  collections: number
  communityPrograms: number
  messages: number
}

export interface NavItem {
  key: string
  label: string
  href: string
  icon: LucideIcon
  tier: NavTier
  group?: NavGroup
  countKey?: keyof WorkbenchCounts
  devChip?: boolean
}

/**
 * Single source of truth for every Workbench destination. Drives the phone
 * launcher, the desktop sidebar, and active-route matching. New sections
 * enter at tier 3 and get promoted to tier 2/1 by observed use.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: 'exercises', label: 'Exercises', href: '/admin/exercises', icon: Dumbbell, tier: 1, countKey: 'exercises' },
  { key: 'feedback', label: 'Feedback', href: '/admin/feedback', icon: MessageSquare, tier: 1, countKey: 'feedbackUnresolved' },

  { key: 'articles', label: 'Articles', href: '/admin/articles', icon: FileText, tier: 2, group: 'Learn Content', countKey: 'articles' },
  { key: 'tags', label: 'Tags', href: '/admin/tags', icon: Tags, tier: 2, group: 'Learn Content', countKey: 'tags' },
  { key: 'collections', label: 'Collections', href: '/admin/collections', icon: Library, tier: 2, group: 'Learn Content', countKey: 'collections' },

  { key: 'community-programs', label: 'Community Programs', href: '/admin/community-programs', icon: Trophy, tier: 2, group: 'Training', countKey: 'communityPrograms' },

  { key: 'messages', label: 'Messages', href: '/admin/messages', icon: Bell, tier: 2, group: 'App', countKey: 'messages' },
  { key: 'tuning', label: 'Tuning', href: '/admin/tuning', icon: SlidersHorizontal, tier: 2, group: 'App' },

  { key: 'analytics', label: 'Analytics', href: '/admin/analytics', icon: BarChart3, tier: 3 },
  { key: 'signups', label: 'Signups', href: '/admin/signups', icon: UserPlus, tier: 3 },
  { key: 'themes', label: 'Themes', href: '/dev/theme-validator?view=grid', icon: Palette, tier: 3, devChip: true },
]

export const NAV_GROUPS_ORDER: NavGroup[] = ['Learn Content', 'Training', 'App']

export const TIER1_ITEMS = NAV_ITEMS.filter((item) => item.tier === 1)
export const TIER2_ITEMS = NAV_ITEMS.filter((item) => item.tier === 2)
export const TIER3_ITEMS = NAV_ITEMS.filter((item) => item.tier === 3)

export function groupTier2Items(): Array<{ group: NavGroup; items: NavItem[] }> {
  return NAV_GROUPS_ORDER.map((group) => ({
    group,
    items: TIER2_ITEMS.filter((item) => item.group === group),
  }))
}

/**
 * Finds the nav item whose href is the closest prefix match for a pathname,
 * so nested routes (e.g. /admin/articles/123/edit) still highlight/label
 * their parent section (e.g. Articles).
 */
export function findNavItemForPath(pathname: string): NavItem | undefined {
  let best: NavItem | undefined
  for (const item of NAV_ITEMS) {
    const itemPath = item.href.split('?')[0]
    if (pathname === itemPath || pathname.startsWith(`${itemPath}/`)) {
      if (!best || itemPath.length > best.href.split('?')[0].length) {
        best = item
      }
    }
  }
  return best
}
