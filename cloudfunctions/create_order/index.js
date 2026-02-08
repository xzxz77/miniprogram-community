// cloudfunctions/create_order/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { goodId, address, totalPrice, deliveryMethod, remark } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!goodId || !address) {
    return { success: false, msg: 'Missing required parameters' };
  }

  try {
    // 1. Get Good Detail
    const goodRes = await db.collection('goods').doc(goodId).get();
    const good = goodRes.data;

    if (!good) {
      return { success: false, msg: '商品不存在' };
    }

    if (good.status !== 'active') {
      return { success: false, msg: '商品已下架或已售出' };
    }
    
    // Check if buyer is seller
    if (good._openid === openid) {
        return { success: false, msg: '不能购买自己的商品' };
    }

    // 2. Create Order
    // Generate a unique order ID (or let DB generate _id and use that)
    // We'll use DB's _id as the main ID, but maybe add a readable orderNo if needed.
    // For simplicity, just use DB insertion.
    
    const orderData = {
      _openid: openid, // Buyer
      sellerId: good._openid,
      goodId: good._id,
      goodSnapshot: {
        title: good.title,
        price: good.price,
        image: good.images && good.images.length > 0 ? good.images[0] : '',
        category: good.category
      },
      address: address,
      totalPrice: totalPrice || good.price,
      deliveryMethod: deliveryMethod,
      remark: remark || '',
      status: 'paid', // Simulating successful payment
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const orderRes = await db.collection('orders').add({
      data: orderData
    });

    const orderId = orderRes._id;

    // 3. Update Good Status
    await db.collection('goods').doc(goodId).update({
      data: {
        status: 'sold',
        updateTime: db.serverDate()
      }
    });

    return {
      success: true,
      orderId: orderId
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      msg: err.message || '创建订单失败'
    };
  }
};