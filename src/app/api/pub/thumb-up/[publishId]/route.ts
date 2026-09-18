import { db } from '@/db/db'
import { genSuccessData, genErrorData } from '@/app/api/utils/gen-res-data'
import { resolveRouteParams, type RouteParams } from '@/lib/route-params'

export async function PATCH(request: Request, { params }: { params: RouteParams<{ publishId: string }> }) {
  const { publishId } = await resolveRouteParams(params) // `publishId` is publish url suffix

  try {
    const p = await db.pubDoc.update({
      where: {
        publishId,
      },
      data: {
        thumbUpCount: {
          increment: 1, // Increment the thumb up count by 1
        },
      },
    })
    return Response.json(genSuccessData(p))
  } catch (ex: any) {
    return Response.json(genErrorData(ex.message))
  }
}
