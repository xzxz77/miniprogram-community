// cloudfunctions/get_post_detail/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { postId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!postId) {
    return { success: false, msg: '缺少参数' };
  }

  try {
    // 1. Get Post
    // Use aggregation to lookup author
    const postRes = await db.collection('posts').aggregate()
      .match({ _id: postId })
      .lookup({
        from: 'users',
        localField: '_openid',
        foreignField: '_openid',
        as: 'author'
      })
      .end();

    if (postRes.list.length === 0) {
      return { success: false, msg: '帖子不存在' };
    }

    const post = postRes.list[0];
    const author = post.author && post.author.length > 0 ? post.author[0] : {};

    // 2. Increment View Count
    await db.collection('posts').doc(postId).update({
      data: {
        viewCount: _.inc(1)
      }
    });

    // 3. Format Data
    const result = {
      ...post,
      author: {
        nickName: author.nickName || '社区邻居',
        avatarUrl: author.avatarUrl || '/assets/icons/profile.png',
        community: author.community || '幸福花园'
      },
      isLiked: post.likes ? post.likes.includes(openid) : false,
      likeCount: post.likes ? post.likes.length : 0,
      timeAgo: formatTime(post.createTime),
      createTime: post.createTime // Keep original for details
    };

    return {
      success: true,
      data: result
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      msg: err.message
    };
  }
};

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