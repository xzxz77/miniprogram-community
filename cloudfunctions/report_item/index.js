// cloudfunctions/report_item/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { goodId, reason, description, evidence } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!goodId || !reason) {
    return { success: false, msg: 'Missing required fields' };
  }

  try {
    // Check if already reported
    const existing = await db.collection('reports').where({
      goodId: goodId,
      _openid: openid
    }).count();

    if (existing.total > 0) {
      return { success: false, msg: '您已举报过该商品' };
    }

    // Add report
    await db.collection('reports').add({
      data: {
        _openid: openid,
        goodId: goodId,
        reason: reason,
        description: description || '',
        evidence: evidence || [],
        createTime: db.serverDate(),
        status: 'pending' // pending, processed, rejected
      }
    });

    return { success: true, msg: '举报成功' };
  } catch (err) {
    console.error(err);
    return { success: false, msg: '举报失败，请稍后重试' };
  }
};