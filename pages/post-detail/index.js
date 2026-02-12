// pages/post-detail/index.js
const app = getApp();

Page({
  data: {
    post: null,
    isLoading: true,
    comments: [],
    showInput: false,
    content: '',
    placeholder: '',
    replyTo: null,
    keyboardHeight: 0
  },

  onLoad(options) {
    if (options.id) {
      this.loadPostDetail(options.id);
      this.loadComments(options.id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }

    this.onKeyboardHeightChange = (res) => {
      if (this.data.showInput) {
        this.setData({ keyboardHeight: res.height });
      }
    };
    wx.onKeyboardHeightChange(this.onKeyboardHeightChange);
  },

  onUnload() {
    if (this.onKeyboardHeightChange) {
      wx.offKeyboardHeightChange(this.onKeyboardHeightChange);
    }
  },

  async loadComments(id) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'comment_service',
        data: { 
          action: 'list',
          postId: id 
        }
      });
      
      if (result.success) {
        this.setData({
          comments: result.data
        });
      }
    } catch (err) {
      console.error('Load comments failed', err);
    }
  },

  async loadPostDetail(id) {
    this.setData({ isLoading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_post_detail',
        data: { postId: id }
      });

      if (result.success) {
        this.setData({
          post: result.data,
          isLoading: false
        });
      } else {
        wx.showToast({ title: result.msg || '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      this.setData({ isLoading: false });
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  },

  previewImage(e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;
    wx.previewImage({
      current,
      urls
    });
  },

  onAuthorTap() {
    if (this.data.post && this.data.post._openid) {
      wx.navigateTo({
        url: `/pages/user-home/index?id=${this.data.post._openid}`
      });
    }
  },

  async onLikeTap() {
    if (!app.globalData.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const post = this.data.post;
    if (!post) return;

    // Optimistic update
    const isLiked = !post.isLiked;
    const likeCount = isLiked ? post.likeCount + 1 : post.likeCount - 1;

    this.setData({
      'post.isLiked': isLiked,
      'post.likeCount': likeCount
    });

    try {
      await wx.cloud.callFunction({
        name: 'toggle_like',
        data: { postId: post._id }
      });
    } catch (err) {
      console.error('Like failed', err);
      // Revert if failed
      this.setData({
        'post.isLiked': !isLiked,
        'post.likeCount': isLiked ? likeCount - 1 : likeCount + 1
      });
    }
  },

  async onFavoriteTap() {
    if (!app.globalData.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    // Placeholder for favorite logic
    const post = this.data.post;
    const isFavorited = !post.isFavorited;
    
    this.setData({
      'post.isFavorited': isFavorited
    });
    
    wx.showToast({ title: isFavorited ? '已收藏' : '已取消收藏', icon: 'none' });
  },

  onShowInput() {
    this.setData({ 
      showInput: true,
      placeholder: '说点什么...',
      replyTo: null 
    });
  },

  hideInput() {
    this.setData({ 
      showInput: false,
      keyboardHeight: 0
    });
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  onFocus(e) {
    // this.setData({ keyboardHeight: e.detail.height });
  },

  onBlur() {
    // this.setData({ keyboardHeight: 0 });
  },

  onReply(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({
      showInput: true,
      replyTo: id,
      content: `回复 @${name}：`,
      placeholder: `回复 @${name}: `
    });
  },

  async onSend() {
    if (!this.data.content.trim()) return;
    
    if (!app.globalData.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发送中' });
    
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'comment_service',
        data: {
          action: 'add',
          postId: this.data.post._id,
          content: this.data.content,
          replyToId: this.data.replyTo
        }
      });

      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '评论成功' });
        this.setData({
          content: '',
          showInput: false,
          replyTo: null
        });
        // Refresh comments
        this.loadComments(this.data.post._id);
      } else {
        wx.showToast({ title: result.msg || '发送失败', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  }
})