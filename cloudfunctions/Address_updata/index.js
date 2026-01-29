// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  let db = cloud.database() //设置数据库
  const wxContext = cloud.getWXContext() //获取id
  const openid = wxContext.OPENID //用户唯一ID
  const usersCollection = db.collection('users') // 修正集合名为 users
  
  try {
    const uploadData = event.data
    if (!uploadData || Object.keys(uploadData).length === 0) {
      return {
        success: false,
        msg: '请输入修改内容'
      }
    }

    // 3. 查询该用户在users集合中的唯一记录
    const res = await usersCollection.where({
      _openid: openid 
    }).get()

    // 4. 核心判断逻辑
    if (res.data.length === 0) {
      // 情况1：用户无任何记录 → 新增
      await usersCollection.add({
        data: {
          _openid: openid,
          ...uploadData,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      return {
        success: true,
        msg: '用户无记录，已新增数据'
      }
    } else {
      // 情况2：用户已有记录 → 更新
      const userRecord = res.data[0]
      
      await usersCollection.doc(userRecord._id).update({
        data: {
          ...uploadData,
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        msg: '已修改'
      }
    }
  } catch (err) {
    console.error('数据处理失败：', err)
    return {
      success: false,
      msg: '数据处理失败',
      error: err.message
    }
  }
}
