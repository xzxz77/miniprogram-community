// pages/order-detail/index.js
const app = getApp();

Page({
  data: {
    order: null,
    isLoading: true,
    isBuyer: false,
    isSeller: false
  },

  onLoad(options) {
    if (options.orderId) {
      this.loadOrderDetail(options.orderId);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  async loadOrderDetail(orderId) {
    wx.showLoading({ title: '加载中' });
    
    // Ensure openid
    if (!app.globalData.openid) {
        try {
            await app.checkUserLogin();
        } catch(e) {}
    }

    wx.cloud.callFunction({
      name: 'get_order_detail',
      data: { orderId }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        const order = res.result.data;
        // Format data for display
        order.id = order._id; // Map _id to id
        order.createTime = this.formatTime(new Date(order.createTime));
        order.statusText = this.getStatusText(order.status);
        
        if (order.goodSnapshot) {
            order.good = {
                title: order.goodSnapshot.title,
                price: order.goodSnapshot.price,
                images: [order.goodSnapshot.image],
                _openid: order.sellerId 
            };
        }
        order.amount = order.totalPrice;

        const openid = app.globalData.openid;
        this.setData({
          order,
          isLoading: false,
          isBuyer: order._openid === openid,
          isSeller: order.sellerId === openid
        });
      } else {
        wx.showToast({ title: res.result.msg || '加载失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '网络异常', icon: 'none' });
    });
  },

  getStatusText(status) {
    const map = {
      'paid': '买家已付款',
      'shipped': '卖家已发货',
      'completed': '交易完成',
      'cancelled': '交易取消'
    };
    return map[status] || '未知状态';
  },

  formatTime(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  },

  onContactSeller() {
    if (!this.data.order || !this.data.order.good || !this.data.order.good._openid) return;
    wx.navigateTo({
      url: '/pages/messages/subpages/chat-detail/index?id=' + this.data.order.good._openid
    });
  },
  
  onContactBuyer() {
    if (!this.data.order || !this.data.order._openid) return;
    wx.navigateTo({
      url: '/pages/messages/subpages/chat-detail/index?id=' + this.data.order._openid
    });
  },

  onBackHome() {
    wx.switchTab({
      url: '/pages/home/index'
    });
  },

  onShip() {
    wx.showModal({
      title: '确认发货',
      content: '请确认您已发出商品，确认后将通知买家',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus('ship');
        }
      }
    });
  },

  onReceive() {
    wx.showModal({
      title: '确认收货',
      content: '请确认您已收到商品且无误，确认后交易将完结',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus('receive');
        }
      }
    });
  },

  onCancelOrder() {
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？取消后款项将原路退回（模拟）。',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus('cancel');
        }
      }
    });
  },

  updateOrderStatus(action) {
    wx.showLoading({ title: '处理中' });
    wx.cloud.callFunction({
      name: 'update_order_status',
      data: {
        orderId: this.data.order._id,
        action: action
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ title: '操作成功' });
        // Refresh detail
        this.loadOrderDetail(this.data.order._id);
      } else {
        wx.showToast({ title: res.result.msg || '操作失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '网络异常', icon: 'none' });
    });
  }
})