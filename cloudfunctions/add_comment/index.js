// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { goodId, content, replyToId } = event

  if (!goodId || !content) {
    return { success: false, msg: '缺少参数' }
  }

  try {
    // 1. Get Good Details to find the owner (receiver)
    const goodRes = await db.collection('goods').doc(goodId).get()
    const good = goodRes.data
    const receiverId = good._openid

    // 2. Add Comment
    const res = await db.collection('comments').add({
      data: {
        _openid: OPENID,
        goodId,
        content,
        replyToId: replyToId || null,
        receiverId: receiverId, // Add receiverId for notifications
        isRead: false,          // Add isRead flag
        createTime: db.serverDate(),
        status: 'active'
      }
    })

    return {
      success: true,
      id: res._id
    }
  } catch (err) {
    return { success: false, error: err }
  }
}