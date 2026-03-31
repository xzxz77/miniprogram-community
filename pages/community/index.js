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
    currentLocation: '请选择地址',
    fullLocation: '广州南方学院'
  },

  onShow() {
    this.updateLocationFromStorage();
    // 每次进入页面都刷新帖子列表
    this.setData({
      posts: [],
      page: 1,
      hasMore: true
    }, () => {
      this.loadPosts(true);
    });
  },

  onLoad() {
    const sysInfo = wx.getWindowInfo();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });

    this.updateLocationFromStorage();
    this.loadPosts(true);
  },

  updateLocationFromStorage() {
    // 与首页保持一致：homeLocation 优先，其次 selectedAddress
    const homeLocation = wx.getStorageSync('homeLocation');

    if (homeLocation) {
      let fullLoc = homeLocation;
      let displayLoc = fullLoc;
      if (displayLoc.length > 8) {
        displayLoc = displayLoc.substring(0, 8) + '...';
      }
      this.setData({
        currentLocation: displayLoc,
        fullLocation: fullLoc
      });
      return;
    }

    const selectedAddress = wx.getStorageSync('selectedAddress');
    if (selectedAddress) {
      let fullLoc = selectedAddress.locationName || selectedAddress.address || '广州南方学院';
      let displayLoc = fullLoc;
      if (displayLoc.length > 8) {
        displayLoc = displayLoc.substring(0, 8) + '...';
      }
      this.setData({
        currentLocation: displayLoc,
        fullLocation: fullLoc
      });
    } else {
      // 默认显示所有地区（相当于选择了"广州南方学院"）
      this.setData({
        currentLocation: '广州南方学院',
        fullLocation: '广州南方学院'
      });
    }
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
          userLocation: this.data.fullLocation
        }
      });

      if (result.success) {
        const newPosts = (result.data || []).map((item) => {
          const post = { ...item };
          post.location = post.location || '未知地点';
          if (post.location.length > 6) {
            post.location = post.location.substring(0, 6) + '...';
          }
          return post;
        });

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