const app = getApp();

Page({
  data: {
    updates: [],
    isLoading: true
  },

  onLoad(options) {
    this.loadUpdates();
  },

  onPullDownRefresh() {
    this.loadUpdates().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadUpdates() {
    this.setData({ isLoading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_transaction_updates'
      });

      if (result.success) {
        const updates = result.data.map(item => ({
          ...item,
          time: this.formatTime(item.time)
        }));
        this.setData({ updates });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay && date.getDate() === now.getDate()) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diff < 2 * oneDay && date.getDate() === now.getDate() - 1) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: `/pages/order-detail/index?orderId=${id}`
      });
    }
  }
})