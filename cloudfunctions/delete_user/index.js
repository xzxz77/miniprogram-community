// cloudfunctions/delete_user/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 1. Delete User Record
    await db.collection('users').where({
      _openid: openid
    }).remove();

    // 2. Mark Goods as Deleted (Optional: or remove them)
    // It's safer to mark them as deleted/offline so transaction history remains for others
    await db.collection('goods').where({
      _openid: openid
    }).update({
      data: {
        status: 'deleted'
      }
    });

    // 3. Remove Favorites (Optional)
    await db.collection('favorites').where({
      _openid: openid
    }).remove();

    // 4. Remove Addresses (Optional)
    // Assuming addresses are in a separate collection or inside user doc. 
    // If separate:
    // await db.collection('addresses').where({ _openid: openid }).remove();

    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, msg: '注销失败' };
  }
};