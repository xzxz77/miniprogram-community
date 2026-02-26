// pages/profile/subpages/settings/index.js
const app = getApp();

Page({
  data: {
    cacheSize: '0KB',
    version: '1.0.0'
  },

  onLoad() {
    this.calculateCache();
  },

  calculateCache() {
    wx.getStorageInfo({
      success: (res) => {
        const sizeKB = res.currentSize;
        let sizeStr = '';
        if (sizeKB > 1024) {
          sizeStr = (sizeKB / 1024).toFixed(1) + 'MB';
        } else {
          sizeStr = sizeKB + 'KB';
        }
        this.setData({ cacheSize: sizeStr });
      }
    });
  },

  onClearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();
            this.setData({ cacheSize: '0KB' });
            wx.showToast({ title: '清除成功' });
            
            // Re-initialize app state if needed, or just keep critical keys if any
            // Usually we might want to keep some persistent tokens, but clearStorageSync wipes all.
            // For this demo, it's fine.
          } catch (e) {
            wx.showToast({ title: '清除失败', icon: 'none' });
          }
        }
      }
    });
  },

  onAbout() {
    wx.showModal({
      title: '关于我们',
      content: `社区闲置小程序\n版本号：${this.data.version}\n\n致力于打造安全、便捷的社区闲置交易平台。`,
      showCancel: false
    });
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // Clear global user data
          app.globalData.userInfo = null;
          app.globalData.isLogged = false;
          app.globalData.openid = null;
          
          // Set explicit logout flag to prevent auto-login
          wx.setStorageSync('isLoggedOut', true);
          
          wx.showToast({ title: '已退出' });
          
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/home/index'
            });
          }, 1000);
        }
      }
    });
  },

  onNotImplemented() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  }
})