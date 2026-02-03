// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

exports.main = async (event, context) => {
  const page = event.page || 1
  const pageSize = event.pageSize || 10
  const sortBy = event.sortBy || 'newest' // newest or hot
  
  try {
    // 聚合查询
    let aggregate = db.collection('goods').aggregate()
      .match({
        status: _.in(['active']) // 仅显示在售
      })

    // 根据排序方式处理
    if (sortBy === 'hot') {
      // 综合排序：浏览量 * 1 + 收藏量 * 5 (假设权重)
      // 注意：favorites 字段可能不存在或为 0，views 同理
      // 使用 addFields 计算 score
      aggregate = aggregate.addFields({
        // 如果字段不存在，ifNull 默认为 0
        score: $.add([
          $.ifNull(['$views', 0]), 
          $.multiply([$.ifNull(['$favorites', 0]), 5])
        ])
      })
      .sort({
        score: 1 // 升序 (Ascending) - 按照用户要求 "以升序的排列方式"
        // 通常热门是降序 (-1)，但这里严格遵循指令
      })
    } else {
      // 默认最新发布
      aggregate = aggregate.sort({
        createTime: -1
      })
    }

    const list = await aggregate.skip((page - 1) * pageSize)
      .limit(pageSize)
      .lookup({
        from: 'users',
        localField: '_openid',
        foreignField: '_openid',
        as: 'sellerInfo'
      })
      .project({
        // 保留 goods 表所有字段
        title: 1,
        price: 1,
        images: 1,
        createTime: 1,
        deliveryMethod: 1,
        location: 1,
        _openid: 1,
        status: 1,
        views: 1,
        favorites: 1,
        score: 1, // 调试用
        // 提取 sellerInfo 中的必要字段
        seller: $.arrayElemAt(['$sellerInfo', 0])
      })
      .end()
      
    return {
      success: true,
      data: list.list
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err
    }
  }
}