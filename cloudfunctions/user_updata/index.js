// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  let db = cloud.database() //设置数据库
  const wxContext = cloud.getWXContext() //获取id
  const openid=wxContext.OPENID//用户唯一ID
  const usersCollection = db.collection('users')
  
  try {
    // 接收小程序端传递的参数：要上传的用户数据（如{phone: '13800138000'}）
    // event.data 是小程序端传的目标字段和值，示例：{nickName: '张三', age: 20}
    const uploadData = event.data
    if (!uploadData || Object.keys(uploadData).length === 0) {
      return {
        success: false,
        msg: '请输入修改内容'
      }
    }
    // 取第一个目标字段（判断该字段是否有数据，若传多个字段，默认判断第一个）
    const targetKey = Object.keys(uploadData)[0]

    // 3. 查询该用户在users集合中的唯一记录（openid作为查询条件，用户唯一）
    const res = await usersCollection.where({
      openid: openid
    }).get()

    // 4. 核心判断逻辑
    if (res.data.length === 0) {
      // 情况1：用户无任何记录 → 直接**新增**整条用户记录（包含openid和上传的字段）
      await usersCollection.add({
        data: {
          openid: openid,
          ...uploadData, // 展开上传的字段
          createTime: db.serverDate(), // 新增时间（服务器时间，避免客户端时间篡改）
          updateTime: db.serverDate()
        }
      })
      return {
        success: true,
        msg: '用户无记录，已新增数据'
      }
    } else {
      // 情况2：用户已有记录 → 获取该记录，判断**目标字段是否有数据**
      const userRecord = res.data[0]
      const hasTargetData = !!userRecord[targetKey] // !! 把任意值转成布尔值，无数据/空值则为false

      if (hasTargetData) {
        // 子情况2-1：目标字段已有数据 → **修改**该字段的值
        await usersCollection.doc(userRecord._id).update({ // doc传记录ID，精准更新
          data: {
            ...uploadData,
            updateTime: db.serverDate() // 更新时间
          }
        })
        return {
          success: true,
          msg: '已修改'
        }
      } else {
        // 子情况2-2：目标字段无数据 → **添加**该字段（本质是更新记录，新增字段）
        await usersCollection.doc(userRecord._id).update({
          data: {
            ...uploadData,
            updateTime: db.serverDate()
          }
        })
        return {
          success: true,
          msg: '无数据，已添加'
        }
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