const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

exports.main = async (event, context) => {
  const { action, postId, goodId, content, replyToId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!action) {
    return { success: false, msg: 'Missing action' };
  }

  try {
    if (action === 'add') {
      return await addComment(openid, event);
    } else if (action === 'list') {
      return await listComments(event);
    } else {
      return { success: false, msg: 'Invalid action' };
    }
  } catch (err) {
    console.error(err);
    return { success: false, msg: err.message || 'Internal Server Error' };
  }
};

async function addComment(openid, { postId, goodId, content, replyToId }) {
  if (!content) {
    return { success: false, msg: 'Content is required' };
  }

  let collectionName = '';
  let targetId = '';
  
  if (postId) {
    collectionName = 'posts';
    targetId = postId;
  } else if (goodId) {
    collectionName = 'goods';
    targetId = goodId;
  } else {
    return { success: false, msg: 'Missing target' };
  }

  // 1. Get Target Details
  const targetRes = await db.collection(collectionName).doc(targetId).get();
  const receiverId = targetRes.data._openid;

  // 2. Add Comment
  const data = {
    _openid: openid,
    content,
    replyToId: replyToId || null,
    receiverId,
    isRead: false,
    createTime: db.serverDate(),
    status: 'active'
  };
  
  if (postId) data.postId = postId;
  if (goodId) data.goodId = goodId;

  const res = await db.collection('comments').add({ data });

  // 3. Update Count
  if (postId) {
    await db.collection('posts').doc(postId).update({
      data: { commentCount: _.inc(1) }
    });
  }

  return { success: true, id: res._id };
}

async function listComments({ postId, goodId }) {
  const match = { status: 'active' };
  if (postId) match.postId = postId;
  if (goodId) match.goodId = goodId;

  const res = await db.collection('comments').aggregate()
    .match(match)
    .sort({ createTime: -1 })
    .lookup({
      from: 'users',
      localField: '_openid',
      foreignField: '_openid',
      as: 'userInfo'
    })
    .end();

  const comments = res.list.map(c => ({
    ...c,
    user: (c.userInfo && c.userInfo[0]) ? c.userInfo[0] : { nickName: '匿名用户', avatarUrl: '/assets/icons/profile.png' },
    timeAgo: formatTime(c.createTime)
  }));

  return { success: true, data: comments };
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