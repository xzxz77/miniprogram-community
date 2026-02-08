// cloudfunctions/get_my_orders/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { type } = event; // 'bought' or 'sold'

  try {
    let matchCondition = {};
    
    if (type === 'sold') {
      matchCondition.sellerId = openid;
    } else {
      // Default to bought
      matchCondition._openid = openid;
    }

    // Aggregate to join user info if needed, but for now simple query
    // We stored goodSnapshot, so we have basic info.
    // If we want seller info (for bought orders) or buyer info (for sold orders), we might need lookup.
    
    const ordersRes = await db.collection('orders')
      .where(matchCondition)
      .orderBy('createTime', 'desc')
      .get();

    const orders = ordersRes.data;

    // Enhance with user info if needed
    // For bought orders, we might want seller info (avatar, name)
    // For sold orders, we might want buyer info
    
    // Let's do a simple loop to fetch user info for now as optimization might be overkill for MVP
    // Or just rely on what we have. 
    // The current UI shows sellerName/Avatar.
    
    const userIds = new Set();
    orders.forEach(order => {
      if (type === 'sold') {
        userIds.add(order._openid); // Buyer
      } else {
        userIds.add(order.sellerId); // Seller
      }
    });

    const userMap = {};
    if (userIds.size > 0) {
        // Fetch users
        // Assuming we rely on get_user_info or similar, but cloud function calling cloud function is tricky.
        // Better to query if we had a users collection.
        // Since we don't have a reliable users collection, we might have to skip avatars or use placeholders
        // OR, rely on the fact that goods might have had seller info attached? No, goods only have _openid.
        
        // Wait, in `get_goods_list` we used aggregation to lookup users.
        // But we don't have a 'users' collection populated by `login` function properly?
        // Let's check `login` function or `user_update`.
        // Usually `login` creates a user record.
        
        // Let's assume we can't easily get user info without a users collection.
        // But wait, `get_goods_list` does:
        // .lookup({ from: 'users', ... })
        // So there IS a users collection.
        
        const usersRes = await db.collection('users').where({
            _openid: _.in(Array.from(userIds))
        }).get();
        
        usersRes.data.forEach(u => {
            userMap[u._openid] = u;
        });
    }

    // Attach user info
    const result = orders.map(order => {
        const otherSideId = type === 'sold' ? order._openid : order.sellerId;
        const user = userMap[otherSideId] || {};
        
        return {
            ...order,
            otherSide: {
                nickName: user.nickName || '未知用户',
                avatarUrl: user.avatarUrl || '/assets/icons/avatar.png'
            }
        };
    });

    return {
      success: true,
      data: result
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      msg: err.message
    };
  }
};