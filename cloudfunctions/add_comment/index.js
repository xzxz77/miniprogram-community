// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { goodId, postId, content, replyToId } = event

  if ((!goodId && !postId) || !content) {
    return { success: false, msg: '缺少参数' }
  }

  try {
    let receiverId = '';
    
    // 1. Get Target Details to find the owner (receiver)
    if (goodId) {
        const goodRes = await db.collection('goods').doc(goodId).get()
        receiverId = goodRes.data._openid
    } else if (postId) {
        const postRes = await db.collection('posts').doc(postId).get()
        receiverId = postRes.data._openid
    }

    // 2. Add Comment
    const data = {
        _openid: OPENID,
        content,
        replyToId: replyToId || null,
        receiverId: receiverId, 
        isRead: false,
        createTime: db.serverDate(),
        status: 'active'
    };
    
    if (goodId) data.goodId = goodId;
    if (postId) data.postId = postId;

    const res = await db.collection('comments').add({ data })
    
    // 3. Update Comment Count (if post)
    if (postId) {
        await db.collection('posts').doc(postId).update({
            data: {
                commentCount: _.inc(1)
            }
        });
    }

    return {
      success: true,
      id: res._id
    }
  } catch (err) {
    return { success: false, error: err }
  }
}