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
      
      // 3. 开启监听
      this.startWatch();

    } catch (err) {
      console.error('初始化失败', err);
      // Fallback: 尝试直接监听（如果 openid 获取失败但 database 权限允许）
    }
  },

  startWatch() {
    if (this.watcher) this.watcher.close();

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
    const d = new Date(date);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
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
          senderId: this.data.myOpenId
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
