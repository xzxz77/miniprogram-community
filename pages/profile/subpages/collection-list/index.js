// pages/profile/subpages/collection-list/index.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    type: 'collection',
    itemList: [],
    isLoading: true
  },

  onLoad: function (options) {
    if (options.type) {
      this.setData({ type: options.type });
      wx.setNavigationBarTitle({
        title: options.type === 'selling' ? '我的在售' : '我的收藏'
      });
    }
    
    this.loadData();
  },

  onShow() {
    // 每次显示时刷新数据（比如从详情页下架回来）
    this.loadData();
  },

  async loadData() {
    this.setData({ isLoading: true });
    
    // 确保已获取 openid
    if (!app.globalData.openid) {
      try {
        const { result } = await wx.cloud.callFunction({ name: 'login' });
        app.globalData.openid = result.openid;
      } catch(e) {
        wx.showToast({ title: '登录失败', icon: 'none' });
        return;
      }
    }

    if (this.data.type === 'selling') {
      this.loadSellingGoods();
    } else {
      this.loadCollectionGoods();
    }
  },

  loadSellingGoods() {
    const _ = db.command;
    db.collection('goods').where({
      _openid: app.globalData.openid,
      status: _.in(['active', 'offline', 'sold']) // 显示在售、已下架和已售出
    }).orderBy('createTime', 'desc').get()
    .then(res => {
      this.setData({
        itemList: res.data,
        isLoading: false
      });
    }).catch(err => {
      console.error(err);
      this.setData({ isLoading: false });
    });
  },

  async loadCollectionGoods() {
    try {
      // 1. 获取收藏记录
      const favRes = await db.collection('favorites').where({
        _openid: app.globalData.openid
      }).orderBy('createTime', 'desc').get();

      if (favRes.data.length === 0) {
        this.setData({ itemList: [], isLoading: false });
        return;
      }

      // 2. 提取商品ID
      const goodIds = favRes.data.map(item => item.goodId);

      // 3. 批量查询商品详情
      const _ = db.command;
      const goodsRes = await db.collection('goods').where({
        _id: _.in(goodIds)
      }).get();

      // 4. 排序：按照收藏时间顺序（favRes的顺序）重新排列 goodsRes
      // 创建一个以 id 为 key 的 map
      const goodsMap = {};
      goodsRes.data.forEach(good => {
        goodsMap[good._id] = good;
      });

      // 根据 goodIds 的顺序（也就是收藏时间倒序）构建最终列表
      // 注意：如果有商品被物理删除了，可能会在 map 中找不到，需要 filter 掉
      const itemList = goodIds.map(id => goodsMap[id]).filter(item => item);

      this.setData({
        itemList: itemList,
        isLoading: false
      });

    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ isLoading: false });
    }
  }
})
