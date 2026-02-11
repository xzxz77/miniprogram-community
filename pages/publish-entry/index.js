// pages/publish-entry/index.js
Page({
  onShow() {
    // No auto redirect anymore
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({ selected: 2 });
    }
  },

  onPublishGood() {
    wx.navigateTo({
      url: '/pages/publish/index'
    });
  },

  onPublishPost() {
    wx.navigateTo({
      url: '/pages/publish-post/index'
    });
  },
  
  onClose() {
      wx.switchTab({
          url: '/pages/home/index'
      });
  }
})