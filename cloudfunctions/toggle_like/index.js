// cloudfunctions/toggle_like/index.js
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

  if (!postId) return { success: false };

  try {
    const postRes = await db.collection('posts').doc(postId).get();
    const post = postRes.data;
    const likes = post.likes || [];
    const isLiked = likes.includes(openid);

    let updateOp;
    if (isLiked) {
      updateOp = _.pull(openid);
    } else {
      updateOp = _.addToSet(openid);
    }

    await db.collection('posts').doc(postId).update({
      data: {
        likes: updateOp
      }
    });

    return {
      success: true,
      isLiked: !isLiked,
      likeCount: isLiked ? likes.length - 1 : likes.length + 1
    };

  } catch (err) {
    console.error(err);
    return { success: false, msg: err.message };
  }
};