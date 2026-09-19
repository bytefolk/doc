import { db } from '@/db/db'
import { genSuccessData, genErrorData, genUnAuthData } from '@/app/api/utils/gen-res-data'
import { resolveViewerId } from '@/lib/viewer-id'

export async function GET(_request: Request, { params }: { params: { publishId: string } }) {
  const { publishId } = params

  try {
    const { viewerId } = await resolveViewerId()
    const pubDoc = await db.pubDoc.findUnique({ where: { publishId }, select: { id: true, thumbUpCount: true } })
    if (!pubDoc) return Response.json(genErrorData('not found'))

    const like = await db.pubDocLike.findUnique({
      where: { viewerId_pubDocId: { viewerId, pubDocId: pubDoc.id } },
    })

    return Response.json(genSuccessData({ liked: !!like, count: pubDoc.thumbUpCount }))
  } catch (ex: any) {
    return Response.json(genErrorData(ex.message))
  }
}

export async function PATCH(_request: Request, { params }: { params: { publishId: string } }) {
  const { publishId } = params

  try {
    const { viewerId } = await resolveViewerId()
    const pubDoc = await db.pubDoc.findUnique({ where: { publishId }, select: { id: true } })
    if (!pubDoc) return Response.json(genErrorData('not found'))

    const existing = await db.pubDocLike.findUnique({
      where: { viewerId_pubDocId: { viewerId, pubDocId: pubDoc.id } },
    })
    if (existing) {
      const current = await db.pubDoc.findUnique({ where: { publishId }, select: { thumbUpCount: true } })
      return Response.json(genSuccessData({ liked: true, count: current!.thumbUpCount }))
    }

    const [updated] = await db.$transaction([
      db.pubDoc.update({
        where: { publishId },
        data: { thumbUpCount: { increment: 1 } },
        select: { thumbUpCount: true },
      }),
      db.pubDocLike.create({
        data: { viewerId, pubDocId: pubDoc.id },
      }),
    ])

    return Response.json(genSuccessData({ liked: true, count: updated.thumbUpCount }))
  } catch (ex: any) {
    return Response.json(genErrorData(ex.message))
  }
}
