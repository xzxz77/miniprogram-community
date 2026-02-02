// pages/publish-entry/index.js
Page({
  onShow() {
    // 自动跳转到发布页，并重置上一级页面为首页，防止返回时死循环
    wx.switchTab({
      url: '/pages/home/index',
      success: () => {
        wx.navigateTo({
          url: '/pages/publish/index'
        });
      }
    });
  }
})
