import 'server-only' // 标记只在服务端使用（客户端组件引入会报错）
import { auth } from 'auth'
import { db } from '@/db/db'

const ENV = process.env.NODE_ENV

export async function getUserInfo() {
  if (ENV === 'test') return null

  const session = await auth()
  if (!session?.user) {
    return null
  }

  const user = session.user // 格式如 { id, name, email, image }
  if (user.email == null) {
    return null
  }

  try {
    const persistedUser = await db.user.findUnique({
      where: { email: user.email },
      select: { id: true, email: true, name: true, image: true },
    })
    if (persistedUser == null) {
      return null
    }
    return { ...user, ...persistedUser }
  } catch (e) {
    console.error('get user info error ', e)
    return null
  }
}
