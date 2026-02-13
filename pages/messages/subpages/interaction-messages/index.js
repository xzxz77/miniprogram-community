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
        const list = result.data.map(item => {
          let targetImage = '';
          let targetId = '';
          let targetType = '';

          if (item.good) {
            targetImage = item.good.images && item.good.images.length > 0 ? item.good.images[0] : '';
            targetId = item.good._id;
            targetType = 'good';
          } else if (item.post) {
            targetImage = item.post.images && item.post.images.length > 0 ? item.post.images[0] : '';
            targetId = item.post._id;
            targetType = 'post';
          }

          return {
            id: item._id,
            type: 'comment',
            user: {
              nickName: item.user ? item.user.nickName : '用户',
              avatarUrl: item.user ? item.user.avatarUrl : '/assets/icons/profile.png'
            },
            content: `评论了：${item.content}`,
            targetImage,
            time: this.formatTime(item.createTime),
            targetId,
            targetType
          };
        });
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
    const { id, type } = e.currentTarget.dataset;
    if (id && type) {
      const url = type === 'good' 
        ? `/pages/goods-detail/index?id=${id}`
        : `/pages/post-detail/index?id=${id}`;
      
      wx.navigateTo({ url });
    }
  }
})
