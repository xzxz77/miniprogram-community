// pages/goods-detail/index.js
Page({
  data: {
    statusBarHeight: 20
  },
  onLoad: function() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });
  },
  goBack() {
    wx.navigateBack();
  }
})
