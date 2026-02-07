// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { chatId, scope, type = 'chat' } = event // type: 'chat' | 'interaction'

  try {
    if (type === 'interaction') {
      const res = await db.collection('comments')
        .where({
          receiverId: OPENID,
          isRead: false
        })
        .update({
          data: {
            isRead: true
          }
        })
      return {
        success: true,
        updated: res.stats.updated
      }
    }

    let matchCondition = {
      receiverId: OPENID,
      isRead: false
    }

    if (scope !== 'all') {
      if (!chatId) {
        return { success: false, msg: 'Missing chatId' }
      }
      matchCondition.chatId = chatId
    }

    // 批量更新
    const res = await db.collection('messages')
      .where(matchCondition)
      .update({
        data: {
          isRead: true
        }
      })

    return {
      success: true,
      updated: res.stats.updated
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err
    }
  }
}