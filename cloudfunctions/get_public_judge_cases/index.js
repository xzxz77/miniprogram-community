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
    // Fetch voting cases
    const casesRes = await db.collection('judge_cases')
      .where({
        status: 'voting'
      })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get();

    const cases = casesRes.data;

    if (cases.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch related goods
    const goodIds = cases.map(c => c.goodId);
    const goodsRes = await db.collection('goods')
      .where({
        _id: _.in(goodIds)
      })
      .get();
    
    const goodsMap = {};
    goodsRes.data.forEach(g => {
      goodsMap[g._id] = g;
    });

    // Format data
    const formattedCases = cases.map(c => {
      const good = goodsMap[c.goodId] || {};
      const totalVotes = (c.votes?.support_plaintiff || 0) + (c.votes?.support_defendant || 0);
      
      return {
        _id: c._id,
        reason: c.reason,
        description: c.description, // Plaintiff description
        defendantResponse: c.defendantResponse,
        goodTitle: good.title || '未知商品',
        goodImage: good.images?.[0] || '',
        voteCount: totalVotes,
        hasVoted: (c.voteUsers || []).includes(openid),
        createTime: c.createTime
      };
    });

    return {
      success: true,
      data: formattedCases
    };

  } catch (err) {
    console.error(err);
    return { success: false, msg: '获取案件列表失败', error: err };
  }
};