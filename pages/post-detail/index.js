// pages/post-detail/index.js
const app = getApp();

Page({
  data: {
    post: null,
    isLoading: true
  },

  onLoad(options) {
    if (options.id) {
      this.loadPostDetail(options.id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
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

  onShareAppMessage() {
    if (!this.data.post) return {};
    return {
      title: this.data.post.content.substring(0, 30),
      path: `/pages/post-detail/index?id=${this.data.post._id}`,
      imageUrl: this.data.post.images[0] || ''
    };
  }
})