// pages/messages/index.js
const app = getApp();

Page({
  data: {
    chatList: [],
    isLoading: false,
    tabBarHeight: 50, // Default
    interactionUnread: 0,
    transactionUnread: 0,
    serviceUnread: 0
  },

  onShow() {
    this.loadChatList();
    this.loadUnreadCounts();
    
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  onPullDownRefresh() {
    Promise.all([
        this.loadChatList(),
        this.loadUnreadCounts()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadUnreadCounts() {
    try {
      const lastReadServiceTime = wx.getStorageSync('lastReadServiceTime');
      const lastReadTransactionTime = wx.getStorageSync('lastReadTransactionTime');

      const { result } = await wx.cloud.callFunction({
        name: 'get_unread_counts',
        data: {
            lastReadServiceTime,
            lastReadTransactionTime
        }
      });
      if (result.success) {
        this.setData({ 
            interactionUnread: result.interactionUnread,
            transactionUnread: result.transactionUnread,
            serviceUnread: result.serviceUnread
        });
      }
    } catch (err) {
      console.error('获取未读数失败', err);
    }
  },

  onServiceTap() {
    wx.setStorageSync('lastReadServiceTime', new Date());
    this.setData({ serviceUnread: 0 });
  },

  onTransactionTap() {
    wx.setStorageSync('lastReadTransactionTime', new Date());
    this.setData({ transactionUnread: 0 });
  },

  async loadChatList() {
    if (!app.globalData.openid) {
      try {
        await app.checkUserLogin();
      } catch(e) {}
    }

    // 仅首次加载显示 loading，下拉刷新不显示全屏 loading
    if (this.data.chatList.length === 0) {
        this.setData({ isLoading: true });
    }

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_chat_list'
      });

      if (result.success) {
        this.setData({
          chatList: result.data,
          isLoading: false
        });
        
        // Update tab bar badge
        this.updateTabBarBadge(result.data);
      } else {
        console.error('获取消息列表失败', result.error);
        this.setData({ isLoading: false });
      }
    } catch (err) {
      console.error('调用云函数失败', err);
      this.setData({ isLoading: false });
    }
  },

  updateTabBarBadge(list) {
    // Total unread = chat unread + interaction + transaction + service?
    // Usually tab badge is just for chats, or all.
    // Let's keep it for chats for now as per previous logic, OR sum them all up.
    // Ideally sum them all up.
    // But interactionUnread is fetched separately.
    // Let's just sum chats for now, or wait until loadUnreadCounts finishes.
    // But they are async independent.
    // Let's stick to chat unread for tab bar badge to avoid complexity, or update it in both places.
    
    const chatUnread = list.reduce((sum, item) => sum + (item.unread || 0), 0);
    const totalUnread = chatUnread; // + this.data.interactionUnread ...?
    
    // Note: if we want to include other unreads, we should call this after both are loaded.
    // But for now, let's just stick to chat messages for the tab badge to be consistent with 'Messages' tab usually meaning 'IM'.
    // If the user wants all notifications to badge the tab, we should add them.
    // Let's stick to chat unread for now.
    
    if (totalUnread > 0) {
      wx.setTabBarBadge({
        index: 3, // Messages tab index
        text: totalUnread > 99 ? '99+' : totalUnread.toString()
      });
    } else {
      wx.removeTabBarBadge({
        index: 3
      });
    }
  },

  onClearUnread() {
    wx.showModal({
      title: '提示',
      content: '确定清除所有未读消息吗？',
      success: async (res) => {
        if (res.confirm) {
          // 乐观更新 UI
          const newList = this.data.chatList.map(item => ({...item, unread: 0}));
          this.setData({ 
              chatList: newList,
              interactionUnread: 0,
              transactionUnread: 0,
              serviceUnread: 0
          });
          
          // Clear storages
          wx.setStorageSync('lastReadServiceTime', new Date());
          wx.setStorageSync('lastReadTransactionTime', new Date());

          // Mark chats and interactions as read
          wx.cloud.callFunction({
            name: 'mark_read',
            data: { scope: 'all' }
          }).then(() => {
             wx.showToast({ title: '已清除', icon: 'none' });
          }).catch(err => {
             console.error('清除失败', err);
          });
        }
      }
    });
  }
})