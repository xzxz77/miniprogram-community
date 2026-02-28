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
    let interactionUnread = 0;
    try {
      const interactionCountRes = await db.collection('comments').where({
        receiverId: openid,
        isRead: false
      }).count();
      interactionUnread = interactionCountRes.total;
    } catch (e) {
      console.error('Interaction count failed', e);
    }

    // 2. Transaction Unread (Orders)
    let transactionUnread = 0;
    try {
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
        const transactionCountRes = await db.collection('orders').where(_.or([
            { _openid: openid },
            { sellerId: openid }
        ])).count();
        transactionUnread = transactionCountRes.total > 0 ? 1 : 0;
      }
    } catch (e) {
      console.error('Transaction count failed', e);
    }

    // 3. Service Unread (System Notifications + Reports + Judge Cases)
    let serviceUnread = 0;
    const lastReadTime = lastReadServiceTime ? new Date(lastReadServiceTime) : new Date(0); // Default to epoch if null

    try {
      // A. System Message (Mock)
      const latestSystemMsgTime = new Date('2026-02-01T00:00:00.000Z');
      if (lastReadTime < latestSystemMsgTime) {
         serviceUnread++;
      }

      // B. Reports (Reporter): Count processed reports since last read
      const reportUpdates = await db.collection('reports').where({
        _openid: openid,
        processTime: _.gt(lastReadTime)
      }).count();
      serviceUnread += reportUpdates.total;

      // C. Judge Cases (Plaintiff): Count resolved cases since last read
      const plaintiffUpdates = await db.collection('judge_cases').where({
        plaintiffId: openid,
        resolveTime: _.gt(lastReadTime)
      }).count();
      serviceUnread += plaintiffUpdates.total;

      // D. Judge Cases (Defendant): Count NEW cases OR resolved cases since last read
      // New cases: createTime > lastReadTime
      // Resolved cases: resolveTime > lastReadTime
      const defendantNewCases = await db.collection('judge_cases').where({
        defendantId: openid,
        createTime: _.gt(lastReadTime)
      }).count();
      
      const defendantResolvedCases = await db.collection('judge_cases').where({
        defendantId: openid,
        resolveTime: _.gt(lastReadTime)
      }).count();

      serviceUnread += defendantNewCases.total + defendantResolvedCases.total;

    } catch (e) {
      console.error('Service count failed', e);
    }

    // 4. Chat Unread
    let chatUnread = 0;
    try {
        const chatRes = await db.collection('messages').where({
            receiverId: openid,
            isRead: false
        }).count();
        chatUnread = chatRes.total;
    } catch(e) {
        console.error('Chat count failed', e);
    }

    return {
      success: true,
      interactionUnread,
      transactionUnread,
      serviceUnread,
      chatUnread
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      msg: err.message
    };
  }
};