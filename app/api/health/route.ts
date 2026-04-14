/**
 * Legacy health endpoint — preserved as an alias for /api/health/ready so
 * external monitors don't break during the k8s probe split. New probes should
 * target /api/health/live (liveness) and /api/health/ready (readiness).
 */
export { dynamic, GET } from './ready/route'
