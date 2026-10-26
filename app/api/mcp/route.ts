import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { NextResponse } from 'next/server'
import { resolveAgentToken } from '@/lib/agent-tokens'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { callTool, listTools, type ToolContext } from '@/lib/mcp/tools'
import { notify } from '@/lib/notify'
import { agentMcpLimiter, checkRateLimitWithHeaders } from '@/lib/rate-limit'

/**
 * MCP server for agents (Streamable HTTP, stateless: a fresh server and
 * transport per request). Auth is a personal access token from
 * lib/agent-tokens.ts sent as `Authorization: Bearer <token>`.
 */

export const dynamic = 'force-dynamic'

function buildServer(ctx: ToolContext): Server {
  const server = new Server({ name: 'ripit', version: '1.0.0' }, { capabilities: { tools: {} } })
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listTools() }))
  server.setRequestHandler(CallToolRequestSchema, async (req) =>
    callTool(prisma, ctx, req.params.name, req.params.arguments ?? {})
  )
  return server
}

async function handle(request: Request): Promise<Response> {
  try {
    const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
    const agent = bearer ? await resolveAgentToken(prisma, bearer) : null
    if (!agent) {
      logger.debug({ hasBearer: !!bearer }, 'MCP auth: unauthorized')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
      )
    }

    const rl = await checkRateLimitWithHeaders(agentMcpLimiter, agent.tokenId, { endpoint: '/api/mcp' })
    if (rl.response) return rl.response

    const server = buildServer({ ...agent, notify })
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    await server.connect(transport)
    const response = await transport.handleRequest(request)

    for (const [k, v] of Object.entries(rl.headers)) response.headers.set(k, v)
    return response
  } catch (error) {
    logger.error({ error }, 'MCP request failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = handle
export const GET = handle
export const DELETE = handle
