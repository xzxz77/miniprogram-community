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
    fullLocation: '幸福小区', // Full location name for API
    searchKeyword: ''
  },

  onLoad: function() {
    const sysInfo = wx.getWindowInfo();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });
    
    // Initialize location from storage immediately
    this.updateLocationFromStorage();
    
    // Load data
    this.getGoodsList();
  },

  onShow() {
    if (typeof wx.getTabBar === 'function' && wx.getTabBar()) {
      wx.getTabBar().setData({
        selected: 0 // Ensure Home tab is selected if using custom tabbar, else system tabbar
      });
      wx.showTabBar(); // Force show system TabBar
    }
    
    // Check for updated location from Storage (Home Location or Address Page)
    const oldLocation = this.data.fullLocation;
    this.updateLocationFromStorage();
    const newLocation = this.data.fullLocation;
    
    if (oldLocation !== newLocation) {
        this.setData({
            page: 1,
            goodsList: [],
            leftList: [],
            rightList: [],
            hasMore: true
        }, () => {
            this.getGoodsList();
        });
    }
  },

  updateLocationFromStorage() {
    // Priority: homeLocation (set via map) -> selectedAddress (shipping) -> Default
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
        // If locationName exists use it, otherwise use truncated address or default
        let fullLoc = selectedAddress.locationName || selectedAddress.address || '幸福小区';
        let displayLoc = fullLoc;
        if (displayLoc.length > 8) {
             displayLoc = displayLoc.substring(0, 8) + '...';
        }
        this.setData({ 
            currentLocation: displayLoc,
            fullLocation: fullLoc 
        });
    } else {
        // If no address selected and currently default, set to test default
        this.setData({ 
            currentLocation: '幸福小区',
            fullLocation: '幸福小区'
        });
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
    wx.chooseLocation({
      success: (res) => {
        // res.name is usually the POI name (e.g., "Happy Garden")
        // res.address is the full address
        console.log('Chosen location:', res);
        
        let fullLoc = res.name || res.address;
        if (!fullLoc) return;

        // Save to storage as 'homeLocation' to distinguish from shipping address
        wx.setStorageSync('homeLocation', fullLoc);

        let displayLoc = fullLoc;
        if (displayLoc.length > 8) {
             displayLoc = displayLoc.substring(0, 8) + '...';
        }

        this.setData({ 
            currentLocation: displayLoc,
            fullLocation: fullLoc,
            // Reset list to trigger reload
            page: 1,
            goodsList: [],
            leftList: [],
            rightList: [],
            hasMore: true
        }, () => {
            this.getGoodsList();
        });
      },
      fail: (err) => {
        // console.error('Choose location failed', err);
        if (err.errMsg.indexOf('auth') !== -1) {
            wx.showModal({
                title: '提示',
                content: '需要获取您的地理位置授权，请在设置中打开',
                success: (res) => {
                    if (res.confirm) {
                        wx.openSetting();
                    }
                }
            });
        }
      }
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
          sortBy: this.data.currentSort,
          userLocation: this.data.fullLocation
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
