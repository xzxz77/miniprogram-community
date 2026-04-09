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
      // Fetch user's own posts - skip location filtering
      match._openid = String(userId);
    }

    // 社区帖子云函数
    // Location Filtering（与首页逻辑一致）
    // 当用户选择"广州南方学院"或未选择时，显示所有帖子
    // 当用户选择其他具体地址时，只显示该地区的帖子
    const normalizedLocation = String(userLocation || '').trim();
    const shouldFilterByLocation = !!normalizedLocation && normalizedLocation !== '广州南方学院' && normalizedLocation !== '请选择地址';

    // 如果是获取自己的帖子，不应用位置过滤
    const baseMatch = userId ? { ...match } : { ...match };

    const queryPosts = async (extraMatch = {}) => {
      return await db.collection('posts').aggregate()
        .match({
          ...baseMatch,
          ...extraMatch
        })
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
    };

    let postsRes;

    // 如果是获取自己的帖子，直接查询所有（不应用位置过滤）
    if (userId) {
      postsRes = await queryPosts();
    } else {
      // 1) 先精确匹配
      postsRes = await queryPosts({ location: normalizedLocation });

      // 2) 精确无结果时，再进行模糊匹配
      if (!postsRes.list || postsRes.list.length === 0) {
        const keyword = getLocationKeyword(normalizedLocation);
        const regexText = escapeRegExp(keyword || normalizedLocation);
        postsRes = await queryPosts({
          location: db.RegExp({
            regexp: regexText,
            options: 'i'
          })
        });
      }
    }

    const posts = (postsRes.list || []).map(post => {
      const author = post.author && post.author.length > 0 ? post.author[0] : {};
      return {
        ...post,
        author: {
          nickName: author.nickName || '社区邻居',
          avatarUrl: author.avatarUrl || '/assets/icons/profile.png',
          community: author.community || '广州南方学院'
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

function getLocationKeyword(location = '') {
  const text = String(location).trim();
  if (!text) return '';

  // 常见后缀裁剪，提升“同小区不同写法”的召回率
  const suffixes = ['小区', '花园', '公寓', '广场', '一期', '二期', '三期', '四期', '五期', '栋', '幢'];
  for (const suffix of suffixes) {
    const idx = text.indexOf(suffix);
    if (idx > 0) {
      return text.substring(0, idx + suffix.length);
    }
  }

  // 没有明显后缀时，使用前 6 个字作为关键词
  return text.length > 6 ? text.substring(0, 6) : text;
}

function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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