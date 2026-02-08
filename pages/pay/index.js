// pages/pay/index.js
const app = getApp();

Page({
  data: {
    good: null,
    address: null,
    deliveryMethod: '自提', // Default
    deliveryPrice: 0,
    totalPrice: 0,
    remark: ''
  },

  onLoad(options) {
    if (options.id) {
      this.loadGoodDetail(options.id);
    }
    this.loadDefaultAddress();
  },

  onShow() {
    // Check if address was selected from address list
    const selectedAddress = wx.getStorageSync('selectedAddress');
    if (selectedAddress) {
      this.setData({ address: selectedAddress });
      // wx.removeStorageSync('selectedAddress'); // Keep it or clear it? Usually keep for session.
    }
  },

  async loadGoodDetail(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('goods').doc(id).get();
      const good = res.data;
      
      // Fetch seller info
      try {
        const userRes = await wx.cloud.callFunction({
          name: 'get_user_info',
          data: { openid: good._openid }
        });
        if (userRes.result.success) {
          good.seller = userRes.result.data;
        }
      } catch(e) {
        console.error('Fetch seller failed', e);
      }

      this.setData({
        good,
        totalPrice: good.price // Initial total
      });
      wx.hideLoading();
    } catch (err) {
      console.error(err);
      wx.hideLoading();
      wx.showToast({ title: '商品加载失败', icon: 'none' });
    }
  },

  loadDefaultAddress() {
    // Mock default address if no selected one
    // In real app, fetch from DB or use local storage
    if (!this.data.address) {
       // Try to get from storage first
       const lastAddress = wx.getStorageSync('selectedAddress');
       if (lastAddress) {
           this.setData({ address: lastAddress });
       } else {
           // If nothing, user needs to select
       }
    }
  },

  onSelectAddress() {
    wx.navigateTo({
      url: '/pages/profile/subpages/address-list/index'
    });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  onSubmitOrder() {
    if (!this.data.address) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在支付' });
    
    // Call cloud function to create order
    wx.cloud.callFunction({
      name: 'create_order',
      data: {
        goodId: this.data.good._id,
        address: this.data.address,
        totalPrice: this.data.totalPrice,
        deliveryMethod: this.data.good.deliveryMethod,
        remark: this.data.remark
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        const orderId = res.result.orderId;
        
        // Save pay info for mock order detail (fallback or for immediate transition)
        // Although we should rely on fetching from DB in order-detail now.
        // But keeping it for smooth transition if fetch is slow is okay, 
        // but let's trust the DB fetch in order-detail.
        
        // Navigate to order detail page directly
        wx.redirectTo({
            url: `/pages/order-detail/index?orderId=${orderId}&amount=${this.data.totalPrice}`
        });
      } else {
        wx.showToast({
          title: res.result.msg || '支付失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({
        title: '支付异常',
        icon: 'none'
      });
    });
  }
})
