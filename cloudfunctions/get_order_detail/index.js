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

    // Safe access to goodSnapshot
    const goodSnapshot = order.goodSnapshot || {};
    let productImage = goodSnapshot.image || '';
    if (Array.isArray(productImage)) {
        productImage = productImage[0] || '';
    }

    return {
      success: true,
      data: {
        ...order,
        // Buyer info
        buyerInfo: {
            nickName: buyerInfo.nickName || '买家',
            avatarUrl: buyerInfo.avatarUrl || '/assets/icons/profile.png'
        },
        // Product info
        good: {
            title: goodSnapshot.title || '商品信息',
            price: goodSnapshot.price || order.totalPrice || 0,
            images: Array.isArray(goodSnapshot.image) ? goodSnapshot.image : [goodSnapshot.image || '']
        },
        // Amount
        amount: order.totalPrice || goodSnapshot.price || 0,
        // Refund info
        refundReason: order.refundReason || '',
        refundDescription: order.refundDescription || '',
        refundEvidence: order.refundEvidence || [],
        refundApplyTime: order.refundApplyTime ? formatDate(order.refundApplyTime) : null
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

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const h = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}