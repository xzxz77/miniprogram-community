// cloudfunctions/get_order_detail/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { orderId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!orderId) {
    return { success: false, msg: 'Missing orderId' };
  }

  try {
    const orderRes = await db.collection('orders').doc(orderId).get();
    const order = orderRes.data;

    // Check permission: only buyer or seller can view
    if (order._openid !== openid && order.sellerId !== openid) {
      return { success: false, msg: '无权查看此订单' };
    }

    // Fetch buyer info
    let buyerInfo = {};
    try {
      const userRes = await db.collection('users').where({
        _openid: order._openid
      }).get();
      
      if (userRes.data.length > 0) {
        buyerInfo = userRes.data[0];
      }
    } catch (e) {
      console.error('Fetch buyer info failed', e);
    }

    return {
      success: true,
      data: {
        ...order,
        buyerInfo: {
            nickName: buyerInfo.nickName || '买家',
            avatarUrl: buyerInfo.avatarUrl || '/assets/icons/profile.png'
        }
      }
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      msg: '订单不存在或获取失败'
    };
  }
};