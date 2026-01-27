// pages/profile/subpages/order-list/index.js
Page({
  data: {
    currentTab: 0,
    orderList: [
      {
        id: 1,
        status: 1, // 1: 待付款
        statusText: '等待付款',
        sellerName: '李大爷',
        sellerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=50&h=50',
        productTitle: '九成新 Apple Watch Series 7，几乎没用过，箱说全',
        productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
        price: '1800.00'
      }
    ]
  },

  onLoad: function (options) {
    if (options.status) {
      this.setData({ currentTab: parseInt(options.status) });
    }
  },

  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
    // In real app, fetch data based on tab index
  }
})
