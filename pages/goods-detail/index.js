// pages/goods-detail/index.js
const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    good: null, // 商品详情
    seller: null, // 卖家信息
    isLoading: true,
    isFavorited: false,
    currentImage: 0,
    isOwner: false, // 是否是商品发布者
    comments: [],
    showCommentInput: false,
    commentContent: '',
    keyboardHeight: 0
  },

  onLoad: function(options) {
    const sysInfo = wx.getWindowInfo();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });

    if (options.id) {
      this.getGoodDetail(options.id);
      this.loadComments(options.id);
    }
  },

  onShowInput() {
    if (!app.globalData.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.setData({ showCommentInput: true });
  },

  hideInput() {
    this.setData({ 
      showCommentInput: false,
      keyboardHeight: 0
    });
  },

  onCommentInput(e) {
    this.setData({ commentContent: e.detail.value });
  },

  onInputFocus(e) {
    this.setData({ keyboardHeight: e.detail.height });
  },

  onInputBlur() {
    this.setData({ keyboardHeight: 0 });
  },

  async onSendComment() {
    if (!this.data.commentContent.trim()) return;

    wx.showLoading({ title: '提交中' });
    try {
      await wx.cloud.callFunction({
        name: 'add_comment',
        data: {
          goodId: this.data.good._id,
          content: this.data.commentContent
        }
      });
      wx.hideLoading();
      wx.showToast({ title: '留言成功' });
      
      this.setData({ 
        commentContent: '',
        showCommentInput: false,
        keyboardHeight: 0
      });
      
      this.loadComments(this.data.good._id);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '留言失败', icon: 'none' });
    }
  },

  async loadComments(goodId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_comments',
        data: { goodId }
      });
      
      if (result.success) {
        const comments = result.data.map(c => ({
          ...c,
          timeDisplay: this.formatTime(c.createTime)
        }));
        this.setData({ comments });
      }
    } catch (err) {
      console.error('加载留言失败', err);
    }
  },

  goBack() {
    wx.navigateBack();
  },

  onShareAppMessage() {
    if (!this.data.good) return {};
    return {
      title: this.data.good.title,
      imageUrl: this.data.good.images[0]
    };
  },

  async getGoodDetail(id) {
    this.setData({ isLoading: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('goods').doc(id).get();
      const good = res.data;

      // 格式化时间
      good.publishTime = this.formatTime(good.createTime);

      // 判断是否是发布者
      let isOwner = false;
      if (app.globalData.openid && app.globalData.openid === good._openid) {
        isOwner = true;
      } else {
        // Double check using login function if globalData is empty (rare case)
        try {
           const { result } = await wx.cloud.callFunction({ name: 'login' });
           if (result.openid === good._openid) isOwner = true;
           app.globalData.openid = result.openid; // cache it
        } catch(e) {}
      }

      // 增加浏览量 (静默更新)
      db.collection('goods').doc(id).update({
        data: {
          views: db.command.inc(1)
        }
      });

      // 获取卖家信息
      let seller = null;
      try {
        // 使用云函数获取卖家信息（绕过数据库权限限制）
        const { result } = await wx.cloud.callFunction({
          name: 'get_user_info',
          data: { openid: good._openid }
        });

        if (result.success) {
          seller = result.data;
        } else {
          console.warn('获取卖家信息未成功:', result.msg);
        }
      } catch (e) {
        console.error('调用 get_user_info 失败', e);
      }

      // 如果没查到，使用默认信息
      if (!seller) {
        seller = {
          nickName: '社区邻居',
          avatarUrl: '',
          credit: '信用极好',
          isVerified: false
        };
      }

      // 获取收藏状态
      if (app.globalData.openid) {
        db.collection('favorites').where({
          _openid: app.globalData.openid,
          goodId: id
        }).count().then(res => {
          this.setData({ isFavorited: res.total > 0 });
        });
      }

      this.setData({
        good: good,
        seller: seller,
        isOwner: isOwner,
        isLoading: false
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '获取详情失败', icon: 'none' });
      this.setData({ isLoading: false });
    }
  },

  onEditGood() {
    wx.navigateTo({
      url: `/pages/publish/index?id=${this.data.good._id}&mode=edit` // 需在发布页处理 edit 模式
    });
  },

  onOffShelf() {
    wx.showModal({
      title: '提示',
      content: '确定要下架该商品吗？下架后别人将无法看到',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中' });
          try {
            const db = wx.cloud.database();
            await db.collection('goods').doc(this.data.good._id).update({
              data: { status: 'offline' }
            });
            wx.hideLoading();
            wx.showToast({ title: '已下架' });
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  onDeleteGood() {
    wx.showModal({
      title: '警告',
      content: '确定要删除该商品吗？此操作不可恢复',
      confirmColor: '#ff0000',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          try {
            const db = wx.cloud.database();
            // 软删除
            await db.collection('goods').doc(this.data.good._id).update({
              data: { status: 'deleted' }
            });
            wx.hideLoading();
            wx.showToast({ title: '已删除' });
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  formatTime(date) {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    const diff = (now - d) / 1000;
    
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    return Math.floor(diff / 86400) + '天前';
  },

  onSwiperChange(e) {
    this.setData({ currentImage: e.detail.current });
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.url;
    wx.previewImage({
      current,
      urls: this.data.good.images
    });
  },

  toggleFavorite() {
    if (!app.globalData.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const db = wx.cloud.database();
    if (this.data.isFavorited) {
      // 取消收藏
      db.collection('favorites').where({
        _openid: app.globalData.openid,
        goodId: this.data.good._id
      }).remove().then(() => {
        this.setData({ isFavorited: false });
        wx.showToast({ title: '已取消收藏', icon: 'none' });
      });
    } else {
      // 添加收藏
      db.collection('favorites').add({
        data: {
          goodId: this.data.good._id,
          createTime: db.serverDate()
        }
      }).then(() => {
        this.setData({ isFavorited: true });
        wx.showToast({ title: '已收藏' });
      });
    }
  },

  onContactSeller() {
    if (!this.data.good || !this.data.good._openid) return;
    wx.navigateTo({ 
      url: `/pages/messages/subpages/chat-detail/index?id=${this.data.good._openid}` 
    });
  },
  
  onViewSeller() {
    if (!this.data.good || !this.data.good._openid) return;
    wx.navigateTo({
      url: `/pages/user-home/index?id=${this.data.good._openid}`
    });
  },
  
  onBuyNow() {
    if (!app.globalData.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    if (!this.data.good) return;

    if (this.data.good.status !== 'active') {
        wx.showToast({ title: '商品已下架或已卖出', icon: 'none' });
        return;
    }

    wx.navigateTo({
      url: `/pages/pay/index?id=${this.data.good._id}`
    });
  }
})
