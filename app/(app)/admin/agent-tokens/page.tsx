import { KeyRound } from 'lucide-react'
import { redirect } from 'next/navigation'
import AgentTokensManager from '@/components/admin/proposals/AgentTokensManager'
import { isAdminRole } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'

/**
 * Personal access tokens for agents calling /api/mcp. Admin-only (the shared
 * admin layout also admits editors, so re-guard here).
 */
export default async function AgentTokensPage() {
  const { user, error } = await getCurrentUser()
  if (error || !user) redirect('/login')
  if (!isAdminRole(user.role)) redirect('/settings')

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
          <KeyRound size={24} className="text-primary" />
          Agent Tokens
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tokens let an agent read your training data and propose changes through the MCP server at
          /api/mcp. Send one as <code className="text-foreground">Authorization: Bearer &lt;token&gt;</code>.
        </p>
      </div>
      <AgentTokensManager />
    </div>
  )
}
