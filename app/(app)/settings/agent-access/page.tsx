import { redirect } from 'next/navigation'
import AgentAccess from '@/components/features/agent-access/AgentAccess'
import { appOrigin } from '@/lib/app-origin'
import { getCurrentUser } from '@/lib/auth/server'

export const metadata = {
  title: 'Agent access',
}

/** Settings → Agent access: connect your own agent to the MCP server. */
export default async function AgentAccessPage() {
  const { user } = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // Read at request time: NEXT_PUBLIC_APP_URL is inlined at build and can be another environment's.
  const mcpUrl = `${await appOrigin()}/api/mcp`

  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <AgentAccess mcpUrl={mcpUrl} />
      </div>
    </main>
  )
}
