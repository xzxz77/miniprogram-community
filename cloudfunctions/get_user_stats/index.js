// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  // 如果传入了 targetId，则统计目标用户，否则统计调用者
  const targetId = event.targetId || OPENID

  try {
    // Helper to safely count with error handling
    const safeCount = async (collectionName, whereCondition) => {
      try {
        const res = await db.collection(collectionName).where(whereCondition).count()
        return res.total
      } catch (err) {
        console.error(`Error counting ${collectionName}:`, err)
        // If collection doesn't exist or other error, return 0 but log it
        return 0
      }
    }

    // 并行执行所有统计查询
    const [selling, collection, follow, fans] = await Promise.all([
      // 1. 在售商品数
      safeCount('goods', {
        _openid: targetId,
        status: _.in(['active', 'offline']) 
      }),

      // 2. 收藏数 (我收藏的)
      safeCount('favorites', {
        _openid: targetId
      }),

      // 3. 关注数 (我关注的)
      safeCount('follows', {
        _openid: targetId
      }),

      // 4. 粉丝数 (关注我的)
      safeCount('follows', {
        followedId: targetId
      })
    ])

    return {
      success: true,
      data: {
        selling,
        collection,
        follow,
        fans
      }
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err,
      errMsg: err.message // Add explicit error message
    }
  }
}