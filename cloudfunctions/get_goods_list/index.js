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
    const userLocation = event.userLocation
    const latitude = event.latitude
    const longitude = event.longitude
    const maxDistance = event.maxDistance || 3000 // Default 3km
  
  try {
    // 构建查询条件
    let matchCondition = {
      status: _.in(['active']) // 仅显示在售
    };

    // Location Filtering
    // If coordinates provided, use geo-query (handled later in pipeline)
    // If NO coordinates, use string matching
    if (!latitude || !longitude) {
        // 测试阶段：默认地区 "幸福小区" 可以看到所有商品
        // 其他地区只能看到同地区的商品
        if (userLocation && userLocation !== '幸福小区' && userLocation !== '请选择地址') {
           matchCondition.location = userLocation;
        }
    }
    
    if (event.category && event.category !== '全部') {
      // 确保是字符串且去除空格
      matchCondition.category = String(event.category).trim();
    }

    // 关键词搜索
    if (event.keyword && String(event.keyword).trim()) {
      let keyword = String(event.keyword).trim();
      // Escape special characters for regex
      keyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      matchCondition.title = db.RegExp({
        regexp: keyword,
        options: 'i', // 大小写不敏感
      });
    }

    // 聚合查询
    let aggregate = db.collection('goods').aggregate();

    // If coordinates provided, use $geoNear as the first stage
    if (latitude && longitude) {
        // Query 1: Geo Search
        // Note: geoNear must be the first stage.
        // We need to build the pipeline carefully.
        
        const geoPipeline = db.collection('goods').aggregate()
            .geoNear({
                near: db.Geo.Point(Number(longitude), Number(latitude)),
                distanceField: 'distance',
                maxDistance: Number(maxDistance),
                query: matchCondition,
                spherical: true
            });
            
        // Sorting for Geo Query
        // geoNear sorts by distance by default.
        // If user wants 'newest', we should sort by createTime.
        if (sortBy === 'newest') {
             geoPipeline.sort({ createTime: -1 });
        } else if (sortBy === 'hot') {
             // For hot sort, we need to calculate score first
             geoPipeline.addFields({
                score: $.add([
                  $.ifNull(['$views', 0]), 
                  $.multiply([$.ifNull(['$favorites', 0]), 5])
                ])
             }).sort({ score: -1 });
        }
        
        const geoPromise = geoPipeline
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lookup({
                from: 'users',
                localField: '_openid',
                foreignField: '_openid',
                as: 'sellerInfo'
            })
            .project({
                title: 1, price: 1, images: 1, createTime: 1, deliveryMethod: 1, location: 1, _openid: 1, status: 1, views: 1, favorites: 1, score: 1,
                seller: $.arrayElemAt(['$sellerInfo', 0]),
                distance: 1
            })
            .end();

        // Query 2: String Match (Legacy or fallback)
        let stringMatchCond = { ...matchCondition };
        // Only apply location filter if it's not default/empty
        if (userLocation && userLocation !== '幸福小区' && userLocation !== '请选择地址') {
             stringMatchCond.location = userLocation;
        } else {
             // If default location, string match returns everything (which is fine, but maybe redundant if geo covers it)
             // But if geo returns 0, we want everything?
             // No, if user selected a point, userLocation is that point's name.
             // If userLocation is "Happy Garden", we want goods with location="Happy Garden".
        }
        
        let stringPipeline = db.collection('goods').aggregate().match(stringMatchCond);
        
        if (sortBy === 'hot') {
             stringPipeline = stringPipeline.addFields({
                score: $.add([
                  $.ifNull(['$views', 0]), 
                  $.multiply([$.ifNull(['$favorites', 0]), 5])
                ])
             }).sort({ score: -1 });
        } else {
             stringPipeline = stringPipeline.sort({ createTime: -1 });
        }

        const stringPromise = stringPipeline
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lookup({
                from: 'users',
                localField: '_openid',
                foreignField: '_openid',
                as: 'sellerInfo'
            })
            .project({
                title: 1, price: 1, images: 1, createTime: 1, deliveryMethod: 1, location: 1, _openid: 1, status: 1, views: 1, favorites: 1, score: 1,
                seller: $.arrayElemAt(['$sellerInfo', 0]),
                distance: 1 // Will be null/missing
            })
            .end();

        const [geoRes, stringRes] = await Promise.all([geoPromise, stringPromise]);
        
        // Merge and Dedup
        const geoList = geoRes.list;
        const stringList = stringRes.list;
        
        const combined = new Map();
        // Add geo results first (higher priority?)
        geoList.forEach(item => combined.set(item._id, item));
        // Add string results if not present
        stringList.forEach(item => {
            if (!combined.has(item._id)) {
                combined.set(item._id, item);
            }
        });
        
        let finalList = Array.from(combined.values());
        
        // Re-sort combined list
        if (sortBy === 'newest') {
            finalList.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
        } else if (sortBy === 'hot') {
             finalList.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
        
        return {
            success: true,
            data: finalList
        };

    } else {
        // Otherwise start with match (Original logic)
        aggregate = aggregate.match(matchCondition);
    }
    
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
        score: -1 // 升序 (Ascending) - 按照用户要求 "以升序的排列方式"
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
        seller: $.arrayElemAt(['$sellerInfo', 0]),
        distance: 1 // Return distance if available
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