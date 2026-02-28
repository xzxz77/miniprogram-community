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

    // Check permission
    if (caseData.plaintiffId !== openid) {
      return { success: false, msg: '无权操作' };
    }

    // Check status (can only cancel if not already resolved/rejected)
    if (['resolved', 'rejected', 'cancelled'].includes(caseData.status)) {
      return { success: false, msg: '案件已结束，无法撤销' };
    }

    await db.collection('judge_cases').doc(caseId).update({
      data: {
        status: 'cancelled',
        cancelTime: db.serverDate()
      }
    });

    return { success: true, msg: '撤销成功' };

  } catch (err) {
    console.error(err);
    return { success: false, msg: '撤销失败', error: err };
  }
};