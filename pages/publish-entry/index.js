// pages/publish-entry/index.js
Page({
  onShow() {
    // 阻止页面展示，直接弹出交互
    
    
    wx.showModal({
      title: '发布提示',
      content: '您确定要发布新的闲置商品吗？',
      confirmText: '去发布',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 跳转到真正的发布页（非 TabBar 页面）
          wx.navigateTo({
            url: '/pages/publish/index',
            success: () => {
               // 恢复 tabBar 显示，以免返回时丢失
               wx.showTabBar();
            }
          });
        } else {
          // 取消则返回首页
          wx.switchTab({
            url: '/pages/home/index',
            success: () => {
              wx.showTabBar();
            }
          });
        }
      },
      fail: () => {
        wx.switchTab({
          url: '/pages/home/index',
          success: () => {
            wx.showTabBar();
          }
        });
      },
      complete: () => {
        // 恢复 TabBar 显示（如果在其他页面需要）
        // wx.showTabBar(); 
      }
    });
  }
})
