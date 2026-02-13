// cloudfunctions/publish_post/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { content, images, category, location } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!content) {
    return { success: false, msg: '内容不能为空' };
  }

  try {
    const postData = {
      _openid: openid,
      content,
      images: images || [],
      category: category || '全部',
      location: location || '幸福花园',
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      likes: [],
      commentCount: 0,
      viewCount: 0
    };

    const res = await db.collection('posts').add({
      data: postData
    });

    return {
      success: true,
      id: res._id
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      msg: err.message || '发布失败'
    };
  }
};