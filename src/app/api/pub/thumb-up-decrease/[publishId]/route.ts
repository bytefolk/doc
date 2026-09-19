import { db } from '@/db/db'
import { genSuccessData, genErrorData } from '@/app/api/utils/gen-res-data'
import { resolveViewerId } from '@/lib/viewer-id'

export async function PATCH(_request: Request, { params }: { params: { publishId: string } }) {
  const { publishId } = params

  try {
    const { viewerId } = await resolveViewerId()
    const pubDoc = await db.pubDoc.findUnique({ where: { publishId }, select: { id: true, thumbUpCount: true } })
    if (!pubDoc) return Response.json(genErrorData('not found'))

    const deleted = await db.pubDocLike.deleteMany({
      where: { viewerId, pubDocId: pubDoc.id },
    })

    if (deleted.count === 0) {
      return Response.json(genSuccessData({ liked: false, count: pubDoc.thumbUpCount }))
    }

    const newCount = Math.max(0, pubDoc.thumbUpCount - 1)
    await db.pubDoc.update({
      where: { publishId },
      data: { thumbUpCount: newCount },
    })

    return Response.json(genSuccessData({ liked: false, count: newCount }))
  } catch (ex: any) {
    return Response.json(genErrorData(ex.message))
  }
}
