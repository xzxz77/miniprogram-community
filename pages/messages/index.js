// pages/messages/index.js
Page({
  data: {
    chatList: [
      {
        id: 1,
        name: '李大爷',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100',
        unread: 2,
        time: '10:23',
        message: '小伙子，那个手表还在吗？诚心想要。',
        goodsImg: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'
      },
      {
        id: 2,
        name: '张工',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=100&h=100',
        unread: 0,
        time: '昨天',
        message: '好的，那我晚上下班过去拿。',
        goodsImg: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=100&h=100'
      },
      {
        id: 3,
        name: '社区小判官-系统',
        avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=100&h=100',
        unread: 0,
        time: '周一',
        message: '您参与的纠纷调解已有结果...',
        goodsImg: ''
      }
    ]
  },

  onLoad(options) {
    // 实际开发中这里会从服务器获取聊天列表
  },

  onClearUnread() {
    wx.showModal({
      title: '提示',
      content: '确定清除所有未读消息吗？',
      success: (res) => {
        if (res.confirm) {
          const newList = this.data.chatList.map(item => ({...item, unread: 0}));
          this.setData({ chatList: newList });
          wx.showToast({ title: '已清除', icon: 'none' });
        }
      }
    });
  }
})