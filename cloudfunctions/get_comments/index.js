// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

exports.main = async (event, context) => {
  const { goodId } = event

  if (!goodId) {
    return { success: false, msg: 'Missing goodId' }
  }

  try {
    const res = await db.collection('comments').aggregate()
      .match({
        goodId: goodId,
        status: 'active'
      })
      .sort({ createTime: -1 })
      .lookup({
        from: 'users',
        localField: '_openid',
        foreignField: '_openid',
        as: 'userInfo'
      })
      .project({
        content: 1,
        createTime: 1,
        replyToId: 1,
        user: $.arrayElemAt(['$userInfo', 0])
      })
      .end()

    return {
      success: true,
      data: res.list
    }
  } catch (err) {
    return { success: false, error: err }
  }
}