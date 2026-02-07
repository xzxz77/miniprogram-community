// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const page = event.page || 1
  const pageSize = event.pageSize || 20

  try {
    const res = await db.collection('comments').aggregate()
      .match({
        receiverId: OPENID,
        _openid: _.neq(OPENID) // Exclude self-comments just in case
      })
      .sort({ createTime: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lookup({
        from: 'users',
        localField: '_openid',
        foreignField: '_openid',
        as: 'userInfo'
      })
      .lookup({
        from: 'goods',
        localField: 'goodId',
        foreignField: '_id',
        as: 'goodInfo'
      })
      .project({
        content: 1,
        createTime: 1,
        isRead: 1,
        user: $.arrayElemAt(['$userInfo', 0]),
        good: $.arrayElemAt(['$goodInfo', 0])
      })
      .end()

    return {
      success: true,
      data: res.list
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err
    }
  }
}