// pages/profile/subpages/account-security/index.js
const app = getApp();

Page({
  data: {
    
  },

  onDeleteAccount() {
    wx.showModal({
      title: '危险操作',
      content: '注销账号将永久删除您的个人信息、发布的商品和所有数据，且无法恢复。确定要继续吗？',
      confirmColor: '#ff0000',
      confirmText: '确认注销',
      success: async (res) => {
        if (res.confirm) {
          this.performDelete();
        }
      }
    });
  },

  async performDelete() {
    wx.showLoading({ title: '注销中' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'delete_user'
      });

      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '注销成功' });
        
        // Clear local data
        app.globalData.userInfo = null;
        app.globalData.isLogged = false;
        app.globalData.openid = null;
        wx.clearStorageSync();
        
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/home/index'
          });
        }, 1500);
      } else {
        wx.showToast({ title: result.msg || '注销失败', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  }
})