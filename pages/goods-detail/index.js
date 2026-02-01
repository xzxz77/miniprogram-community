// pages/goods-detail/index.js
const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    good: null, // 商品详情
    seller: null, // 卖家信息
    isLoading: true,
    isFavorited: false, // 是否收藏
    currentImage: 0, // 当前轮播图索引
  },

  onLoad: function(options) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });

    if (options.id) {
      this.getGoodDetail(options.id);
    }
  },

  goBack() {
    wx.navigateBack();
  },

  onShareAppMessage() {
    if (!this.data.good) return {};
    return {
      title: this.data.good.title,
      imageUrl: this.data.good.images[0]
    };
  },

  async getGoodDetail(id) {
    this.setData({ isLoading: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('goods').doc(id).get();
      const good = res.data;

      // 格式化时间
      good.publishTime = this.formatTime(good.createTime);

      // 增加浏览量 (静默更新)
      db.collection('goods').doc(id).update({
        data: {
          views: db.command.inc(1)
        }
      });

      // 获取卖家信息
      let seller = null;
      try {
        const userRes = await db.collection('users').where({ _openid: good._openid }).get();
        if (userRes.data.length > 0) {
          seller = userRes.data[0];
          // 补充默认字段
          seller.credit = seller.credit || '信用极好';
          seller.isVerified = seller.verified || false;
        }
      } catch (e) {
        console.error('获取卖家信息失败', e);
      }

      // 如果没查到（比如权限问题），使用默认信息
      if (!seller) {
        seller = {
          nickName: '社区邻居',
          avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwBHdR3X0x5yWc8X6w3y3y3y3y3y3y3y3y3y3y3y3y3/0',
          credit: '信用极好',
          isVerified: false
        };
      }

      this.setData({
        good: good,
        seller: seller,
        isLoading: false
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '获取详情失败', icon: 'none' });
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

  onSwiperChange(e) {
    this.setData({ currentImage: e.detail.current });
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.url;
    wx.previewImage({
      current,
      urls: this.data.good.images
    });
  },

  toggleFavorite() {
    this.setData({ isFavorited: !this.data.isFavorited });
    wx.showToast({
      title: this.data.isFavorited ? '已收藏' : '已取消收藏',
      icon: 'none'
    });
  },

  onContactSeller() {
    if (!this.data.good || !this.data.good._openid) return;
    wx.navigateTo({ 
      url: `/pages/messages/subpages/chat-detail/index?id=${this.data.good._openid}` 
    });
  },
  
  onViewSeller() {
    if (!this.data.good || !this.data.good._openid) return;
    wx.navigateTo({
      url: `/pages/user-home/index?id=${this.data.good._openid}`
    });
  },
  
  onBuyNow() {
    wx.showToast({ title: '开发中...', icon: 'none' });
  }
})
