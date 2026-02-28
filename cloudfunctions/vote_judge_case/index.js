const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { caseId, support } = event; // support: 'plaintiff' or 'defendant'
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!caseId || !support) {
    return { success: false, msg: 'Missing parameters' };
  }

  try {
    const caseRes = await db.collection('judge_cases').doc(caseId).get();
    const caseData = caseRes.data;

    // Validation
    if (caseData.status !== 'voting') {
      return { success: false, msg: '案件已结束或未开始投票' };
    }
    if (caseData.plaintiffId === openid || caseData.defendantId === openid) {
      return { success: false, msg: '当事人不能参与投票' };
    }
    if ((caseData.voteUsers || []).includes(openid)) {
      return { success: false, msg: '您已投过票' };
    }

    // Update vote
    const updateData = {
      voteUsers: _.push(openid)
    };
    
    if (support === 'plaintiff') {
      updateData['votes.support_plaintiff'] = _.inc(1);
    } else {
      updateData['votes.support_defendant'] = _.inc(1);
    }

    await db.collection('judge_cases').doc(caseId).update({
      data: updateData
    });

    return { success: true, msg: '投票成功' };

  } catch (err) {
    console.error(err);
    return { success: false, msg: '投票失败', error: err };
  }
};