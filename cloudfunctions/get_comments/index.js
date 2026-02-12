// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

exports.main = async (event, context) => {
  const { goodId, postId } = event

  if (!goodId && !postId) {
    return { success: false, msg: 'Missing target id' }
  }

  const match = {
      status: 'active'
  };
  if (goodId) match.goodId = goodId;
  if (postId) match.postId = postId;

  try {
    const res = await db.collection('comments').aggregate()
      .match(match)
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

    const comments = res.list.map(comment => {
      const user = comment.user || {};
      return {
        ...comment,
        user: {
          nickName: user.nickName || '匿名用户',
          avatarUrl: user.avatarUrl || '/assets/icons/profile.png'
        },
        timeAgo: formatTime(comment.createTime)
      };
    });

    return {
      success: true,
      data: comments
    }
  } catch (err) {
    return { success: false, error: err }
  }
}

function formatTime(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diff = (now - d) / 1000;
  
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  return Math.floor(diff / 86400) + '天前';
}