// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  let db = cloud.database() //设置数据库
  const wxContext = cloud.getWXContext() //获取id
  const openid=wxContext.OPENID //用户唯一ID
  const usersCollection = db.collection('users') // 修改为 users 集合
  
  try {
    // 接收小程序端传递的参数：要上传的用户数据
    // event.data 是小程序端传的目标字段和值
    const uploadData = event.data
    if (!uploadData || Object.keys(uploadData).length === 0) {
      return {
        success: false,
        msg: '请输入修改内容'
      }
    }

    // 3. 查询该用户在users集合中的唯一记录（openid作为查询条件，用户唯一）
    const res = await usersCollection.where({
      _openid: openid // 云开发自动插入的openid字段通常是 _openid，但手动插入可能是 openid，为了兼容，先查询
    }).get()

    // 4. 核心判断逻辑
    if (res.data.length === 0) {
      // 情况1：用户无任何记录 → 直接**新增**整条用户记录（包含openid和上传的字段）
      await usersCollection.add({
        data: {
          _openid: openid, // 确保有 openid
          ...uploadData, // 展开上传的字段
          createTime: db.serverDate(), // 新增时间
          updateTime: db.serverDate(),
          // 默认字段，如果 uploadData 中没有
          days: uploadData.days || 1,
          verified: uploadData.verified || false
        }
      })
      return {
        success: true,
        msg: '用户无记录，已新增数据'
      }
    } else {
      // 情况2：用户已有记录 → 更新记录
      const userRecord = res.data[0]
      
      await usersCollection.doc(userRecord._id).update({
        data: {
          ...uploadData,
          updateTime: db.serverDate() // 更新时间
        }
      })
      
      return {
        success: true,
        msg: '已修改'
      }
    }
  } catch (err) {
    // 异常捕获，返回错误信息
    console.error('数据处理失败：', err)
    return {
      success: false,
      msg: '数据处理失败',
      error: err.message
    }
  }
}
