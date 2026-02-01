// pages/user-home/index.js
const db = wx.cloud.database();

Page({
  data: {
    userId: '',
    userInfo: null,
    goodsList: [],
    isLoading: true,
    isFollowing: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ userId: options.id });
      this.fetchData(options.id);
      this.checkFollowStatus(options.id);
    }
  },

  checkFollowStatus(targetId) {
    // 检查关注状态
    // 需要先确保已登录 (简单起见，这里假设 app.js 会自动静默登录或已登录)
    // 实际应引用 app.globalData.openid
    const app = getApp();
    const myOpenId = app.globalData.openid;
    if (!myOpenId) return;

    db.collection('follows').where({
      _openid: myOpenId, // 我关注
      followedId: targetId // 他
    }).count().then(res => {
      this.setData({ isFollowing: res.total > 0 });
    });
  },

  onToggleFollow() {
    const app = getApp();
    if (!app.globalData.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    if (this.data.isFollowing) {
      // 取消关注
      db.collection('follows').where({
        _openid: app.globalData.openid,
        followedId: this.data.userId
      }).remove().then(() => {
        this.setData({ isFollowing: false });
        wx.showToast({ title: '已取消关注', icon: 'none' });
      });
    } else {
      // 关注
      db.collection('follows').add({
        data: {
          followedId: this.data.userId,
          createTime: db.serverDate()
        }
      }).then(() => {
        this.setData({ isFollowing: true });
        wx.showToast({ title: '已关注' });
      });
    }
  },

  async fetchData(userId) {
    this.setData({ isLoading: true });
    try {
      // 1. 获取用户信息
      let userInfo = null;
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'get_user_info',
          data: { openid: userId }
        });
        if (result.success) {
          userInfo = result.data;
        }
      } catch (e) {
        console.error('获取用户信息失败', e);
      }

      if (!userInfo) {
         userInfo = {
            nickName: '社区用户',
            avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwBHdR3X0x5yWc8X6w3y3y3y3y3y3y3y3y3y3y3y3y3/0',
            bio: '这个人很懒，什么都没写'
         };
      }

      // 2. 获取该用户的在售商品
      // goods 集合通常权限是可读的，如果不行也需要云函数，但通常“所有用户可读”是商品表的标配
      const goodsRes = await db.collection('goods').where({
        _openid: userId,
        status: 'active'
      }).orderBy('createTime', 'desc').get();

      this.setData({
        userInfo,
        goodsList: goodsRes.data,
        isLoading: false
      });

    } catch (err) {
      console.error(err);
      this.setData({ isLoading: false });
    }
  },
  
  onContact() {
      wx.navigateTo({
          url: `/pages/messages/subpages/chat-detail/index?id=${this.data.userId}`
      })
  }
})
