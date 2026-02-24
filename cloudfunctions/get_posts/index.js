// cloudfunctions/get_posts/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { category, page = 1, pageSize = 10, userLocation, userId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    let match = {};
    if (category && category !== '全部') {
      match.category = category;
    }
    
    if (userId) {
      // Ensure exact match for openid
      match._openid = String(userId);
    }

    // Location Filtering (DISABLED FOR TESTING)
    // To enable: Uncomment the following block.
    // Logic: If user is NOT in the default test area '幸福花园', restrict posts to their location.
    /*
    if (userLocation && userLocation !== '幸福花园') {
      match.location = userLocation;
    }
    */

    // Aggregate to lookup user info
    const postsRes = await db.collection('posts').aggregate()
      .match(match)
      .sort({ createTime: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lookup({
        from: 'users',
        localField: '_openid',
        foreignField: '_openid',
        as: 'author'
      })
      .end();

    const posts = postsRes.list.map(post => {
      const author = post.author && post.author.length > 0 ? post.author[0] : {};
      return {
        ...post,
        author: {
          nickName: author.nickName || '社区邻居',
          avatarUrl: author.avatarUrl || '/assets/icons/profile.png',
          community: author.community || '幸福花园' // Mock community name
        },
        isLiked: post.likes ? post.likes.includes(openid) : false,
        likeCount: post.likes ? post.likes.length : 0,
        commentCount: post.commentCount || 0,
        timeAgo: formatTime(post.createTime)
      };
    });

    return {
      success: true,
      data: posts
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