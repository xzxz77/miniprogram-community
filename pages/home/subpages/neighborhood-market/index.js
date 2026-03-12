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
    currentLocation: '幸福小区',
    fullLocation: '幸福小区',
    latitude: null,
    longitude: null
  },

  onLoad() {
    this.updateLocationFromStorage();
    this.loadGoods();
  },

  onShow() {
    const oldLocation = this.data.fullLocation;
    this.updateLocationFromStorage();
    const newLocation = this.data.fullLocation;
    
    if (oldLocation !== newLocation) {
        this.onPullDownRefresh();
    }
  },

  updateLocationFromStorage() {
    // Priority: homeLocation (set via map) -> selectedAddress (shipping) -> Default
    const homeLocation = wx.getStorageSync('homeLocation');
    // homeLocation might be just a string if set by previous version of code, 
    // or object if I change how I save it.
    // The previous code saved: wx.setStorageSync('homeLocation', fullLoc); (String)
    // So I can't get coordinates from homeLocation string.
    
    // To support coordinates, I should save an object to homeLocation.
    // But for backward compatibility, check type.
    
    const homeLocationObj = wx.getStorageSync('homeLocationObj'); // New key for object
    
    if (homeLocationObj && homeLocationObj.name) {
        let fullLoc = homeLocationObj.name;
        let displayLoc = fullLoc;
        if (displayLoc.length > 8) {
             displayLoc = displayLoc.substring(0, 8) + '...';
        }
        this.setData({ 
            currentLocation: displayLoc,
            fullLocation: fullLoc,
            latitude: homeLocationObj.latitude,
            longitude: homeLocationObj.longitude
        });
        return;
    }
    
    // Fallback to string homeLocation (no coords)
    if (homeLocation && typeof homeLocation === 'string') {
         let fullLoc = homeLocation;
        let displayLoc = fullLoc;
        if (displayLoc.length > 8) {
             displayLoc = displayLoc.substring(0, 8) + '...';
        }
        this.setData({ 
            currentLocation: displayLoc,
            fullLocation: fullLoc,
            latitude: null,
            longitude: null
        });
        return;
    }

    const selectedAddress = wx.getStorageSync('selectedAddress');
    if (selectedAddress) {
      let fullLoc = selectedAddress.locationName || selectedAddress.address || '幸福小区';
      let displayLoc = fullLoc;
      if (displayLoc.length > 8) {
        displayLoc = displayLoc.substring(0, 8) + '...';
      }
      this.setData({ 
          currentLocation: displayLoc,
          fullLocation: fullLoc,
          latitude: selectedAddress.latitude || null,
          longitude: selectedAddress.longitude || null
      });
    } else {
        this.setData({ 
            currentLocation: '幸福小区',
            fullLocation: '幸福小区',
            latitude: null,
            longitude: null
        });
    }
  },

  onLocationTap() {
    wx.chooseLocation({
      success: (res) => {
        console.log('Chosen location:', res);
        
        let fullLoc = res.name || res.address;
        if (!fullLoc) return;

        // Save to storage as 'homeLocation' (String) and 'homeLocationObj' (Object)
        wx.setStorageSync('homeLocation', fullLoc);
        wx.setStorageSync('homeLocationObj', {
            name: fullLoc,
            latitude: res.latitude,
            longitude: res.longitude
        });

        let displayLoc = fullLoc;
        if (displayLoc.length > 8) {
             displayLoc = displayLoc.substring(0, 8) + '...';
        }

        this.setData({ 
            currentLocation: displayLoc,
            fullLocation: fullLoc,
            latitude: res.latitude,
            longitude: res.longitude
        });
        
        // Reload list
        this.onPullDownRefresh();
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
          sortBy: 'newest',
          userLocation: this.data.fullLocation,
          latitude: this.data.latitude,
          longitude: this.data.longitude,
          maxDistance: 3000 // 3km radius
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
