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
    db.collection('goods').where({
      _openid: app.globalData.openid,
      status: 'active' // 仅显示在售
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

  loadCollectionGoods() {
    // 暂时保留 Mock 或实现收藏逻辑
    // 假设有一个 favorites 集合
    this.setData({ isLoading: false });
    // TODO: 实现收藏列表
  }
})
