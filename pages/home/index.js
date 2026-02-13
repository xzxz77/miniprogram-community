// pages/home/index.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    goodsList: [],
    leftList: [], // 瀑布流左侧
    rightList: [], // 瀑布流右侧
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    currentSort: 'newest', // newest or hot
    currentLocation: '请选择地址', // Default location
    searchKeyword: ''
  },

  onLoad: function() {
    const sysInfo = wx.getWindowInfo();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });
    this.getGoodsList();
  },

  onShow() {
    if (typeof wx.getTabBar === 'function' && wx.getTabBar()) {
      wx.getTabBar().setData({
        selected: 0 // Ensure Home tab is selected if using custom tabbar, else system tabbar
      });
      wx.showTabBar(); // Force show system TabBar
    }
    
    // Check for updated location from Address Page
    const selectedAddress = wx.getStorageSync('selectedAddress');
    if (selectedAddress) {
        // If locationName exists use it, otherwise use truncated address or default
        let displayLoc = selectedAddress.locationName || selectedAddress.address || '幸福花园小区';
        if (displayLoc.length > 8) {
             displayLoc = displayLoc.substring(0, 8) + '...';
        }
        this.setData({ currentLocation: displayLoc });
        // Optional: clear storage if you only want it to update once per selection
        // wx.removeStorageSync('selectedAddress');
    }
  },

  onPullDownRefresh: function() {
    this.setData({
      page: 1,
      goodsList: [],
      leftList: [],
      rightList: [],
      hasMore: true
    }, () => {
      this.getGoodsList().then(() => {
        wx.stopPullDownRefresh();
      });
    });
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.setData({
        page: this.data.page + 1
      }, () => {
        this.getGoodsList();
      });
    }
  },

  onLocationTap() {
    wx.navigateTo({
      url: '/pages/profile/subpages/address-list/index'
    });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onSearch() {
    if (this.data.searchKeyword.trim()) {
      wx.navigateTo({
        url: `/pages/home/subpages/search-result/index?keyword=${encodeURIComponent(this.data.searchKeyword)}`
      });
    }
  },

  onSortChange(e) {
    const sort = e.currentTarget.dataset.sort;
    if (this.data.currentSort === sort) return;

    this.setData({
      currentSort: sort,
      page: 1,
      goodsList: [],
      leftList: [],
      rightList: [],
      hasMore: true
    }, () => {
      this.getGoodsList();
    });
  },

  async getGoodsList() {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'get_goods_list',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize,
          sortBy: this.data.currentSort
        }
      });

      if (!res.result.success) {
        throw new Error(res.result.error);
      }

      const newGoods = res.result.data;
      
      // 瀑布流左右分发
      const left = this.data.leftList;
      const right = this.data.rightList;
      
      newGoods.forEach((item, index) => {
        // 处理卖家信息
        item.sellerAvatar = (item.seller && item.seller.avatarUrl) ? item.seller.avatarUrl : 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwBHdR3X0x5yWc8X6w3y3y3y3y3y3y3y3y3y3y3y3y3/0'; 
        item.sellerName = (item.seller && item.seller.nickName) ? item.seller.nickName : '社区邻居';
        item.timeAgo = this.formatTime(item.createTime);
        item.views = item.views || 0;
        item.location = item.location || '未知地点';
        // Truncate location if too long
        if (item.location.length > 6) {
            item.location = item.location.substring(0, 6) + '...';
        }
        
        // 简单的左右平衡算法
        if (left.length <= right.length) {
          left.push(item);
        } else {
          right.push(item);
        }
      });

      this.setData({
        goodsList: [...this.data.goodsList, ...newGoods],
        leftList: left,
        rightList: right,
        hasMore: newGoods.length === this.data.pageSize,
        isLoading: false
      });

    } catch (err) {
      console.error(err);
      this.setData({ isLoading: false });
      // 首次加载失败才提示，避免分页加载失败打断体验
      if (this.data.page === 1) {
          wx.showToast({ title: '加载失败', icon: 'none' });
      }
    }
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
  }
})
