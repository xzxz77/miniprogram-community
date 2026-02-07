// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    const res = await db.collection('comments').where({
      receiverId: OPENID,
      isRead: false,
      _openid: _.neq(OPENID)
    }).count()

    return {
      success: true,
      total: res.total
    }
  } catch (err) {
    return {
      success: false,
      error: err
    }
  }
}