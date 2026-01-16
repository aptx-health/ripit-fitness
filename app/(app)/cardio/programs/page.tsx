import { redirect } from 'next/navigation'

export default async function CardioProgramsPage() {
  // Redirect to consolidated programs page with cardio tab
  redirect('/programs?tab=cardio')
}
