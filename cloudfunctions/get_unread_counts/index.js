// cloudfunctions/get_unread_counts/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { lastReadServiceTime, lastReadTransactionTime } = event;

  try {
    // 1. Interaction Unread (Comments)
    // Counts comments where good belongs to user OR user was replied to, AND isRead is false.
    // Based on 'get_interaction_unread' logic.
    // Assuming 'comments' collection has 'receiverId' or 'good._openid' logic.
    // Let's rely on 'get_interaction_unread' implementation logic or call it if possible.
    // But cloud function call is slow. Let's query directly.
    
    // In 'get_interactions', we match:
    // _.or([{ receiverId: openid }, { _openid: openid }])
    // But for UNREAD, we only care about RECEIVED messages that are unread.
    // So receiverId == openid AND isRead == false.
    // Comments on my goods: good.openid == openid. The comment has `receiverId` set ideally.
    // If `add_comment` sets `receiverId` correctly (which it should), we use that.
    
    // Wait, let's check `add_comment` implementation.
    // It fetches good, gets good._openid, and sets `receiverId`. Yes.
    
    const interactionCountRes = await db.collection('comments').where({
      receiverId: openid,
      isRead: false
    }).count();
    
    const interactionUnread = interactionCountRes.total;


    // 2. Transaction Unread (Orders)
    // Queries orders where user is buyer or seller, and updateTime > lastReadTransactionTime
    let transactionUnread = 0;
    if (lastReadTransactionTime) {
      const time = new Date(lastReadTransactionTime);
      const transactionCountRes = await db.collection('orders').where(_.and([
        _.or([
          { _openid: openid },
          { sellerId: openid }
        ]),
        {
          updateTime: _.gt(time)
        }
      ])).count();
      transactionUnread = transactionCountRes.total;
    } else {
      // If no last read time, maybe just show recent 1 or 0? 
      // Or count all if user never visited? That might be too many.
      // Let's default to 0 or 1 if it feels right, but 0 is safer.
      // Or count last 3 days?
      // Let's count all for now as "new" if they never visited.
      const transactionCountRes = await db.collection('orders').where(_.or([
          { _openid: openid },
          { sellerId: openid }
      ])).count();
      transactionUnread = transactionCountRes.total > 0 ? 1 : 0; // Just show a dot if never visited
    }


    // 3. Service Unread (System Notifications)
    // We don't have a real system yet, so we mock one "Welcome" message.
    // Let's say there is a system message from 2026-02-01.
    // If lastReadServiceTime < that, return 1.
    const latestServiceTime = new Date('2026-02-01T00:00:00.000Z');
    let serviceUnread = 0;
    
    if (!lastReadServiceTime || new Date(lastReadServiceTime) < latestServiceTime) {
       serviceUnread = 1;
    }

    return {
      success: true,
      interactionUnread,
      transactionUnread,
      serviceUnread
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      msg: err.message
    };
  }
};