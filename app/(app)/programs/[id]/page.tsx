import { redirect } from 'next/navigation'

export default async function ProgramPage() {
  // Programs are now viewed via /training (active program) or /programs (listing)
  redirect('/training')
}
