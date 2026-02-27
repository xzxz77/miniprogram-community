const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 1. Delete User Record (Profile & Address)
    await db.collection('users').where({
      _openid: openid
    }).remove();

    // 2. Delete Goods
    await db.collection('goods').where({
      _openid: openid
    }).remove();

    // 3. Delete Posts
    await db.collection('posts').where({
      _openid: openid
    }).remove();

    // 4. Delete Comments
    await db.collection('comments').where({
      _openid: openid
    }).remove();

    // 5. Delete Favorites
    await db.collection('favorites').where({
      _openid: openid
    }).remove();

    // 6. Delete Messages (Sent by user)
    await db.collection('messages').where({
      senderId: openid
    }).remove();
    // Optional: Also delete received messages? Usually we keep them for the other party.
    // But "clear all data" might imply removing their trace. 
    // Let's stick to senderId for now to avoid breaking other user's context too much.

    // 7. Delete Reports
    await db.collection('reports').where({
      _openid: openid
    }).remove();

    // 8. Delete Judge Cases (Plaintiff)
    await db.collection('judge_cases').where({
      plaintiffId: openid
    }).remove();

    // 9. Delete Orders (Buyer)
    await db.collection('orders').where({
      _openid: openid
    }).remove();

    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, msg: '注销失败' };
  }
};