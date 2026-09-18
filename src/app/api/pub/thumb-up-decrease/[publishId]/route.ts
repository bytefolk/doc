import { db } from '@/db/db'
import { genSuccessData, genErrorData } from '@/app/api/utils/gen-res-data'
import { resolveRouteParams, type RouteParams } from '@/lib/route-params'

export async function PATCH(_request: Request, { params }: { params: RouteParams<{ publishId: string }> }) {
  const { publishId } = await resolveRouteParams(params) // `publishId` is publish url suffix

  try {
    // Clamp at zero so duplicate cancellation cannot store a negative count.
    // Identity is still browser-local (localStorage); this endpoint is
    // idempotent with respect to a zero count, not with respect to a user.
    await db.pubDoc.updateMany({
      where: {
        publishId,
        thumbUpCount: {
          gt: 0,
        },
      },
      data: {
        thumbUpCount: {
          decrement: 1,
        },
      },
    })
    const publication = await db.pubDoc.findUnique({
      where: {
        publishId,
      },
    })
    if (!publication) {
      return Response.json(genErrorData('Publication not found'))
    }
    return Response.json(genSuccessData(publication))
  } catch (error) {
    console.error(error)
    return Response.json(genErrorData('Unable to update like count'))
  }
}
