// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 格式化时间辅助函数
const formatTime = (date) => {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  const oneDay = 24 * 60 * 60 * 1000
  
  if (diff < oneDay && now.getDate() === d.getDate()) {
    // 当天：显示 HH:mm
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  } else if (diff < oneDay * 2) {
    // 昨天
    return '昨天'
  } else if (diff < oneDay * 7) {
    // 一周内
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weeks[d.getDay()]
  } else {
    // 早期
    const M = (d.getMonth() + 1).toString().padStart(2, '0')
    const D = d.getDate().toString().padStart(2, '0')
    return `${M}-${D}`
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    // 1. 聚合查询：按 chatId 分组，取最新一条消息
    const conversationList = await db.collection('messages').aggregate()
      .match(_.or([
        { senderId: OPENID },
        { receiverId: OPENID }
      ]))
      .sort({ timestamp: -1 })
      .group({
        _id: '$chatId',
        lastMessage: { $first: '$$ROOT' },
        // 简单计算未读数（需配合 isRead 字段，目前暂时未能准确计数，先尝试统计 receiverId 为我且没有 isRead 标记的）
        unreadCount: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$receiverId', OPENID] },
                  { $ne: ['$isRead', true] } // 统计未读（包括 false 和 undefined）
                ] 
              }, 
              1, 
              0
            ]
          }
        }
      })
      .limit(20)
      .end()

    if (conversationList.list.length === 0) {
      return { success: true, data: [] }
    }

    // 2. 补充对方用户信息
    // 收集所有对方的 openid
    const otherIds = conversationList.list.map(item => {
      const msg = item.lastMessage
      return msg.senderId === OPENID ? msg.receiverId : msg.senderId
    })

    // 批量查询用户信息
    const usersRes = await db.collection('users').where({
      _openid: _.in(otherIds)
    }).get()
    
    const userMap = {}
    usersRes.data.forEach(u => {
      userMap[u._openid] = u
    })

    // 3. 组装最终数据
    const resultList = conversationList.list.map(item => {
      const msg = item.lastMessage
      const otherId = msg.senderId === OPENID ? msg.receiverId : msg.senderId
      const user = userMap[otherId] || {}
      
      return {
        id: otherId, // 注意：跳转 chat-detail 需要对方的 ID，不是 chatId
        chatId: item._id, // 保留 chatId 备用
        name: user.nickName || '用户' + otherId.substr(0, 4),
        avatar: user.avatarUrl || '/assets/icons/profile.png',
        unread: item.unreadCount || 0,
        time: formatTime(msg.timestamp),
        message: msg.type === 'image' ? '[图片]' : msg.content,
        timestamp: msg.timestamp, // 用于排序
        goodsImg: '' // 暂无商品图片关联逻辑
      }
    })

    // 按时间再次倒序（因为 Promise.all 或 map 可能打乱顺序，且 group 后顺序不一定完全严格）
    resultList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    return {
      success: true,
      data: resultList
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err
    }
  }
}