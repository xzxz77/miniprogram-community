// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  let db = cloud.database() //设置数据库
  const wxContext = cloud.getWXContext() //获取id
  const openid = wxContext.OPENID //用户唯一ID
  const goodsCollection = db.collection('goods') // 商品集合
  
  try {
    const goodData = event.data
    
    // 基本校验
    if (!goodData || !goodData.title || !goodData.price) {
      return {
        success: false,
        msg: '请填写必要信息'
      }
    }

    // 新增商品记录
    const res = await goodsCollection.add({
      data: {
        _openid: openid, // 卖家ID
        ...goodData,     // 商品信息 (title, description, price, images, etc.)
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        status: 'active', // 商品状态：active(在售), sold(已售), deleted(删除)
        viewCount: 0,
        wantCount: 0
      }
    })

    return {
      success: true,
      msg: '发布成功',
      id: res._id
    }

  } catch (err) {
    console.error('发布失败：', err)
    return {
      success: false,
      msg: '发布失败',
      error: err.message
    }
  }
}