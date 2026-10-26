import { decisionRoute } from '@/lib/proposals/decision-route'

/** POST /api/admin/proposals/[id]/revert */
export const POST = decisionRoute('revert')
