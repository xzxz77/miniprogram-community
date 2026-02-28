const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { caseId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!caseId) {
    return { success: false, msg: 'Missing caseId' };
  }

  try {
    const caseRes = await db.collection('judge_cases').doc(caseId).get();
    const caseData = caseRes.data;

    // Fetch related info
    const [plaintiffRes, defendantRes, goodRes] = await Promise.all([
      db.collection('users').where({ _openid: caseData.plaintiffId }).get(),
      db.collection('users').where({ _openid: caseData.defendantId }).get(),
      db.collection('goods').doc(caseData.goodId).get()
    ]);

    const plaintiff = plaintiffRes.data[0] || {};
    const defendant = defendantRes.data[0] || {};
    const good = goodRes.data || {};

    // Determine user role
    let role = 'visitor'; // default is voter/visitor
    if (openid === caseData.plaintiffId) role = 'plaintiff';
    if (openid === caseData.defendantId) role = 'defendant';

    // Check if user has voted
    const hasVoted = (caseData.voteUsers || []).includes(openid);

    return {
      success: true,
      data: {
        ...caseData,
        plaintiffInfo: {
          nickName: plaintiff.nickName || '原告',
          avatarUrl: plaintiff.avatarUrl || '/assets/icons/profile.png'
        },
        defendantInfo: {
          nickName: defendant.nickName || '被告',
          avatarUrl: defendant.avatarUrl || '/assets/icons/profile.png'
        },
        goodInfo: {
          title: good.title || '未知商品',
          price: good.price || 0,
          images: good.images || []
        },
        userRole: role,
        hasVoted,
        currentOpenId: openid // useful for debugging
      }
    };

  } catch (err) {
    console.error(err);
    return { success: false, msg: '获取案件详情失败', error: err };
  }
};