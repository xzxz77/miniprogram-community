// pages/profile/subpages/collection-list/index.js
Page({
  data: {
    type: 'collection',
    itemList: [
      {
        id: 1,
        title: '全实木双人床，带床垫',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
        price: 500,
        distance: '200m',
        tag: '降价了'
      },
      {
        id: 2,
        title: '实木书柜，复古风格',
        image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
        price: 200,
        distance: '1.2km'
      }
    ]
  },

  onLoad: function (options) {
    if (options.type) {
      this.setData({ type: options.type });
      wx.setNavigationBarTitle({
        title: options.type === 'selling' ? '我的在售' : '我的收藏'
      });
    }
  }
})
