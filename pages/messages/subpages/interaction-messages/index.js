// pages/messages/subpages/interaction-messages/index.js
const app = getApp();

Page({
  data: {
    interactions: [],
    isLoading: true
  },

  onLoad(options) {
    this.loadInteractions();
  },

  onPullDownRefresh() {
    this.loadInteractions().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadInteractions() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_interactions'
      });

      if (result.success) {
        const list = result.data.map(item => ({
          id: item._id,
          type: 'comment', // Currently only comments
          user: {
            nickName: item.user ? item.user.nickName : '用户',
            avatarUrl: item.user ? item.user.avatarUrl : '/assets/icons/profile.png'
          },
          content: `评论了：${item.content}`,
          targetImage: item.good && item.good.images && item.good.images.length > 0 ? item.good.images[0] : '',
          time: this.formatTime(item.createTime),
          goodId: item.good ? item.good._id : ''
        }));
        this.setData({ interactions: list, isLoading: false });

        // Mark as read
        wx.cloud.callFunction({
          name: 'mark_read',
          data: { type: 'interaction' }
        });
      }
    } catch (err) {
      console.error('加载互动消息失败', err);
      this.setData({ isLoading: false });
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
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: `/pages/goods-detail/index?id=${id}`
      });
    }
  }
})
