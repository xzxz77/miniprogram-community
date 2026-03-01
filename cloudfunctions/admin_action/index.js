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
        // Admin Force Resolve: Determine winner based on current votes
        const caseRes = await db.collection('judge_cases').doc(id).get();
        const c = caseRes.data;
        const pVotes = c.votes?.support_plaintiff || 0;
        const dVotes = c.votes?.support_defendant || 0;
        const result = pVotes > dVotes ? 'plaintiff_win' : 'defendant_win';

        await db.collection('judge_cases').doc(id).update({
          data: { 
            status: 'resolved', 
            result: result,
            resolveTime: db.serverDate(),
            adminForced: true
          }
        });
      } else if (action === 'reject') {
        await db.collection('judge_cases').doc(id).update({
          data: { status: 'rejected', resolveTime: db.serverDate() }
        });
      } else if (action === 'approve') {
        // Approve pending review case -> voting
        await db.collection('judge_cases').doc(id).update({
          data: { status: 'voting', approveTime: db.serverDate() }
        });
      }
    } else if (type === 'refund') {
      if (action === 'approve') {
        // Approve refund -> refunded
        await db.collection('orders').doc(id).update({
          data: { 
            status: 'refunded', 
            refundTime: db.serverDate(),
            refundStatus: 'approved'
          }
        });
        // Restore good status? Usually yes if returned.
        // Let's fetch order to get goodId
        const order = await db.collection('orders').doc(id).get();
        if (order.data && order.data.goodId) {
            await db.collection('goods').doc(order.data.goodId).update({
                data: { status: 'active' }
            });
        }
      } else if (action === 'reject') {
        // Reject refund -> completed (revert to previous state)
        await db.collection('orders').doc(id).update({
          data: { 
            status: 'completed', 
            refundStatus: 'rejected',
            refundRejectTime: db.serverDate()
          }
        });
      }
    }

    return { success: true };

  } catch (err) {
    console.error(err);
    return { success: false, msg: '操作失败', error: err };
  }
};