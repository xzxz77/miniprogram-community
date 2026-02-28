const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    // 1. Calculate deadline (24 hours ago)
    const now = new Date();
    const deadline = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 2. Find cases that are 'voting' and approved before deadline
    // Note: If approveTime is missing (legacy), we might use createTime, or ignore.
    // Here we assume approveTime exists for voting cases as per previous step.
    const casesRes = await db.collection('judge_cases')
      .where({
        status: 'voting',
        approveTime: _.lt(deadline)
      })
      .get();

    const tasks = casesRes.data.map(async (caseItem) => {
      const pVotes = caseItem.votes?.support_plaintiff || 0;
      const dVotes = caseItem.votes?.support_defendant || 0;
      
      // Determine result: Plaintiff wins if strictly greater
      const result = pVotes > dVotes ? 'plaintiff_win' : 'defendant_win';

      return db.collection('judge_cases').doc(caseItem._id).update({
        data: {
          status: 'resolved',
          result: result,
          resolveTime: db.serverDate(),
          autoClosed: true
        }
      });
    });

    await Promise.all(tasks);

    return { success: true, processed: tasks.length };

  } catch (err) {
    console.error(err);
    return { success: false, error: err };
  }
};