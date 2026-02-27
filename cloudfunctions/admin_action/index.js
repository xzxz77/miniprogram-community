const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { type, id, action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!type || !id || !action) {
    return { success: false, msg: 'Missing parameters' };
  }

  try {
    if (type === 'report') {
      if (action === 'process') {
        await db.collection('reports').doc(id).update({
          data: { status: 'processed', processTime: db.serverDate() }
        });
      } else if (action === 'reject') {
        await db.collection('reports').doc(id).update({
          data: { status: 'rejected', processTime: db.serverDate() }
        });
      } else if (action === 'ban') {
        // Mark report processed AND ban good
        const report = await db.collection('reports').doc(id).get();
        if (report.data && report.data.goodId) {
          await db.collection('goods').doc(report.data.goodId).update({
            data: { status: 'banned' }
          });
        }
        await db.collection('reports').doc(id).update({
          data: { status: 'processed', result: 'banned', processTime: db.serverDate() }
        });
      }
    } else if (type === 'judge_case') {
      if (action === 'resolve') {
        await db.collection('judge_cases').doc(id).update({
          data: { status: 'resolved', resolveTime: db.serverDate() }
        });
      } else if (action === 'reject') {
        await db.collection('judge_cases').doc(id).update({
          data: { status: 'rejected', resolveTime: db.serverDate() }
        });
      }
    }

    return { success: true };

  } catch (err) {
    console.error(err);
    return { success: false, msg: '操作失败', error: err };
  }
};