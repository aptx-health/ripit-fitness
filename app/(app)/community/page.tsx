import { redirect } from 'next/navigation'
import { legacyCommunityRedirectTarget } from '@/lib/library/links'

export default function CommunityPage() {
  redirect(legacyCommunityRedirectTarget())
}
