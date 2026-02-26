// app.js
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-5gkt6aas74a87c0a', // 您的环境 ID
        traceUser: true,
      })
    }
    
    // 尝试静默登录
    this.checkUserLogin();

    // Start polling for messages
    this.startMessagePolling();
  },

  startMessagePolling() {
    // Poll every 10 seconds
    setInterval(() => {
        if (this.globalData.isLogged) {
            this.checkNewMessages();
        }
    }, 10000);
  },

  async checkNewMessages() {
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
            const currentTotal = result.interactionUnread + result.transactionUnread + result.serviceUnread + (result.chatUnread || 0);
            const lastTotal = this.globalData.lastUnreadCount || 0;

            // Update global stored count
            this.globalData.lastUnreadCount = currentTotal;

            if (currentTotal > lastTotal) {
                // Check if current page is Messages page
                const pages = getCurrentPages();
                const currentPage = pages[pages.length - 1];
                
                if (currentPage && currentPage.route !== 'pages/messages/index') {
                    // Try to use the top-notification component if available on the page
                    // We need to select the component instance from the current page
                    const notification = currentPage.selectComponent('#top-notification');
                    if (notification) {
                        notification.show({
                            title: '新消息提醒',
                            content: '您收到了新的消息，点击查看',
                            path: '/pages/messages/index'
                        });
                    } else {
                        // Fallback to modal if component not present (should ideally be on all pages via layout or app-wide logic but global component is tricky in MP without custom tabbar/page wrapper)
                        // Or just suppress if we rely on component. 
                        // But user asked to REPLACE the modal. 
                        // To make it work globally, every page needs to include <top-notification id="top-notification" />.
                        // I will add it to key pages first.
                    }
                }
            }
            
            // Update TabBar Badge
            const badgeCount = result.chatUnread || currentTotal; // Usually tab badge is for chats, but user wants notification for all?
            // Let's stick to total for now to be safe, or just chat.
            // Earlier I used chatUnread for tab badge.
            // Let's use result.chatUnread if available, else total.
            // Actually, previously it was just chat list unread.
            // Let's sum them all for the badge if that's what "New Message" implies.
            // Or just use chatUnread for the badge on the tab, and popup for ANY new thing.
            // Let's use total for badge to be consistent with "There is something new".
            
            if (currentTotal > 0) {
                 wx.setTabBarBadge({
                    index: 3,
                    text: currentTotal > 99 ? '99+' : currentTotal.toString()
                 });
            } else {
                 wx.removeTabBarBadge({ index: 3 });
            }
        }
    } catch (e) {
        // console.error('Poll failed', e);
    }
  },

  async checkUserLogin() {
    // Check if explicitly logged out
    if (wx.getStorageSync('isLoggedOut')) {
        return;
    }

    try {
      // 1. 调用云函数获取 OpenID
      const { result } = await wx.cloud.callFunction({ name: 'login' });
      const openid = result.openid;
      
      this.globalData.openid = openid;

      // 2. 查询数据库是否存在该用户
      const db = wx.cloud.database();
      const res = await db.collection('users').where({ _openid: openid }).get();

      if (res.data.length > 0) {
        // 已注册：更新全局数据
        this.globalData.userInfo = res.data[0];
        this.globalData.isLogged = true;
      } else {
        // 未注册
        this.globalData.userInfo = null;
        this.globalData.isLogged = false;
      }
      
      // 如果有回调等待，执行回调
      if (this.userLoginReadyCallback) {
        this.userLoginReadyCallback(this.globalData.userInfo);
      }

    } catch (err) {
      console.error('登录检查失败', err);
      // 即使失败，也要尝试触发回调以免页面死等
      if (this.userLoginReadyCallback) {
        this.userLoginReadyCallback(null);
      }
    }
  },

  // 提供全局注册方法
  async registerUser(userData) {
    const db = wx.cloud.database();
    try {
      // 默认基础信息
      const newUser = {
        ...userData, // 包含 nickName, avatarUrl 等
        credit: '信用极好',
        verified: false,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        bio: '这个人很懒，什么都没写'
      };

      const res = await db.collection('users').add({
        data: newUser
      });

      // 更新全局状态
      this.globalData.userInfo = { ...newUser, _id: res._id, _openid: this.globalData.openid };
      this.globalData.isLogged = true;
      return true;

    } catch (err) {
      console.error('注册失败', err);
      return false;
    }
  },

  globalData: {
    userInfo: null,
    openid: null,
    isLogged: false
  }
})
