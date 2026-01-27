// pages/profile/index.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 20, // Default fallback
    userInfo: {
      nickName: '李大爷',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
      location: '幸福花园小区 3栋 201室',
      creditScore: 780,
      days: 380,
      verified: true
    },
    stats: {
      collection: 12,
      follow: 5,
      fans: 108,
      selling: 32
    }
  },

  onLoad: function () {
    // Get system info for custom nav bar
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });
  }
})
