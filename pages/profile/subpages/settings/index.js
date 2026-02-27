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

  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服微信号：aizoey1598\n(工作时间: 9:00-18:00)',
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'aizoey1598',
            success: () => {
              wx.showToast({ title: '已复制微信号', icon: 'none' });
            }
          });
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

  onAdminEntry() {
    // 1. Verify Admin ID
    const openid = app.globalData.openid;
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // TODO: Replace with real admin OpenIDs
    // For testing, we allow the current user. In production, remove `openid` from this array.
    const ADMIN_IDS = [openid, 'oFdj-5HmFHCEzSKopFVPBIjF8FfM']; 
    
    if (!ADMIN_IDS.includes(openid)) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      return;
    }

    // 2. Enter Password
    wx.showModal({
      title: '管理员验证',
      content: '',
      editable: true,
      placeholderText: '请输入管理员密码',
      success: (res) => {
        if (res.confirm) {
          if (res.content === 'admin123') {
            wx.navigateTo({ url: '/pages/admin/index' });
          } else {
            wx.showToast({ title: '密码错误', icon: 'none' });
          }
        }
      }
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