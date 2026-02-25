// cloudfunctions/create_judge_case/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { goodId, reason, description, evidence } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!goodId || !reason || !description) {
    return { success: false, msg: 'Missing required fields' };
  }

  try {
    // 1. Get Good Info to find defendant
    const goodRes = await db.collection('goods').doc(goodId).get();
    const good = goodRes.data;
    
    if (!good) {
      return { success: false, msg: '商品不存在' };
    }

    const defendantId = good._openid;

    if (defendantId === openid) {
      return { success: false, msg: '不能举报自己的商品' };
    }

    // 2. Check if already applied
    const existing = await db.collection('judge_cases').where({
      goodId: goodId,
      plaintiffId: openid,
      status: 'voting'
    }).count();

    if (existing.total > 0) {
      return { success: false, msg: '该商品已有正在进行的申诉案件' };
    }

    // 3. Create Case
    const res = await db.collection('judge_cases').add({
      data: {
        goodId,
        plaintiffId: openid,
        defendantId,
        reason,
        description,
        evidence: evidence || [],
        status: 'voting', // voting, resolved, rejected
        votes: {
          support_plaintiff: 0,
          support_defendant: 0
        },
        createTime: db.serverDate(),
        voteUsers: [] // Record who voted to prevent double voting
      }
    });

    return { success: true, id: res._id };
  } catch (err) {
    console.error(err);
    return { success: false, msg: '创建案件失败' };
  }
};