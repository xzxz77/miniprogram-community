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
    const res = await db.collection('comments').add({
      data: {
        _openid: OPENID,
        goodId,
        content,
        replyToId: replyToId || null,
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