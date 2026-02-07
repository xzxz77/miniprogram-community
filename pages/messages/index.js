// pages/messages/index.js
const app = getApp();

Page({
  data: {
    chatList: [],
    isLoading: false,
    tabBarHeight: 50, // Default
    interactionUnread: 0
  },

  onShow() {
    this.loadChatList();
    this.loadInteractionUnread();
    
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  onPullDownRefresh() {
    Promise.all([
        this.loadChatList(),
        this.loadInteractionUnread()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadInteractionUnread() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_interaction_unread'
      });
      if (result.success) {
        this.setData({ interactionUnread: result.total });
      }
    } catch (err) {
      console.error('获取互动未读数失败', err);
    }
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
      } else {
        console.error('获取消息列表失败', result.error);
        this.setData({ isLoading: false });
      }
    } catch (err) {
      console.error('调用云函数失败', err);
      this.setData({ isLoading: false });
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
          this.setData({ chatList: newList });
          
          // 调用云函数批量更新数据库状态
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