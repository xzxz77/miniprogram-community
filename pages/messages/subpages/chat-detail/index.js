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
    myOpenId: '',
    chatId: '',
    isInit: false
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '无效的用户ID', icon: 'none' });
      return;
    }
    
    this.setData({ targetUserId: options.id });
    this.initUser();
  },

  onUnload() {
    if (this.watcher) {
      this.watcher.close();
    }
  },

  async initUser() {
    wx.showLoading({ title: '连接中...' });
    try {
      // 1. 获取自己的 OpenID
      // 尝试调用标准 login 云函数
      let openid = '';
      try {
        const { result } = await wx.cloud.callFunction({ name: 'login' });
        openid = result.openid;
      } catch (e) {
        console.warn('login 云函数调用失败，尝试使用 quickstartFunctions', e);
        // 尝试 fallback (针对某些模板)
        try {
          const { result } = await wx.cloud.callFunction({ 
            name: 'quickstartFunctions', 
            data: { type: 'getOpenId' } 
          });
          openid = result.openid;
        } catch (e2) {
          throw new Error('无法获取OpenID，请检查云函数是否部署');
        }
      }

      if (!openid) throw new Error('OpenID 获取为空');

      this.setData({ myOpenId: openid });

      // 2. 构造 ChatID (A_B, 字典序，保证两个用户生成的 ID 一致)
      const ids = [this.data.myOpenId, this.data.targetUserId].sort();
      const chatId = ids.join('_');
      this.setData({ chatId, isInit: true });
      
      console.log('Chat Init Success:', { myOpenId: openid, targetUserId: this.data.targetUserId, chatId });

      // 3. 开启监听
      this.startWatch();
      wx.hideLoading();

    } catch (err) {
      wx.hideLoading();
      console.error('初始化失败', err);
      wx.showModal({
        title: '初始化失败',
        content: '请确保已部署 login 云函数，并在云开发控制台上传并部署。错误详情: ' + err.message,
        showCancel: false
      });
    }
  },

  startWatch() {
    if (this.watcher) this.watcher.close();

    // ★★★ 重要：如果收不到消息，请检查云数据库 'messages' 集合的权限设置 ★★★
    // 建议设置为：所有用户可读，仅创建者可写 (或自定义安全规则)
    this.watcher = db.collection('messages')
      .where({ chatId: this.data.chatId })
      .orderBy('timestamp', 'asc')
      .watch({
        onChange: snapshot => {
          console.log('收到新消息:', snapshot.docs);
          
          if (snapshot.type === 'init') {
              // 初始化加载
          }

          const messages = snapshot.docs.map((doc, index) => {
            const isMy = doc._openid === this.data.myOpenId;
            return {
              id: doc._id,
              ...doc,
              isMy,
              avatar: isMy 
                ? 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwBHdR3X0x5yWc8X6w3y3y3y3y3y3y3y3y3y3y3y3y3/0' 
                : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150', 
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
          // 权限错误常见代码
          if (err.errCode === -502001 || err.errMsg.includes('permission denied')) {
             wx.showModal({
               title: '权限错误',
               content: '无法读取消息。请在云开发控制台 -> 数据库 -> messages -> 权限设置中，选择【所有用户可读，仅创建者可写】',
               showCancel: false
             });
          }
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
    if (!this.data.isInit) {
        wx.showToast({ title: '正在初始化...', icon: 'none' });
        return;
    }
    
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
          senderId: this.data.myOpenId // 冗余存一个 senderId，方便查
        }
      });
      // 发送成功后，watch 会自动更新界面，无需手动 push
    } catch (err) {
      console.error('发送失败', err);
      wx.showToast({ title: '发送失败: ' + err.errMsg, icon: 'none' });
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
          console.error(err);
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
