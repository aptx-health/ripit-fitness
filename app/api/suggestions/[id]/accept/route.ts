import { suggestionDecisionRoute } from '@/lib/suggestions/decision-route'

/** POST /api/suggestions/[id]/accept */
export const POST = suggestionDecisionRoute('accept')
