const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { caseId, response, evidence } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!caseId || !response) {
    return { success: false, msg: 'Missing required fields' };
  }

  try {
    const caseRes = await db.collection('judge_cases').doc(caseId).get();
    const caseData = caseRes.data;

    if (caseData.defendantId !== openid) {
      return { success: false, msg: '无权操作' };
    }

    if (caseData.defendantResponse) {
      return { success: false, msg: '您已提交过申诉' };
    }

    await db.collection('judge_cases').doc(caseId).update({
      data: {
        defendantResponse: response,
        defendantEvidence: evidence || [],
        defendantResponseTime: db.serverDate(),
        status: 'pending_review' // Move to admin review
      }
    });

    return { success: true, msg: '提交成功' };

  } catch (err) {
    console.error(err);
    return { success: false, msg: '提交失败', error: err };
  }
};