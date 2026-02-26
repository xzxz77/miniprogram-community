const app = getApp();

Page({
  data: {
    notifications: [],
    isLoading: true
  },

  onLoad(options) {
    this.loadNotifications();
  },

  onPullDownRefresh() {
    this.loadNotifications().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadNotifications() {
    this.setData({ isLoading: true });
    try {
      console.log('Fetching service notifications...');
      const { result } = await wx.cloud.callFunction({
        name: 'get_service_notifications'
      });
      console.log('Service notifications result:', result);

      if (result && result.success) {
        const notifications = result.data || [];
        
        // Optional: Add some static system notifications if needed
        // const systemNotifications = [ ... ];
        
        this.setData({
          notifications: notifications
        });
        
        if (notifications.length === 0) {
          console.log('No notifications found.');
        }
      } else {
        console.error('Failed to load notifications:', result);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('Fetch notifications failed', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  }
})