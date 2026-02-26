// pages/messages/subpages/chat-detail/index.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    messages: [],
    inputValue: '',
    scrollIntoView: '',
    keyboardHeight: 0,
    targetUserId: '',
    targetUserInfo: null, // 对方信息
    myOpenId: '',
    myUserInfo: null,     // 自己信息
    chatId: '',
    isInit: false,
    statusBarHeight: 20,
    navHeight: 44,        // 导航栏内容高度
    totalNavHeight: 64    // 状态栏 + 导航栏
  },

  onLoad(options) {
    // 1. 计算导航栏高度
    const sysInfo = wx.getSystemInfoSync();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    const navHeight = (menuButtonInfo.top - sysInfo.statusBarHeight) * 2 + menuButtonInfo.height;
    const totalNavHeight = sysInfo.statusBarHeight + navHeight;

    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      navHeight,
      totalNavHeight
    });

    if (!options.id) {
      wx.showToast({ title: '无效的用户ID', icon: 'none' });
      return;
    }
    
    this.setData({ targetUserId: options.id });

    // 2. 获取用户信息
    this.initUser();
    this.loadTargetUserInfo(options.id);
  },

  onUnload() {
    if (this.watcher) {
      this.watcher.close();
    }
    // Mark as read when leaving chat
    this.markAsRead();
  },

  goBack() {
    wx.navigateBack();
  },

  async loadTargetUserInfo(targetId) {
    // 获取对方头像昵称
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_user_info',
        data: { openid: targetId }
      });
      if (result.success) {
        this.setData({ targetUserInfo: result.data });
      }
    } catch (e) {
      console.error('获取对方信息失败', e);
    }
  },

  async initUser() {
    // 获取自己信息
    if (app.globalData.userInfo) {
      this.setData({ myUserInfo: app.globalData.userInfo });
    }

    try {
      // 1. 获取自己的 OpenID
      let openid = '';
      if (app.globalData.openid) {
        openid = app.globalData.openid;
      } else {
        const { result } = await wx.cloud.callFunction({ name: 'login' });
        openid = result.openid;
        app.globalData.openid = openid; // 缓存
      }

      this.setData({ myOpenId: openid });

      // 2. 构造 ChatID
      const ids = [this.data.myOpenId, this.data.targetUserId].sort();
      const chatId = ids.join('_');
      this.setData({ chatId, isInit: true });
      
      // 3. 标记已读
      this.markAsRead();

      // 4. 开启监听
      this.startWatch();

    } catch (err) {
      console.error('初始化失败', err);
      // Fallback: 尝试直接监听（如果 openid 获取失败但 database 权限允许）
    }
  },

  markAsRead() {
    wx.cloud.callFunction({
      name: 'mark_read',
      data: {
        chatId: this.data.chatId
      }
    }).catch(err => console.error('标记已读失败', err));
  },

  startWatch() {
    if (this.watcher) this.watcher.close();

    // 1. 标记当前会话所有发给我的未读消息为已读
    // 注意：客户端 update 只能更新自己的记录（如果权限是仅创建者可读写），
    // 这里的 messages 权限如果是“所有用户可读，仅创建者可写”，接收者无法直接 update sender 的消息状态。
    // 因此严谨的做法是调用云函数更新，或仅在本地维护 unread 计数。
    // 为简化，这里假设 messages 表权限允许 update 或我们调用云函数。
    // 这里先省略自动标记已读的云函数调用，留作后续优化。

    this.watcher = db.collection('messages')
      .where({ chatId: this.data.chatId })
      .orderBy('timestamp', 'asc')
      .watch({
        onChange: snapshot => {
          const messages = snapshot.docs.map((doc, index) => {
            const isMy = doc._openid === this.data.myOpenId;
            
            // 决定显示什么头像
            let avatar = '';
            if (isMy) {
              avatar = this.data.myUserInfo?.avatarUrl || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwBHdR3X0x5yWc8X6w3y3y3y3y3y3y3y3y3y3y3y3y3/0';
            } else {
              avatar = this.data.targetUserInfo?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150';
            }

            return {
              id: doc._id,
              ...doc,
              isMy,
              avatar,
              showTime: index === 0 || (snapshot.docs[index-1] && (doc.timestamp - snapshot.docs[index-1].timestamp > 300000)),
              timeDisplay: this.formatTime(doc.timestamp)
            };
          });

          this.setData({
            messages,
            scrollIntoView: `msg-${messages.length > 0 ? messages[messages.length - 1].id : ''}`
          });
        },
        onError: err => {
          console.error('Watch error', err);
        }
      });
  },

  formatTime(date) {
    if (!date) return '';
    // Handle Firestore Timestamp
    if (date.toDate) {
      date = date.toDate();
    }
    const d = new Date(date);
    const now = new Date();
    
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hour = d.getHours().toString().padStart(2, '0');
    const minute = d.getMinutes().toString().padStart(2, '0');

    const isToday = d.getDate() === now.getDate() && 
                    d.getMonth() === now.getMonth() && 
                    d.getFullYear() === now.getFullYear();
    
    const isYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString() === d.toDateString();
    
    const isThisYear = d.getFullYear() === now.getFullYear();

    if (isToday) {
      return `${hour}:${minute}`;
    } else if (isYesterday) {
      return `昨天 ${hour}:${minute}`;
    } else if (isThisYear) {
      return `${month}-${day} ${hour}:${minute}`;
    } else {
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
  },

  // Input Handling
  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  onFocus(e) {
    this.setData({ keyboardHeight: e.detail.height });
    this.scrollToBottom();
  },

  onBlur() {
    this.setData({ keyboardHeight: 0 });
  },

  onTapContent() {
    wx.hideKeyboard();
  },

  scrollToBottom() {
    if (this.data.messages.length > 0) {
      this.setData({
        scrollIntoView: `msg-${this.data.messages[this.data.messages.length - 1].id}`
      });
    }
  },

  // Actions
  async sendMessage() {
    if (!this.data.isInit) return;
    
    const content = this.data.inputValue.trim();
    if (!content) return;

    this.setData({ inputValue: '' });

    try {
      await db.collection('messages').add({
        data: {
          chatId: this.data.chatId,
          content,
          type: 'text',
          timestamp: db.serverDate(),
          receiverId: this.data.targetUserId,
          senderId: this.data.myOpenId,
          isRead: false // 标记为未读
        }
      });
    } catch (err) {
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  chooseImage() {
    if (!this.data.isInit) return;
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        wx.showLoading({ title: '发送中' });
        const filePath = res.tempFiles[0].tempFilePath;
        const cloudPath = `chat/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
        
        try {
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath });
          await db.collection('messages').add({
            data: {
              chatId: this.data.chatId,
              content: uploadRes.fileID,
              type: 'image',
              timestamp: db.serverDate(),
              receiverId: this.data.targetUserId,
              senderId: this.data.myOpenId
            }
          });
        } catch(err) {
          wx.showToast({ title: '图片发送失败', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({
      urls: [src],
      current: src
    });
  }
});
