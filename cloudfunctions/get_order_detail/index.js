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

    // Fetch seller info (if buyer is viewing) or buyer info (if seller is viewing)
    // For now, let's just fetch seller info to display contact
    let sellerInfo = {};
    try {
        // We can reuse get_user_info logic or just fetch from users collection if we have one
        // Assuming we rely on get_user_info cloud function logic, but here we can just query users collection if accessible
        // Or just return the openids and let frontend fetch user info.
        // But to be self-contained, let's try to fetch user info if we have a users collection.
        // Since I don't recall a users collection being explicitly managed for profiles (it's usually just openid),
        // I'll stick to returning the order. The frontend can fetch user info if needed, or I can add it here if I had a users table.
        // Wait, I used 'get_user_info' in 'pay/index.js'. Let's see what that does.
        // It likely fetches from a 'users' collection or similar.
    } catch (e) {
        // ignore
    }

    return {
      success: true,
      data: order
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      msg: '订单不存在或获取失败'
    };
  }
};