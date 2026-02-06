// pages/home/subpages/neighborhood-market/index.js
const app = getApp();

Page({
  data: {
    goodsList: [],
    leftList: [],
    rightList: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    currentLocation: '幸福花园小区'
  },

  onLoad() {
    this.updateLocation();
    this.loadGoods();
  },

  onShow() {
    this.updateLocation();
  },

  updateLocation() {
    const selectedAddress = wx.getStorageSync('selectedAddress');
    if (selectedAddress) {
      let displayLoc = selectedAddress.locationName || selectedAddress.address || '幸福花园小区';
      if (displayLoc.length > 8) {
        displayLoc = displayLoc.substring(0, 8) + '...';
      }
      if (this.data.currentLocation !== displayLoc) {
        this.setData({ currentLocation: displayLoc });
        // Optionally reload goods based on location if backend supports it
        // this.onPullDownRefresh(); 
      }
    }
  },

  onLocationTap() {
    wx.navigateTo({
      url: '/pages/profile/subpages/address-list/index'
    });
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      goodsList: [],
      leftList: [],
      rightList: [],
      hasMore: true
    }, () => {
      this.loadGoods().then(() => {
        wx.stopPullDownRefresh();
      });
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.setData({
        page: this.data.page + 1
      }, () => {
        this.loadGoods();
      });
    }
  },

  async loadGoods() {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    try {
      // In a real app, we would pass lat/long to find nearby items
      const res = await wx.cloud.callFunction({
        name: 'get_goods_list',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize,
          sortBy: 'newest'
        }
      });

      if (!res.result.success) {
        throw new Error(res.result.error);
      }

      const newGoods = res.result.data;
      
      const left = this.data.leftList;
      const right = this.data.rightList;
      
      newGoods.forEach(item => {
        item.sellerAvatar = (item.seller && item.seller.avatarUrl) ? item.seller.avatarUrl : 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwBHdR3X0x5yWc8X6w3y3y3y3y3y3y3y3y3y3y3y3y3/0'; 
        item.sellerName = (item.seller && item.seller.nickName) ? item.seller.nickName : '社区邻居';
        item.timeAgo = this.formatTime(item.createTime);
        
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
