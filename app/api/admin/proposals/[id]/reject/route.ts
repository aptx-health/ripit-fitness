import { decisionRoute } from '@/lib/proposals/decision-route'

/** POST /api/admin/proposals/[id]/reject */
export const POST = decisionRoute('reject')
