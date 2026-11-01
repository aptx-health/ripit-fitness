import { redirect } from 'next/navigation'
import { legacyProgramRedirectTarget } from '@/lib/training/program-links'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Old program address: the detail page now lives under the Library. */
export default async function ProgramPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  redirect(legacyProgramRedirectTarget(id, query))
}
