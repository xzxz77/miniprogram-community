const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { orderId, reason, description, evidence } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!orderId || !reason) {
    return { success: false, msg: 'Missing required fields' };
  }

  try {
    const orderRes = await db.collection('orders').doc(orderId).get();
    const order = orderRes.data;

    if (!order) {
      return { success: false, msg: '订单不存在' };
    }

    if (order._openid !== openid) {
      return { success: false, msg: '无权操作' };
    }

    if (order.status !== 'completed') {
      return { success: false, msg: '当前订单状态无法申请退款' };
    }

    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'refund_pending',
        refundReason: reason,
        refundDescription: description || '',
        refundEvidence: evidence || [],
        refundApplyTime: db.serverDate()
      }
    });

    return { success: true, msg: '申请提交成功' };

  } catch (err) {
    console.error(err);
    return { success: false, msg: '申请失败', error: err };
  }
};