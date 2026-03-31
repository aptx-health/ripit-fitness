import { redirect } from 'next/navigation'

export default function CommunityPage() {
  redirect('/programs?tab=browse')
}
