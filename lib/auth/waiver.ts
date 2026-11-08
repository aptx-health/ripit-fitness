import type { PrismaClient } from '@prisma/client'
import { CURRENT_WAIVER_VERSION } from '@/lib/constants/waiver'

/** Whether the user has accepted the current waiver: the authoritative DB check (middleware is edge-only). */
export async function hasCurrentWaiver(db: PrismaClient, userId: string): Promise<boolean> {
  const acceptance = await db.waiverAcceptance.findFirst({
    where: { userId, waiverVersion: CURRENT_WAIVER_VERSION },
    select: { id: true },
  })
  return acceptance !== null
}
