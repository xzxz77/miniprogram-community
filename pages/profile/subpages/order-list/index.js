// pages/profile/subpages/order-list/index.js
Page({
  data: {
    currentTab: 0, // 0: Bought, 1: Sold
    orderList: [],
    isLoading: false,
    statusFilter: '' // To store the status filter
  },

  onLoad: function (options) {
    if (options.type === 'sold') {
      this.setData({ currentTab: 1 });
    }
    if (options.status) {
        this.setData({ statusFilter: options.status });
        const titles = {
            'all': '全部订单',
            'pending': '待付款订单',
            'paid': '待发货订单',
            'shipped': '待收货订单',
            'completed': '已完成订单',
            'cancelled': '退款/售后'
        };
        if (titles[options.status]) {
            wx.setNavigationBarTitle({ title: titles[options.status] });
        }
    }
    this.loadOrders();
  },

  onShow() {
      // Refresh list when showing (e.g. coming back from detail)
      this.loadOrders();
  },

  switchTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ 
        currentTab: index,
        orderList: [] // Clear list to avoid confusion
    }, () => {
        this.loadOrders();
    });
  },

  loadOrders() {
      this.setData({ isLoading: true });
      const type = this.data.currentTab === 1 ? 'sold' : 'bought';
      let status = this.data.statusFilter;
      
      // If status is 'all', we don't send it to cloud function to fetch all
      if (status === 'all') {
          status = '';
      }
      
      wx.cloud.callFunction({
          name: 'get_my_orders',
          data: { type, status }
      }).then(res => {
          this.setData({ isLoading: false });
          if (res.result.success) {
              const orders = res.result.data.map(order => {
                  // Safe access to goodSnapshot
                  const goodSnapshot = order.goodSnapshot || {};
                  let productImage = goodSnapshot.image;
                  
                  // Handle image field - could be string or array
                  if (Array.isArray(productImage)) {
                      productImage = productImage[0] || '';
                  }
                  
                  return {
                      id: order._id || order.id,
                      status: order.status,
                      statusText: this.getStatusText(order.status),
                      // For bought: show seller; For sold: show buyer
                      sellerName: order.otherSide?.nickName || '未知用户',
                      sellerAvatar: order.otherSide?.avatarUrl || '/assets/icons/avatar.png',
                      productTitle: goodSnapshot.title || '商品信息',
                      productImage: productImage || '/assets/icons/placeholder.png',
                      price: order.totalPrice || goodSnapshot.price || 0,
                      // Refund info
                      refundReason: order.refundReason || '',
                      refundApplyTime: order.refundApplyTime || null
                  };
              });
              this.setData({ orderList: orders });
          } else {
              wx.showToast({ title: '加载失败', icon: 'none' });
          }
      }).catch(err => {
          this.setData({ isLoading: false });
          console.error(err);
          wx.showToast({ title: '网络异常', icon: 'none' });
      });
  },

  getStatusText(status) {
      const map = {
        'pending_payment': '待付款',
        'paid': '买家已付款',
        'shipped': '卖家已发货',
        'completed': '交易完成',
        'cancelled': '交易取消',
        'sold': '已售出',
        'refund_pending': '退款审核中',
        'refunded': '已退款'
      };
      return map[status] || '未知状态';
  },

  onOrderTap(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({
        url: `/pages/order-detail/index?orderId=${id}`
      });
  }
})