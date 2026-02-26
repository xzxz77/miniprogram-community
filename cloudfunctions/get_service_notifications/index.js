const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // Helper to safely execute database queries
  const safeGet = async (queryPromise, label) => {
    try {
      const res = await queryPromise;
      console.log(`${label} count:`, res.data ? res.data.length : 0);
      return res.data || [];
    } catch (e) {
      console.error(`${label} query failed:`, e);
      // If collection doesn't exist or other db error, return empty array to prevent crash
      return [];
    }
  };

  try {
    // 1. Fetch my reports (as reporter)
    const myReportsPromise = db.collection('reports')
      .where({
        _openid: openid
      })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get();

    // 2. Fetch judge cases where I am plaintiff
    const myPlaintiffCasesPromise = db.collection('judge_cases')
      .where({
        plaintiffId: openid
      })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get();

    // 3. Fetch judge cases where I am defendant
    const myDefendantCasesPromise = db.collection('judge_cases')
      .where({
        defendantId: openid
      })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get();

    // Execute queries in parallel with error handling
    const [myReports, myPlaintiffCases, myDefendantCases] = await Promise.all([
      safeGet(myReportsPromise, 'myReports'),
      safeGet(myPlaintiffCasesPromise, 'myPlaintiffCases'),
      safeGet(myDefendantCasesPromise, 'myDefendantCases')
    ]);

    // Collect all goodIds to fetch names
    const goodIds = new Set();
    myReports.forEach(r => r.goodId && goodIds.add(r.goodId));
    myPlaintiffCases.forEach(c => c.goodId && goodIds.add(c.goodId));
    myDefendantCases.forEach(c => c.goodId && goodIds.add(c.goodId));

    let goodsMap = {};
    if (goodIds.size > 0) {
      try {
        const goodsRes = await db.collection('goods')
          .where({
            _id: _.in(Array.from(goodIds))
          })
          .get();
        
        if (goodsRes.data) {
          goodsRes.data.forEach(g => {
            goodsMap[g._id] = g;
          });
        }
      } catch (e) {
        console.error('Fetch goods failed:', e);
        // Continue without goods info
      }
    }

    const notifications = [];

    // Helper to safely parse date
    const getTimestamp = (timeVal) => {
      if (!timeVal) return Date.now();
      if (timeVal instanceof Date) return timeVal.getTime();
      if (typeof timeVal === 'string') return new Date(timeVal).getTime();
      // Handle potential Firestore Timestamp object if not automatically converted
      if (timeVal.toDate && typeof timeVal.toDate === 'function') return timeVal.toDate().getTime();
      return Date.now();
    };

    // Process Reports (Reporter)
    myReports.forEach(report => {
      const good = goodsMap[report.goodId] || {};
      const goodName = good.title || '未知商品';
      
      let statusText = '处理中';
      if (report.status === 'processed') statusText = '已处理';
      if (report.status === 'rejected') statusText = '已驳回';

      notifications.push({
        id: report._id,
        type: 'report',
        title: '举报反馈',
        content: `您举报的商品"${goodName}"状态更新：${statusText}。原因：${report.reason}`,
        time: report.createTime,
        timestamp: getTimestamp(report.createTime)
      });
    });

    // Process Judge Cases (Plaintiff)
    myPlaintiffCases.forEach(c => {
      const good = goodsMap[c.goodId] || {};
      const goodName = good.title || '未知商品';
      
      let statusText = '投票中';
      if (c.status === 'resolved') statusText = '已裁决';
      if (c.status === 'rejected') statusText = '已驳回';

      const votes = c.votes || { support_plaintiff: 0, support_defendant: 0 };

      notifications.push({
        id: c._id,
        type: 'judge_case_plaintiff',
        title: '小判官案件进度',
        content: `您发起的关于商品"${goodName}"的小判官案件状态：${statusText}。当前支持数：${votes.support_plaintiff || 0} vs ${votes.support_defendant || 0}`,
        time: c.createTime,
        timestamp: getTimestamp(c.createTime)
      });
    });

    // Process Judge Cases (Defendant)
    myDefendantCases.forEach(c => {
      const good = goodsMap[c.goodId] || {};
      const goodName = good.title || '未知商品';
      
      let statusText = '投票中';
      if (c.status === 'resolved') statusText = '已裁决';
      if (c.status === 'rejected') statusText = '已驳回';

      notifications.push({
        id: c._id,
        type: 'judge_case_defendant',
        title: '被举报通知',
        content: `您的商品"${goodName}"被发起了小判官案件。状态：${statusText}。请关注案件进展。`,
        time: c.createTime,
        timestamp: getTimestamp(c.createTime)
      });
    });

    // Sort by time desc
    notifications.sort((a, b) => b.timestamp - a.timestamp);

    // Format time string
    const formattedNotifications = notifications.map(n => {
      const date = new Date(n.timestamp);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      
      return {
        ...n,
        time: `${year}-${month}-${day} ${hour}:${minute}`
      };
    });

    return {
      success: true,
      data: formattedNotifications,
      debug: {
        openid,
        reportsCount: myReports.length,
        plaintiffCount: myPlaintiffCases.length,
        defendantCount: myDefendantCases.length
      }
    };

  } catch (err) {
    console.error('Global error:', err);
    return {
      success: false,
      msg: '获取通知失败',
      error: err
    };
  }
};