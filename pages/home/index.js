// pages/home/index.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    goodsList: [],
    leftList: [], // 瀑布流左侧
    rightList: [], // 瀑布流右侧
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
  },

  onLoad: function() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });
    this.getGoodsList();
  },

  onPullDownRefresh: function() {
    this.setData({
      page: 1,
      goodsList: [],
      leftList: [],
      rightList: [],
      hasMore: true
    }, () => {
      this.getGoodsList().then(() => {
        wx.stopPullDownRefresh();
      });
    });
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.setData({
        page: this.data.page + 1
      }, () => {
        this.getGoodsList();
      });
    }
  },

  async getGoodsList() {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('goods')
        .where({ status: 'active' }) // 仅获取在售
        .orderBy('createTime', 'desc')
        .skip((this.data.page - 1) * this.data.pageSize)
        .limit(this.data.pageSize)
        .get();

      const newGoods = res.data;
      
      // 瀑布流左右分发
      const left = this.data.leftList;
      const right = this.data.rightList;
      
      newGoods.forEach((item, index) => {
        // 简单模拟用户信息，实际应从 users 表查
        item.sellerAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwBHdR3X0x5yWc8X6w3y3y3y3y3y3y3y3y3y3y3y3y3/0'; 
        item.sellerName = '社区邻居';
        item.timeAgo = this.formatTime(item.createTime);
        
        // 简单的左右平衡算法：哪边短放哪边，或者直接奇偶
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
      wx.showToast({ title: '加载失败', icon: 'none' });
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
