// cloudfunctions/get_transaction_updates/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 1. Fetch orders where user is buyer or seller
    // The user is either the buyer (_openid) OR the seller (sellerId)
    // We want to sort by updateTime descending
    
    const ordersRes = await db.collection('orders')
      .where(_.or([
        { _openid: openid }, // User is buyer
        { sellerId: openid } // User is seller
      ]))
      .orderBy('updateTime', 'desc')
      .limit(20) // Limit to recent 20
      .get();

    const orders = ordersRes.data;

    // 2. Map to notification format
    const updates = orders.map(order => {
      const isBuyer = order._openid === openid;
      const status = order.status;
      const goodTitle = order.goodSnapshot ? order.goodSnapshot.title : '未知商品';
      
      let title = '';
      let content = '';
      let type = ''; // for icon

      if (isBuyer) {
        if (status === 'paid') {
          title = '支付成功';
          content = `您购买的"${goodTitle}"已付款，请等待卖家发货。`;
          type = 'pay';
        } else if (status === 'shipped') {
          title = '卖家已发货';
          content = `您购买的"${goodTitle}"已发货，请留意查收。`;
          type = 'deliver';
        } else if (status === 'completed') {
          title = '交易完成';
          content = `您购买的"${goodTitle}"交易已完成。`;
          type = 'complete';
        } else {
            title = '订单更新';
            content = `您购买的"${goodTitle}"状态更新为: ${status}`;
            type = 'info';
        }
      } else { // Seller
        if (status === 'paid') {
          title = '新订单';
          content = `您发布的"${goodTitle}"已被拍下，请尽快发货。`;
          type = 'pay';
        } else if (status === 'shipped') {
          title = '已发货';
          content = `您发布的"${goodTitle}"已发货。`;
          type = 'deliver';
        } else if (status === 'completed') {
          title = '交易完成';
          content = `您发布的"${goodTitle}"交易已完成。`;
          type = 'complete';
        } else if (status === 'sold') { // Sometimes status might be 'sold' for the good, but order status should be tracked. 
            // In create_order, we set order status to 'paid'. So seller sees 'paid'.
            // If somehow status is 'sold' (maybe legacy or future), treat as sold.
            title = '商品售出';
            content = `您发布的"${goodTitle}"已售出。`;
            type = 'pay';
        } else {
            title = '订单更新';
            content = `您发布的"${goodTitle}"状态更新为: ${status}`;
            type = 'info';
        }
      }

      return {
        id: order._id, // Use order ID as unique key
        status: type, // For UI styling/icon
        title: title,
        content: content,
        time: order.updateTime, // Will be formatted on frontend
        image: order.goodSnapshot && order.goodSnapshot.image ? order.goodSnapshot.image : '',
        orderId: order._id
      };
    });

    return {
      success: true,
      data: updates
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      msg: err.message || '获取交易动态失败'
    };
  }
};