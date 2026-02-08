// pages/order-detail/index.js
const app = getApp();

Page({
  data: {
    order: null,
    isLoading: true
  },

  onLoad(options) {
    if (options.orderId) {
      this.loadOrderDetail(options.orderId);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  loadOrderDetail(orderId) {
    wx.showLoading({ title: '加载中' });
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
        // Map goodSnapshot to good structure expected by template if needed
        // The template uses order.good.title, order.good.images[0], order.good.price
        // Our snapshot has title, price, image (string).
        // Let's adjust the data or the template.
        // Adjust data here:
        if (order.goodSnapshot) {
            order.good = {
                title: order.goodSnapshot.title,
                price: order.goodSnapshot.price,
                images: [order.goodSnapshot.image],
                _openid: order.sellerId // For contact seller
            };
        }
        
        // Ensure amount is formatted
        order.amount = order.totalPrice;

        this.setData({
          order,
          isLoading: false
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

  onBackHome() {
    wx.switchTab({
      url: '/pages/home/index'
    });
  }
})