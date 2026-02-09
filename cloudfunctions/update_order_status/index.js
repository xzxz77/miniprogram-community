// cloudfunctions/update_order_status/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { orderId, action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!orderId || !action) {
    return { success: false, msg: '参数错误' };
  }

  try {
    const orderRes = await db.collection('orders').doc(orderId).get();
    const order = orderRes.data;

    if (!order) {
      return { success: false, msg: '订单不存在' };
    }

    let updateData = {};
    let newStatus = '';

    if (action === 'ship') {
      // Confirm Shipment: Only seller can do this
      if (order.sellerId !== openid) {
        return { success: false, msg: '无权操作' };
      }
      if (order.status !== 'paid') {
        return { success: false, msg: '当前状态不可发货' };
      }
      newStatus = 'shipped';
      updateData = {
        status: newStatus,
        updateTime: db.serverDate(),
        shippedTime: db.serverDate()
      };
    } else if (action === 'receive') {
      // Confirm Receipt: Only buyer can do this
      if (order._openid !== openid) {
        return { success: false, msg: '无权操作' };
      }
      if (order.status !== 'shipped') {
        return { success: false, msg: '当前状态不可收货' };
      }
      newStatus = 'completed';
      updateData = {
        status: newStatus,
        updateTime: db.serverDate(),
        completedTime: db.serverDate()
      };

      // When completed, we might want to update good status to 'completed' too if needed, 
      // but 'sold' is already fine. Maybe 'completed' implies transaction closed.
    } else {
      return { success: false, msg: '未知操作' };
    }

    await db.collection('orders').doc(orderId).update({
      data: updateData
    });

    return {
      success: true,
      status: newStatus
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      msg: err.message || '操作失败'
    };
  }
};