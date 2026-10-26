import { decisionRoute } from '@/lib/proposals/decision-route'

/** POST /api/admin/proposals/[id]/approve */
export const POST = decisionRoute('approve')
