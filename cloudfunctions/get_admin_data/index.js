const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hour = d.getHours().toString().padStart(2, '0');
  const minute = d.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 1. Fetch Pending Reports
    const reportsRes = await db.collection('reports')
      .where({
        status: 'pending'
      })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get();

    // 2. Fetch Active Judge Cases (Voting)
    const casesRes = await db.collection('judge_cases')
      .where({
        status: 'voting'
      })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get();

    // 3. Fetch Pending Review Cases (New)
    const auditCasesRes = await db.collection('judge_cases')
      .where({
        status: 'pending_review'
      })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get();

    // 4. Fetch Pending Refunds (New)
    const refundsRes = await db.collection('orders')
      .where({
        status: 'refund_pending'
      })
      .orderBy('refundApplyTime', 'desc')
      .limit(50)
      .get();

    const reports = reportsRes.data;
    const cases = casesRes.data;
    const auditCases = auditCasesRes.data;
    const refunds = refundsRes.data;

    // 5. Fetch related Goods info
    const goodIds = new Set();
    reports.forEach(r => r.goodId && goodIds.add(r.goodId));
    cases.forEach(c => c.goodId && goodIds.add(c.goodId));
    auditCases.forEach(c => c.goodId && goodIds.add(c.goodId));
    refunds.forEach(r => r.goodId && goodIds.add(r.goodId));

    let goodsMap = {};
    if (goodIds.size > 0) {
      try {
        const goodsRes = await db.collection('goods')
          .where({
            _id: _.in(Array.from(goodIds))
          })
          .get();
        goodsRes.data.forEach(g => goodsMap[g._id] = g);
      } catch (e) {
        console.error('Fetch goods failed', e);
      }
    }

    // 6. Format Data
    const formattedReports = reports.map(r => ({
      ...r,
      goodTitle: goodsMap[r.goodId]?.title || '未知商品',
      goodImage: goodsMap[r.goodId]?.images?.[0] || '',
      time: formatTime(r.createTime)
    }));

    const formattedCases = cases.map(c => ({
      ...c,
      goodTitle: goodsMap[c.goodId]?.title || '未知商品',
      goodImage: goodsMap[c.goodId]?.images?.[0] || '',
      time: formatTime(c.createTime)
    }));

    const formattedAuditCases = auditCases.map(c => ({
      ...c,
      goodTitle: goodsMap[c.goodId]?.title || '未知商品',
      goodImage: goodsMap[c.goodId]?.images?.[0] || '',
      time: formatTime(c.createTime)
    }));

    const formattedRefunds = refunds.map(r => ({
      _id: r._id,
      goodTitle: goodsMap[r.goodId]?.title || '未知商品',
      goodImage: goodsMap[r.goodId]?.images?.[0] || '',
      reason: r.refundReason,
      description: r.refundDescription,
      evidence: r.refundEvidence,
      amount: r.totalPrice,
      time: formatTime(r.refundApplyTime)
    }));

    return {
      success: true,
      reports: formattedReports,
      cases: formattedCases,
      auditCases: formattedAuditCases,
      refunds: formattedRefunds
    };

  } catch (err) {
    console.error(err);
    return { success: false, msg: '获取数据失败', error: err };
  }
};