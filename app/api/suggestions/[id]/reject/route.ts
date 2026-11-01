import { suggestionDecisionRoute } from '@/lib/suggestions/decision-route'

/** POST /api/suggestions/[id]/reject */
export const POST = suggestionDecisionRoute('reject')
