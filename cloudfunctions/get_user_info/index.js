// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const targetOpenId = event.openid

  if (!targetOpenId) {
    return { success: false, msg: '缺少 openid' }
  }

  try {
    const res = await db.collection('users').where({
      _openid: targetOpenId
    }).get()

    if (res.data.length > 0) {
      // 只返回公开信息，过滤敏感字段
      const user = res.data[0]
      return {
        success: true,
        data: {
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          credit: user.credit || '信用极好',
          verified: user.verified || false,
          bio: user.bio || ''
        }
      }
    } else {
      return { success: false, msg: '用户不存在' }
    }
  } catch (err) {
    return { success: false, error: err }
  }
}