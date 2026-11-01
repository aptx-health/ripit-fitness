import { redirect } from 'next/navigation'
import { legacyProgramsRedirectTarget } from '@/lib/library/links'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Old Programs tab: the list now lives in the Library. */
export default async function ProgramsPage({ searchParams }: Props) {
  redirect(legacyProgramsRedirectTarget(await searchParams))
}
