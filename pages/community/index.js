// pages/community/index.js
const app = getApp();

Page({
  data: {
    categories: ['全部', '互助问答', '新鲜事', '避坑指南', '宠物联盟'],
    currentCategory: '全部',
    posts: [],
    page: 1,
    pageSize: 10,
    isLoading: false,
    hasMore: true,
    statusBarHeight: 20,
    currentLocation: '幸福花园'
  },

  onShow() {
    const selectedAddress = wx.getStorageSync('selectedAddress');
    if (selectedAddress) {
      let displayLoc = selectedAddress.locationName || selectedAddress.address || '幸福花园';
      if (displayLoc.length > 6) {
        displayLoc = displayLoc.substring(0, 6) + '...';
      }
      this.setData({ currentLocation: displayLoc });
    }
  },

  onLoad() {
    const sysInfo = wx.getWindowInfo();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });
    this.loadPosts(true);
  },

  onPullDownRefresh() {
    this.loadPosts(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadPosts(false);
    }
  },

  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.currentCategory) return;
    
    this.setData({
      currentCategory: category,
      posts: [],
      page: 1,
      hasMore: true
    }, () => {
      this.loadPosts(true);
    });
  },

  async loadPosts(reset = false) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_posts',
        data: {
          category: this.data.currentCategory,
          page: this.data.page,
          pageSize: this.data.pageSize,
          userLocation: this.data.currentLocation
        }
      });

      if (result.success) {
        const newPosts = result.data;
        this.setData({
          posts: reset ? newPosts : [...this.data.posts, ...newPosts],
          page: this.data.page + 1,
          hasMore: newPosts.length === this.data.pageSize,
          isLoading: false
        });
      }
    } catch (err) {
      console.error(err);
      this.setData({ isLoading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onPostTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post-detail/index?id=${id}`
    });
  },

  onLikeTap(e) {
    const index = e.currentTarget.dataset.index;
    const post = this.data.posts[index];
    // Optimistic update
    const isLiked = !post.isLiked;
    const likeCount = isLiked ? post.likeCount + 1 : post.likeCount - 1;
    
    const up = `posts[${index}].isLiked`;
    const countUp = `posts[${index}].likeCount`;
    
    this.setData({
      [up]: isLiked,
      [countUp]: likeCount
    });

    // Call cloud function to update like (mock)
    // wx.cloud.callFunction({ name: 'like_post', data: { postId: post._id } });
  },

  previewImage(e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;
    wx.previewImage({
      current,
      urls
    });
  }
})